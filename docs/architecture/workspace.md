# Espacio de trabajo (`/workspace`)

Frontend: `apps/front/src/pages/workspace/` (la página, con sus tres pestañas),
`apps/front/src/entities/workspace-member/` y
`apps/front/src/entities/integration/` (los dos slices de datos). El backend
de los miembros del espacio es el contexto `auth`
(`apps/back/src/contexts/auth/`, ver `docs/architecture/auth.md`);
integraciones sigue sin contrapartida en `apps/back` y sigue siendo
maquetación de frontend, ver más abajo.

## `workspace-member` ya habla con el backend real; `integration` sigue siendo maqueta

Los dos slices nacieron con el mismo patrón —tipos como contrato futuro,
`api/*.api.ts` resolviendo contra un store en memoria— pero ya no están al
mismo punto. `entities/workspace-member` dejó de ser maqueta: sus fixtures
(`workspaceMembers.fixtures.ts`) se borraron, y `api/workspaceMembers.api.ts`
llama al backend real (`GET/POST /workspace/members`,
`PATCH`/`DELETE /workspace/members/:id`, `GET /auth/me`) a través de
`shared/api/httpClient.ts`. `entities/integration` sigue exactamente como
antes: no hay contexto `integrations` en `apps/back`, ni migración, ni
endpoint, y `api/integrations.api.ts` sigue resolviendo contra
`integrations.fixtures.ts` envuelto en `fakeLatency`
(`shared/lib/fakeLatency.ts`, `setTimeout` + `Promise`, 320 ms por defecto).

La promesa que hizo posible la migración de `workspace-member` sin tocar un
componente sigue demostrada: el `WorkspaceMemberDto`/`PermissionMatrixDto`
que ya consumía la UI simulada es exactamente la forma que devuelve la API
real, así que conectar fue cambiar el cuerpo de las funciones de `api/`, no
reescribir páginas. `integration` está a la espera de la misma migración el
día que exista un contexto `integrations` en el backend: cuando llegue, los
ficheros que cambian son `entities/integration/api/*.api.ts`, y se borran
`integrations.fixtures.ts` y, si para entonces nada más lo usa,
`shared/lib/fakeLatency.ts`.

Las fixtures de integraciones son **mutables a nivel de módulo**
(`let integrations: IntegrationDto[]` en `integrations.fixtures.ts`) a
propósito: sin mutabilidad, conectar una integración no se reflejaría al
releer la lista tras invalidar la query, y la maqueta dejaría de ser creíble.
El coste aceptado es que el estado se pierde al recargar la página.

## Autenticación real: el "usuario actual" ya es la sesión, no un fixture

Ya existe un contexto `auth` completo en `apps/back` (login por Google,
sesión propia, guard global deny-by-default) — el porqué de cada pieza está
en `docs/architecture/auth.md`. `LoginPage`
(`pages/login/ui/page/LoginPage.tsx`) ya no es una bienvenida sin
credenciales: resuelto por `useLoginPage`
(`pages/login/model/useLoginPage.ts`) contra `GET /api/auth/status`, muestra
un formulario de alta del primer administrador si la instancia está recién
desplegada, o un botón "Continuar con Google" en cualquier otro caso. La
redirección a `/onboarding` o `/dashboard` tras iniciar sesión la sigue
gobernando `companyNeedsSetup(company)` (ver `docs/architecture/tenancy.md`),
pero ahora es la **segunda** puerta: la primera es tener sesión.

El slice se sigue llamando **`workspace-member`**, no `user`, para no
confundirse con `staff-member` (trabajadores de la empresa, RRHH — un
concepto de negocio distinto). El "usuario actual" de toda la página ya no es
un fixture fijo: `getCurrentWorkspaceMember()`
(`entities/workspace-member/api/workspaceMembers.api.ts`) pide
`GET /api/auth/me`, que el backend resuelve contra el miembro de la sesión
activa. `useMembersPanel` sigue usando ese resultado para marcar "Tú" en la
tabla y para las guardas de abajo, exactamente como antes de conectar el
backend — es la misma promesa que ya documentaba `useCompany()` en
`docs/architecture/data-layer.md`, ahora cumplida.
`SessionGuard` (`widgets/app-layout/ui/layout/SessionGuard.tsx`) es quien
consulta `workspaceMemberQueries.current()` al entrar en cualquier pantalla
protegida y redirige a `/` si la respuesta es `401`.

