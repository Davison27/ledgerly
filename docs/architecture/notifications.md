# Notificaciones persistidas

Contexto: `apps/back/src/contexts/notifications/`. Frontend:
`apps/front/src/entities/notification/` (datos) y
`apps/front/src/widgets/app-layout/ui/notification*` (campana y desplegable
del `TopBar`).

## Por qué se persisten en vez de calcularse al leer

El backend corre permanentemente en la nube y los avisos —una factura que
vence, un conflicto de agenda, una extracción fallida— ocurren mientras nadie
mira la app. Si se calcularan al vuelo en cada petición (como hace
`deriveEffectiveStatus`, ver `docs/architecture/documents.md`), un aviso solo
existiría en el instante en que alguien tuviera la pantalla abierta, y
desaparecería sin dejar rastro si no había nadie mirando cuando ocurrió. Un
aviso necesita **sobrevivir** entre visitas y entre reinicios del backend
(`docker compose down && up`) para que la campana del `TopBar` tenga algo que
mostrar: por eso `notifications` es el único contexto de este repo que
materializa como filas algo que en principio podría derivarse de otras
tablas.

## Catálogo de avisos y `dedupe_key`

Nueve tipos (`domain/notification-type.ts`), cada uno con su regla de
derivación pura en `domain/*-notification-rules.ts` y sus umbrales
centralizados en `domain/notification-thresholds.ts`
(`DOCUMENT_DUE_SOON_DAYS`, `STAFF_DOCUMENT_EXPIRING_DAYS`,
`SCHEDULE_UPCOMING_DAYS`, `SCHEDULE_CONFLICT_WINDOW_DAYS`,
`READ_RETENTION_DAYS`).

Cada aviso lleva una `dedupe_key` construida con `buildDedupeKey`
(`domain/dedupe-key.ts`): `<type>:<partes>`, siempre empezando por el propio
`type` para que la clave sea autoexplicativa y no colisione entre tipos
distintos. Es **un aviso por transición de estado, una sola vez**: si un
documento lleva 30 días vencido, la clave `document_overdue:<documentId>` ya
existe desde el primer día y las 29 pasadas siguientes no generan nada nuevo.
Los avisos por ocurrencia (`schedule_event_upcoming`) incluyen la fecha en la
clave porque cada día es una transición distinta.

## Hallazgo de alcance: por qué los vencimientos salen de `documents` y no de `invoices`

`Invoice` (`contexts/invoices/domain/invoice.ts`) modela la emisión de
facturas propias: no tiene `dueDate` ni ningún estado de cobro, así que no hay
nada que escanear ahí. `Document` (`contexts/documents/domain/document.ts`)
sí tiene `due_date` y `status: 'pagado' | 'pendiente' | 'vencido'`, con
`deriveEffectiveStatus()` ya calculando cuándo algo está vencido (ver
`docs/architecture/documents.md`). `document_overdue` y `document_due_soon`
reutilizan exactamente esa condición: `status = 'pendiente'` y `due_date` en
el pasado o dentro de la ventana, la misma lectura que
`EFFECTIVE_STATUS_FILTER_SQL` ya hacía para otros listados.

## Los dos caminos de escritura, y por qué no se solapan

- **Escaneo diario** (`application/scan-for-notifications/`): avisos que
  nacen del **paso del tiempo** — una factura que vence, un documento laboral
  que caduca, un evento que se acerca. Nada dispara estos avisos salvo que el
  reloj avance; ninguna acción de un contexto emisor puede producirlos por sí
  sola.
- **Eventos de dominio** (`infrastructure/events/notification-event-subscriber.ts`
  + `application/notify-*`): avisos que nacen de una **acción concreta** —
  crear un documento potencialmente duplicado, fallar la extracción de un
  PDF, guardar un evento de agenda que choca con otro. El reloj nunca los
  produciría: no son un estado que se pueda leer con una consulta diaria, son
  la consecuencia de algo que acaba de pasar.

Ambos caminos convergen en el mismo `insertIfAbsent` (`domain/notification.repository.ts`),
así que comparten la garantía de idempotencia sin necesidad de coordinarse
entre ellos.

## Fiabilidad: `dedupe_key` con índice UNIQUE, no una cola ni un outbox