## El modelo de permisos: matriz de módulo × nivel, con los roles como preajustes

El dato real es una matriz — `PermissionMatrixDto`, un `Record<WorkspaceModuleDto,
PermissionLevelDto>` con los ocho módulos del producto (`dashboard`,
`projects`, `calendar`, `documents`, `suppliers`, `invoices`, `products`,
`staff`) y tres niveles (`none` / `view` / `edit`). `admin`, `editor` y
`viewer` no son datos independientes: son **preajustes** sobre esa matriz
(`ROLE_PRESETS` en `entities/workspace-member/model/permissions.ts`) que
rellenan las ocho celdas de una vez.

El rol que se guarda en `WorkspaceMemberDto.role` **se deriva de la matriz**,
no al revés: `resolveRole(matrix)` recorre los tres preajustes y devuelve el
primero cuyas ocho celdas coincidan exactamente, o `'custom'` si ninguno
coincide. `MemberDrawer` no mantiene un estado de rol aparte del de la matriz
— llama a `resolveRole(matrix)` en cada render. Guardar el rol al lado de la
matriz habría abierto la puerta a que se desincronizaran (un rol "Editor" con
una matriz que ya no es la de editor, tras una edición manual). Derivarlo hace
que las dos cosas sean, literalmente, la misma información leída de dos
formas: tocar una celda hace que el rol mostrado caiga a "Personalizado"
(`workspace.roles.custom`, sin preajuste asignable en el `Radio.Group`, ver
`ui/memberDrawer/MemberDrawer.tsx`), y si el usuario deshace el cambio y la
matriz vuelve a coincidir con "Editor", el nombre del rol reaparece solo, sin
ningún código de "deshacer" explícito.

`dashboard` no admite el nivel `edit`: `moduleSupportsEdit(module)` devuelve
`false` solo para ese módulo (`model/permissions.ts`), porque no hay nada
editable en el panel de control — ofrecer "Editar" ahí sería prometer una
acción que no existe. `PermissionMatrix` (`pages/workspace/ui/permissionMatrix/PermissionMatrix.tsx`)
deshabilita esa opción del `Segmented` con un tooltip
(`workspace.permissions.editUnsupported`) en vez de ocultarla, y "Aplicar a
todos los módulos" (`fillMatrix`) respeta la misma regla al propagar `edit`.

## Guardas: nadie edita su propio acceso, el espacio conserva al menos un admin

`useMembersPanel` (`pages/workspace/model/useMembersPanel.ts`) expone las
guardas como funciones puras para que la UI solo consulte, nunca decida:

- `isSelf(member)` — `member.id === current?.id`.
- `canEditAccess(member)` — `!isSelf(member)`: nadie edita su propio acceso,
  ni siquiera un admin. Evita que alguien se quite permisos sin querer y se
  quede fuera de su propio espacio.
- `canRevoke(member)` / `revokeBlockReason(member)` — además de `isSelf`,
  bloquea expulsar al último admin (`member.role === 'admin' && adminCount <=
  1`). Sin esta guarda, el espacio podría quedarse sin nadie con acceso total.

`MembersTab` traduce el motivo del bloqueo (`'self' | 'lastAdmin' | null`) a
las claves `workspace.members.guard.self` / `.lastAdmin` en el `Tooltip` de la
acción deshabilitada, para que quien lo intenta entienda por qué, no solo que
está apagada.

## La modal de empresa se ha fusionado en la pestaña Empresa

`features/company-settings/` (la modal `CompanySettingsModal`) **se ha
borrado**: su contenido de formulario vive ahora en `pages/workspace/ui/companyTab/CompanyTab.tsx`,
con la lógica en `pages/workspace/model/useCompanyProfileForm.ts`. Antes se
abría desde dos sitios (`AppSider`, `InvoicesPage`) con su propio estado de
apertura en cada uno; ahora ambos navegan a `/workspace?tab=company`, así que
hay un único sitio donde editar los datos de la empresa.