La pieza que hace fiable todo el sistema es la restricción
`UQ_notifications_dedupe_key` de la migración
(`database/migrations/1742000000000-CreateNotifications.ts`) combinada con
`INSERT ... ON CONFLICT DO NOTHING` en
`TypeOrmNotificationRepository.insertIfAbsent`
(`infrastructure/persistence/typeorm-notification.repository.ts`, vía
`.orIgnore()`). No hay cola de mensajes ni tabla de outbox: **la propia tabla
de destino es la que impide el duplicado**. Repetir el escaneo tras un
reinicio del backend, o correrlo en dos réplicas a la vez, no duplica nada —
la segunda inserción del mismo `dedupe_key` simplemente no inserta, y
`insertIfAbsent` devuelve solo lo que de verdad se creó (con eso se alimentan
el contador de la campana y el hueco de email). Una cola o un outbox
resolverían un problema distinto —garantizar que un evento se procesa
exactamente una vez— que aquí no existe: lo que hay que garantizar es que
procesar el *mismo hecho* dos veces no deje dos filas, y eso lo resuelve un
índice único sin infraestructura adicional.

## El escaneo es sobre estado, no sobre delta

`ScanForNotificationsUseCase.execute()` (`application/scan-for-notifications/`)
pregunta **"qué está vencido/caduca/choca ahora"**, nunca "qué cambió desde la
última pasada". No hay tabla de checkpoints ni de última ejecución. La
consecuencia directa: si el proceso no corre un día (el backend estuvo caído,
un despliegue se retrasó), no hace falta ningún catch-up — la pasada
siguiente ve exactamente el mismo estado vencido que habría visto el día
anterior, más lo nuevo, y lo inserta todo de una vez porque las claves de lo
ya visto siguen sin existir salvo que ya se hubieran creado antes. Una ventana
de escaneo perdida se autocura sola al día siguiente, sin ningún trabajo de
recuperación.

## Por qué una pasada al día y no cada N minutos

Todas las condiciones del catálogo tienen granularidad de **día**
(`due_date`, `expiry_date`, fechas de evento de agenda son todas `date`, no
`timestamp`). Escanear cada hora no cambiaría el resultado de ninguna regla:
un documento que vence hoy sigue venciendo hoy, lo mires a las 07:00 o a las
14:00. Más resolución no aporta información nueva y sí multiplica el coste
desplegado (consultas contra `documents`, `staff_documents` y el tablero
completo de agenda). `DailyNotificationScanScheduler`
(`infrastructure/scheduling/daily-notification-scan.scheduler.ts`) programa
un único `setTimeout` a las 07:00 hora local, se reprograma a sí mismo al
terminar y no usa `@nestjs/schedule`: para un solo tic diario, ~25 líneas de
aritmética de fechas son más simples que añadir esa dependencia y montar
`ScheduleModule.forRoot()` (que además colisiona de nombre con el
`ScheduleModule` del contexto de agenda).

Requisito de despliegue, no de código: la variable de entorno `TZ` debe valer
`Europe/Madrid`. Con `TZ=UTC` el escaneo correría a las 09:00 hora de Madrid
en horario de verano, más tarde de lo pensado.

## Bus de eventos propio, y por qué no `@nestjs/cqrs` ni `@nestjs/event-emitter`

`shared/domain/domain-event-publisher.port.ts` define el puerto
(`DomainEventPublisher`/`DomainEventSubscriber`), con el adaptador
`InProcessDomainEventPublisher`
(`shared/infrastructure/in-process-domain-event-publisher.ts`) cableado en
`shared/shared.module.ts` (que es `@Global()`, así que el token
`DOMAIN_EVENT_PUBLISHER` está disponible en cualquier contexto sin importar
nada). Se descartaron las librerías de Nest por dos motivos:

- **Cero dependencias nuevas**, la misma regla que ya siguió el resto del
  repo (ver `docs/architecture/data-layer.md` para el mismo criterio aplicado
  a TanStack Query).