Las claves de i18n `company.settings.*` **se conservan sin renombrar**:
`pages/onboarding/ui/OnboardingPage.tsx` reutiliza 27 de ellas (campos,
placeholders y mensajes de validación del formulario de empresa, que duplica
esos mismos campos inline en su asistente de tres pasos). Borrarlas o
moverlas a `workspace.*` habría roto el onboarding sin ninguna ganancia; las
claves nuevas de la pestaña Empresa (p. ej. `workspace.company.identity`,
`workspace.company.unsaved`) conviven con las antiguas en el mismo formulario.

## El logotipo del sider es el punto de entrada

El `<img>` estático que antes había en `AppSider.tsx` es ahora un `Button
type="text"` con `aria-label` y `Tooltip` (`sider.workspace`) que navega a
`/workspace?tab=company` (`widgets/app-layout/ui/sider/AppSider.tsx`). El menú
de ajustes del pie del sider (`widgets/app-layout/model/useSettingsMenuItems.tsx`)
enlaza directamente a las tres pestañas (`/workspace?tab=company|members|integrations`)
en vez de abrir una modal; el ítem `profile`, que solo mostraba
`common.comingSoon`, ha desaparecido — esta página es exactamente lo que ese
ítem prometía. La clave `common.comingSoon` sigue en los JSON: es genérica del
kit y no depende de esta feature.

## Integraciones: maqueta completa, cero implementación real

`entities/integration/model/integrationCatalog.ts` separa dos cosas que
cambian por motivos distintos: la **forma** de cada integración (familia,
tipo de auth, qué campos tiene y de qué tipo) vive en `INTEGRATION_CATALOG`,
estático de frontend y sin llamada a ningún sitio; el **estado** (conectado,
última sincronización, valores de los ajustes) sale de la API simulada,
`entities/integration/api/integrations.fixtures.ts`. Añadir una integración
nueva es añadir una entrada al catálogo y dos claves de i18n
(`workspace.integrations.catalog.<key>.name|description`), no un componente:
`IntegrationDrawer` genera el formulario de ajustes a partir de
`catalogEntry(key).fields` (`select` / `text` / `secret` / `toggle` / `copy`),
nunca a mano por integración.

Las 15 integraciones maquetadas se agrupan en cuatro familias
(`IntegrationFamilyDto`): `google` (Calendar, Drive, Gmail, Sheets, Contacts),
`microsoft` (Outlook Calendar, OneDrive, Excel), `communication` (Slack,
Telegram, Discord) y `open` (webhooks salientes, calendario ICS/CalDAV,
SMTP/IMAP, claves de API).

Identidad visual: solo iconos de `@ant-design/icons`
(`pages/workspace/model/useIntegrationsPanel.tsx`, `INTEGRATION_ICONS`),
**nunca logotipos de marca ni imágenes remotas**. La razón no es solo de
licencias: evita que la página dependa de la red para pintar algo tan básico
como una tarjeta de integración, y evita meter SVG de terceros en el repo con
su propio lío de licencias.

Ninguna integración está conectada de verdad a ningún proveedor: `connect`,
`disconnect`, `testIntegration`, etc. (`entities/integration/api/integrations.api.ts`)
mutan el store en memoria exactamente igual que el resto de la maqueta. Es
pura interacción visual — clic, estado, toast — sin ningún OAuth, webhook ni
llamada de red real por detrás.

## Integraciones descartadas por no ser gratuitas

Verificado en julio de 2026, antes de decidir el catálogo de 15 integraciones
de arriba. Estas se dejaron fuera precisamente porque no tienen capa gratuita
utilizable para lo que haría Ledgerly con ellas:

| Servicio | Por qué se descarta | Coste aproximado |
|---|---|---|
| **WhatsApp Business Cloud API** | Meta cobra por mensaje de plantilla entregado desde julio de 2025; los avisos de Ledgerly son mensajes iniciados por el negocio, así que no caen en la ventana de servicio gratuita | Utilidad ~0,004 $/msj en EE. UU.; marketing 0,13-0,14 $/msj en España/Francia. Vía Twilio, +0,005-0,010 $/msj |
| **Twilio SMS** | Facturación por mensaje más alquiler de número; no existe capa gratuita permanente | 0,0083 $/SMS en EE. UU. + 1,15 $/mes por número local + recargos A2P |
| **SendGrid (correo transaccional)** | Twilio retiró el plan gratuito permanente el 27 de mayo de 2025; hoy solo hay prueba de 60 días | Desde 19,95 $/mes |
| **DocuSign eSignature** | La cuenta de desarrollador es sandbox y no emite sobres con validez legal; producción exige plan de pago | Desde 50-75 $/mes (Starter ~600 $/año) |
| **Xero** | Desde el 2 de marzo de 2026 el acceso a la API es de pago por tramos según organizaciones conectadas y datos descargados; el tramo gratuito es solo para pruebas | ~2,40 AUD por GB de egreso + tramos Core/Plus/Advanced |
| **QuickBooks Online** | La API no cobra por llamada, pero exige suscripción activa de QuickBooks en la empresa cuyos datos se leen, y el App Partner Program tiene tramos | 0-4.500 $/mes según tramo, más la suscripción de QBO |
| **Holded** (ERP español) | La API no está disponible en el plan gratuito | Desde 7,5 €/mes (Plus) |
| **Microsoft Teams (Graph con medición)** | Aunque Microsoft dejó de cobrar varias en agosto de 2025, siguen medidas las notificaciones de cambio de chat/canal y los PATCH de mensajes, justo lo que haría falta para avisos en Teams | Por llamada; p. ej. `assignSensitivityLabel` a 0,00185 $/llamada |
| **Zapier / Make** como puente genérico | Capa gratuita tan corta que en la práctica obliga a pagar en cuanto hay volumen real | Zapier: 100 tareas/mes gratis; Make: 1.000 operaciones/mes |

Caveats sobre las que sí se maquetaron, para no llevarse sustos si algún día
se implementan de verdad:

- **Google (Gmail, Drive)**: la API es gratuita, pero son *restricted
  scopes*. Una app distribuida públicamente necesita superar la evaluación
  CASA de un laboratorio autorizado y revalidarla cada 12 meses: entre 500 $ y
  4.500 $ al año según el tramo. En un despliegue autoalojado, donde cada
  instalación usa su propio proyecto de Google Cloud en modo interno/testing,
  no aplica — que es el escenario de Ledgerly.
- **Google Calendar y Gmail**: Google ha anunciado que superar las cuotas
  empezará a facturarse "más adelante en 2026" (umbral de 80 M de unidades de
  cuota diarias en Gmail), con 90 días de aviso. Muy por encima de cualquier
  uso previsible aquí.
- **Slack**: el plan gratuito limita el *workspace* a 10 apps instaladas y a
  un mensaje por segundo y canal. Suficiente, pero conviene saberlo.

Fuentes: [Metered APIs in Microsoft Graph](https://learn.microsoft.com/en-us/graph/metered-api-list),
[Slack rate limits](https://docs.slack.dev/apis/web-api/rate-limits/),
[Google Calendar API quotas](https://developers.google.com/workspace/calendar/api/guides/quota),
[Google restricted scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification),
[Changes to SendGrid's Free Plan](https://www.twilio.com/en-us/changelog/sendgrid-free-plan),
[Xero API pricing 2026](https://truto.one/blog/xero-api-pricing-changes-2026-costs-tiers-and-how-to-minimize-egress/),
[QuickBooks API cost](https://truto.one/blog/how-much-does-the-quickbooks-api-cost-2026-pricing-rate-limits/),
[Holded API](https://help.holded.com/en/articles/6896051-how-to-build-and-use-the-holded-api),
[WhatsApp Business API pricing 2026](https://www.uptail.ai/blog/whatsapp-business-api-pricing-2026-what-it-costs-and-how-billing-works),
[Twilio pricing 2026](https://automationatlas.io/answers/twilio-pricing-explained-2026/),
[DocuSign API pricing](https://www.esign.ai/blog/docusign-api-go-live-price),
[Telegram Bot API pricing](https://aziqdev.com/blog/telegram-bot-api-pricing).

## Ver también

- `docs/plans/pagina-de-perfil.md` — plan original de la feature, con el
  inventario completo de componentes y las unidades de trabajo.
- `docs/architecture/data-layer.md` — factorías de queries, invalidaciones y
  la Regla M (mutaciones sin `useMutation`), que también aplican a esta
  página.
- `docs/architecture/tenancy.md` — `companyNeedsSetup` y el singleton de
  empresa que consume `CompanyTab`.
- `docs/architecture/auth.md` — el contexto `auth`, el guard global y por qué
  cada pieza de sesión y permisos es como es.