- **Romper el ciclo de dependencias entre `documents`/`schedule` y
  `notifications`**. `notifications` necesita reaccionar a lo que pasa en
  `documents` y `schedule`, pero ninguno de esos dos contextos puede depender
  de `notifications` (`documents` no sabe que existen avisos). Un bus
  publicado como puerto en `shared` es lo que permite que `documents` y
  `schedule` publiquen eventos sin conocer a quién llegan:
  `NotificationEventSubscriber`
  (`infrastructure/events/notification-event-subscriber.ts`) es el único
  sitio de todo el repo donde `notifications` importa clases de `documents`,
  y es infraestructura, no dominio. Si algún día `documents` importara
  `NotificationsModule`, ahí aparecería el ciclo — el bus existe precisamente
  para que no haga falta.

La publicación se **espera** (`await publisher.publish(events)`), no es
fire-and-forget: los handlers son una o dos consultas, así que esperar los
mantiene deterministas y testeables. Cada handler corre en su propio
`try/catch` dentro de `InProcessDomainEventPublisher.publish` y un fallo se
registra con `Logger.error` y no interrumpe a los demás suscriptores — un
aviso que falla no puede tumbar la operación de negocio que lo originó (crear
un documento, guardar un evento de agenda), pero el fallo tiene que quedar
visible en el log del despliegue, nunca tragado en silencio.

## CQRS ya se practicaba; no se introdujo un bus de comandos/queries

El repo ya seguía CQRS a su manera antes de esta feature: comandos y queries
segregados por tipo de fichero (`*.command.ts`, `*.query.ts`), casos de uso
de escritura separados de los de lectura, y read models planos para listar
(`NotificationListRow` aquí, el mismo patrón que ya usaban otros contextos
para sus listados). `notifications` continúa esa convención
(`application/list-notifications/`, `application/mark-notification-read/`,
etc.) sin añadir un bus de comandos ni de queries de una librería externa:
un caso de uso ya es la unidad de comando/query del repo, invocado
directamente por su controlador o por el scheduler. Un bus de comandos
resolvería un problema de indirección (desacoplar quién invoca de qué se
invoca) que aquí no existe — los llamantes son un puñado de controladores y
un `setTimeout`, no un sistema de plugins.

## Email: preparado, no implementado

`domain/notification-delivery.port.ts` define `NotificationDelivery` con un
único método, `deliver(notifications)`, invocado tras cada `insertIfAbsent`
en `ScanForNotificationsUseCase` y en los tres `notify-*` de eventos. El
adaptador cableado hoy es `NoopNotificationDelivery`
(`infrastructure/delivery/noop-notification-delivery.ts`), que no hace nada.
La columna `email_sent_at` (nullable, migración
`1742000000000-CreateNotifications.ts`) existe desde ya para que un futuro
adaptador real pueda barrer `WHERE email_sent_at IS NULL` de forma idempotente
— reintentar tras un fallo de envío no reenvía lo ya enviado — sin tocar el
esquema ni el resto del flujo. Sustituir el envío real es cambiar el
`useClass` en `notifications.module.ts`; nada más depende de que sea noop.

## Retención

La misma pasada diaria que crea avisos borra los leídos con más de
`READ_RETENTION_DAYS` (90) días, vía `PurgeReadNotificationsUseCase`
(`application/purge-read-notifications/`) y
`deleteReadBefore()` (`WHERE read_at IS NOT NULL AND read_at < :threshold`).
Solo se purgan avisos **leídos**: uno sin leer nunca desaparece solo, por
viejo que sea — desaparecer un aviso pendiente sin que nadie lo haya visto
sería perder información, no limpiarla.

## Sin claves ajenas al recurso

`resource_id` (`notifications` table) apunta indistintamente a un documento,
un trabajador o un evento de agenda según `resource_kind`, así que una FK
polimórfica no existe en Postgres. Si el recurso referenciado se borra, el
aviso queda huérfano y el clic llevaría a un recurso inexistente. Se acepta:
el borrado en cascada es imposible sin FK, y un aviso histórico que menciona
algo ya borrado sigue siendo información legítima sobre lo que pasó.

## Consumo

Una pasada diaria (unas seis consultas, dos de ellas el tablero completo de
agenda vía `GetScheduleBoardUseCase`) más un `GET /notifications/unread-count`
indexado (`countUnread()`, `WHERE read_at IS NULL`) cada 5 minutos por pestaña
abierta del front. La lista paginada solo se pide al abrir el desplegable de
la campana.
