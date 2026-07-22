---
name: arquitectura-hexagonal
description: Doctrina de arquitectura limpia/hexagonal y DDD para el backend NestJS de Ledgerly. Úsala al planificar o revisar cualquier trabajo en apps/back — contextos, capas, puertos, casos de uso, entidades, mappers, errores y módulos. Define dónde va cada fichero y qué está prohibido.
---

# Arquitectura hexagonal en NestJS — doctrina de Ledgerly

Referencia canónica para planificar y revisar `apps/back`. Si un plan contradice
esto, el plan está mal.

## La única regla que importa

**Las dependencias apuntan hacia dentro.** `domain` no importa nada de
`application` ni de `infrastructure`, ni de NestJS, ni de TypeORM, ni de Express.
`application` importa `domain`. `infrastructure` importa ambos.

Prueba de humo: si borras `infrastructure/` entero, `domain/` debe seguir
compilando. Si no compila, hay una violación.

De esa regla se derivan mecánicamente casi todas las decisiones de abajo. Cuando
dudes, vuelve aquí en vez de improvisar.

---

## Organización: por contexto primero, por capa después

```
apps/back/src/
├── contexts/
│   └── <contexto>/                 # company, documents, projects, staff, invoices…
│       ├── domain/
│       │   ├── <agregado>.ts                    # entidad rica con invariantes
│       │   ├── <agregado>.repository.ts         # PUERTO + token Symbol
│       │   ├── <algo>.port.ts                   # otros puertos (contadores, checkers)
│       │   └── errors/<caso>.exception.ts       # excepciones de dominio
│       ├── application/
│       │   └── <verbo-agregado>/                # UNA carpeta por caso de uso
│       │       ├── <verbo-agregado>.use-case.ts
│       │       ├── <verbo-agregado>.command.ts  # entrada del caso de uso
│       │       └── <verbo-agregado>.use-case.spec.ts
│       ├── infrastructure/
│       │   ├── http/
│       │   │   ├── <recurso>.controller.ts
│       │   │   ├── dtos/<verbo>-<recurso>.dto.ts
│       │   │   └── <recurso>.response.ts
│       │   └── persistence/
│       │       ├── <agregado>.orm-entity.ts     # TypeORM vive AQUÍ, nunca en domain
│       │       ├── <agregado>.mapper.ts
│       │       └── typeorm-<agregado>.repository.ts
│       └── <contexto>.module.ts
├── shared/
│   ├── domain/                     # DomainException, puertos transversales (IdGenerator)
│   └── infrastructure/http/        # DomainExceptionFilter
└── database/
    ├── migrations/<timestamp>-<Nombre>.ts
    └── seeds/
```

**Por qué contexto primero y no `src/domain/`, `src/application/`,
`src/infrastructure/` en la raíz:** con 8 contextos, la agrupación por capa
obliga a tocar tres árboles distantes para un cambio de una sola feature, y
`domain/` acaba siendo un cajón de ocho subcarpetas sin relación entre sí. La
agrupación por contexto hace que la estructura *grite* de qué va el sistema
(screaming architecture) y mantiene junto lo que cambia junto. Es lo que manda
`CLAUDE.md` ("arquitectura hexagonal **por contextos**").

Un contexto **no importa** de otro contexto. Si necesita algo de fuera, se
declara un **puerto propio** en su `domain/` y se implementa en su
`infrastructure/` consultando lo que haga falta. Ejemplo real:
`documents/domain/staff-member-existence-checker.port.ts` — el contexto de
documentos comprueba que existe un trabajador sin acoplarse al contexto `staff`.

---

## Capa domain

### Entidades ricas, nunca anémicas

Una entidad **no** es una bolsa de campos públicos. Encapsula estado y **protege
sus invariantes**: si un objeto existe, es válido. No se puede construir uno
inválido.

```ts
export class Document {
  private constructor(private readonly props: DocumentProps) {}

  static create(props: DocumentProps): Document {
    if (props.type === 'nomina' && props.staffMemberId === null) {
      throw new InvalidValueException('Una nómina debe tener un trabajador');
    }
    return new Document(props);
  }

  withChanges(changes: Partial<DocumentProps>): Document {
    return Document.create({ ...this.props, ...changes }); // revalida siempre
  }
}
```

Claves: constructor privado + factoría `create()` que valida; `withChanges()`
reejecuta `create()` para que una modificación no pueda esquivar el invariante;
getters en vez de campos públicos mutables.

Mejor que un getter por campo, **métodos que expresan la intención**: en vez de
`doc.getStatus() === 'vencido'` repartido por seis sitios, `doc.isOverdue()`. El
getter expone el estado; el método expone la regla, y la regla vive en un único
lugar. No es dogma — un getter para pintar un campo está bien; el criterio es que
ninguna **decisión** de negocio se tome fuera del agregado leyendo sus tripas.

**Dónde vive una regla de negocio:** si depende solo del estado de un agregado,
va en la entidad. Si necesita coordinar varios agregados o consultar el exterior,
va en el caso de uso.

### Value objects: validar una vez, en el borde del dominio

Un value object envuelve un primitivo con su regla y **no puede existir
inválido**. Se compara por valor, no por identidad, y es inmutable.

```ts
export class DocumentAmount {
  private constructor(private readonly value: number) {}

  static fromNumber(value: number): DocumentAmount {
    if (!Number.isFinite(value) || value < 0) {
      throw new InvalidValueException('amount must be a positive number');
    }
    return new DocumentAmount(value);
  }

  toNumber(): number { return this.value; }
}
```

Lo que compra: la validación deja de repetirse en cada DTO, cada caso de uso y
cada test, y `function pay(amount: number, tax: number)` deja de poder invocarse
con los argumentos cambiados de orden.

**Cuándo NO usarlos** — esto importa tanto como lo anterior: un VO por cada
`string` de la aplicación es ceremonia que multiplica ficheros y mapeos sin
comprar nada. Se justifica cuando el primitivo tiene **regla propia** (importe,
NIF, email, moneda, porcentaje) o cuando se confunde con otro del mismo tipo en
una firma. Para un `notes: string | null` libre, un VO sobra.

Ledgerly hoy valida en la factoría del agregado, que para la mayoría de sus
campos es suficiente. Introducir VOs es una mejora **incremental y localizada**:
empieza por los que ya tienen regla repetida, no por un barrido completo.

### Eventos de dominio: cuando el efecto no es asunto del caso de uso

Un agregado registra lo que le ha pasado; el caso de uso lo publica tras
persistir; un suscriptor reacciona. Sirve para desacoplar efectos secundarios
(notificar, sincronizar, auditar) del caso de uso que los provoca.

```ts
// en el agregado
private events: DomainEvent[] = [];
pullEvents(): DomainEvent[] { const e = this.events; this.events = []; return e; }

// en el caso de uso, DESPUÉS de persistir
await this.repository.save(document);
this.eventBus.publish(document.pullEvents());
```

Reglas: se publica **después** de persistir (si no, se notifica algo que aún
puede fallar); el evento nombra un hecho consumado en pasado
(`DocumentUploaded`, no `UploadDocument`); y el agregado **no** ejecuta el
efecto, solo lo registra.

**Criterio para este repo:** Ledgerly no tiene event bus y hoy no lo necesita —
sus efectos secundarios son pocos y directos. Meter uno "porque DDD" añade una
capa de indirección asíncrona que dificulta seguir el flujo y depurar. El
disparador honesto para introducirlo es concreto: cuando aparezca el **aviso de
renovación de documentos laborales** (ya previsto en `staff`), o cuando un mismo
hecho tenga que provocar dos efectos en contextos distintos. Antes de eso, una
llamada directa es más legible y más fácil de desplegar.

### Puertos: interfaz + token de inyección

TypeScript borra las interfaces al compilar, así que Nest **no puede** inyectar
por interfaz. Sin un token, la inversión de dependencias no existe: acabas
inyectando la clase concreta y el puerto queda de adorno.

```ts
// domain/staff-member.repository.ts
export const STAFF_MEMBER_REPOSITORY = Symbol('StaffMemberRepository');

export interface StaffMemberRepository {
  findAll(): Promise<StaffMember[]>;
  findById(id: string): Promise<StaffMember | null>;
  save(staffMember: StaffMember): Promise<void>;
  delete(id: string): Promise<void>;
}
```

El puerto se nombra en lenguaje de dominio (`save`, `findById`), no de ORM
(nada de `createQueryBuilder` ni `findOne({where})` asomando en la firma).

### Errores de dominio

El dominio lanza excepciones **suyas**, sin saber qué es un código HTTP:

```ts
export class StaffMemberHasPayrollsException extends DomainException {
  readonly code = 'RESOURCE_IN_USE';
}
```

La traducción a HTTP es **una sola** y vive en infraestructura compartida
(`shared/infrastructure/http/domain-exception.filter.ts`), con su mapa
`STATUS_BY_CODE`. Añadir un caso nuevo = añadir un código al mapa, no repartir
`NotFoundException` de Nest por el dominio.

---

## Capa application

### Un caso de uso por operación

Una clase por operación, con un único método `execute()`. **No** una clase
`XUseCases` con los seis métodos CRUD dentro: eso reintroduce el God Service que
la arquitectura viene a evitar, hace que cada test arrastre dependencias que no
usa, y convierte el fichero en zona de conflictos entre agentes.

```ts
@Injectable()
export class CreateStaffMemberUseCase {
  constructor(
    @Inject(STAFF_MEMBER_REPOSITORY)
    private readonly staffMemberRepository: StaffMemberRepository,
    @Inject(ID_GENERATOR)
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: CreateStaffMemberCommand): Promise<StaffMember> {
    const staffMember = StaffMember.create({ id: this.idGenerator.generate(), ... });
    await this.staffMemberRepository.save(staffMember);
    return staffMember;
  }
}
```

Fíjate en que inyecta **el token**, tipado con **la interfaz**. Nunca la clase
`TypeOrmStaffMemberRepository`.

### Command ≠ DTO

- El **command** (`application/`) es la entrada del caso de uso: tipos planos,
  sin decoradores, sin `class-validator`, sin saber que existe HTTP.
- El **DTO** (`infrastructure/http/dtos/`) valida la petición HTTP con
  `class-validator`. Es un detalle del transporte.

El controlador traduce DTO → command. Así el caso de uso se puede invocar desde
un job, un CLI o una cola sin arrastrar decoradores de HTTP.

### Efectos no deterministas, por puerto

Ids, reloj, sistema de ficheros: nunca `uuid()` ni `new Date()` dentro del
dominio o del caso de uso. Van por puerto (`ID_GENERATOR`), que es lo que
permite testear sin mocks frágiles.

---

## Capa infrastructure

### El controlador es un adaptador de entrada

Va en `infrastructure/http/`, **no** en `application/`. Es un detalle del
transporte: si mañana la entrada es gRPC o una cola, el caso de uso no se entera.
Su trabajo es delgado: recibir el DTO, mapear a command, invocar `execute()`,
devolver una response.

**Las excepciones se lanzan, no se devuelven.** `return new NotFoundException()`
serializa el objeto de excepción con un **200 OK** en el cuerpo — es un fallo en
producción que ni el compilador ni los tests de tipo detectan. Lo correcto es
dejar que la excepción de dominio suba y que el filtro la traduzca.

### Entidad ORM ≠ entidad de dominio, y el mapper entre medias

La clase con `@Entity`/`@Column` es un **detalle de persistencia** y vive en
`infrastructure/persistence/`. Meterla en `domain/` acopla el núcleo al ORM y
rompe la regla de dependencias — el error más común y más caro de esta
arquitectura, porque a partir de ahí el esquema de tablas empieza a dictar el
modelo de negocio.

El `mapper` traduce en ambos sentidos (`toDomain`, `toOrm`) y es el único sitio
que conoce las dos formas.

### Blobs y datos sensibles

Columnas de contenido binario con `select: false`, para no arrastrar el fichero
en cada listado. Validación de tipo real por *magic bytes*, no por la extensión
ni por el `mimetype` que manda el cliente.

---

## Módulos de Nest

El módulo del contexto es donde se **cablea** el puerto con su implementación:

```ts
providers: [
  CreateStaffMemberUseCase,
  { provide: STAFF_MEMBER_REPOSITORY, useClass: TypeOrmStaffMemberRepository },
],
```

Trampa real ya vivida en este repo: un módulo que declara sus providers en local
(como `demo.module.ts`) y **no** importa el módulo del otro contexto necesita
registrar ahí también la entidad en `TypeOrmModule.forFeature([...])` y el
provider del puerto. Si no, Nest revienta **al arrancar**, no al compilar: `nest
build` pasa en verde y el fallo aparece en el despliegue. Verificar siempre con
un arranque real, no solo con el build.

---

## Providers: formas de registro y scopes

Las cuatro formas, y cuándo usar cada una:

| Forma | Para qué |
|---|---|
| `useClass` | El caso normal: cablear un puerto a su implementación |
| `useValue` | Constantes, objetos de configuración, dobles en tests |
| `useFactory` | La instancia depende de algo en runtime (env, otro provider); admite `inject: [...]` |
| `useExisting` | Alias de un provider ya registrado, **compartiendo instancia** |

`useExisting` no es `useClass` con otro nombre: `useClass` crea una instancia
nueva, `useExisting` reutiliza la que ya hay. Registrar el mismo repositorio dos
veces con `useClass` te deja con dos instancias y con dos estados si alguna vez
guardan algo.

**Alternativa a los tokens `Symbol`: la clase abstracta.** Una interfaz se borra
al compilar, pero una clase abstracta **existe en runtime**, así que puede ser
token por sí misma y ahorra el `@Inject()`:

```ts
export abstract class Clock {
  abstract now(): Date;
}
// providers: [{ provide: Clock, useClass: SystemClock }]
// constructor(private readonly clock: Clock) {}   // sin @Inject
```

Ambas son válidas. **En este repo se usa `Symbol` + `@Inject()` de forma
consistente** — no mezcles estilos dentro del mismo contexto solo por ahorrar un
decorador; la consistencia vale más aquí que la brevedad.

### Scopes: `DEFAULT` salvo prueba en contra

- `DEFAULT` — singleton. Es lo correcto para repositorios, casos de uso y
  adaptadores. Todo en Ledgerly debe ser esto.
- `REQUEST` — instancia nueva por petición. **Cuesta rendimiento y se contagia
  hacia arriba**: si un repositorio es `REQUEST`, el caso de uso que lo inyecta y
  el controlador que inyecta el caso de uso pasan a serlo también, y acabas
  reconstruyendo media aplicación en cada request.
- `TRANSIENT` — instancia dedicada por consumidor. No se contagia.

Regla práctica: si alguien propone `REQUEST` para "tener el usuario actual" o
"el tenant", casi siempre se resuelve mejor pasando ese dato **como argumento**
del command. El scope es la última opción, no la primera.

## Frontera HTTP y despliegue seguro

La arquitectura protege el dominio; esto protege el proceso. Va en `main.ts`,
que es el *composition root*.

- **`ValidationPipe` global con `whitelist: true` y `forbidNonWhitelisted: true`.**
  No es cosmético: sin `whitelist`, cualquier propiedad extra del cuerpo llega
  al command y de ahí al agregado — es la vía clásica de *mass assignment*, donde
  un cliente cuela un campo que el formulario no muestra. `whitelist` las quita;
  `forbidNonWhitelisted` además rechaza la petición. Ledgerly ya lo tiene así.
- **`transform: true`** para que el DTO llegue como instancia de su clase y los
  tipos primitivos se conviertan. Sin él, un `@IsInt()` sobre un parámetro de
  ruta valida un string.
- **CORS con origen explícito**, nunca `*` en producción.
- **Cabeceras de seguridad con `helmet`**, aplicado **antes** que cualquier otro
  `app.use()` o ruta: si se registra después, no cubre lo ya definido.
- **Rate limiting** (`@nestjs/throttler`) en los endpoints caros o de escritura;
  con subida de ficheros y extracción de PDF, un endpoint sin límite es una
  invitación a tumbar el proceso.
- **Límite de tamaño de cuerpo** coherente con el de subida de ficheros.
- **`disableErrorMessages: true` en producción** si los mensajes de validación
  revelan estructura interna. En desarrollo, déjalos.
- Nada de secretos en el repo; configuración por entorno, validada al arrancar
  para que un despliegue con una variable ausente falle en el bootstrap y no en
  la primera petición del usuario.

## Tests: dobles honestos, no mocks de todo

El valor de esta arquitectura es que el dominio y los casos de uso se prueban
**sin base de datos, sin HTTP y sin reloj real**, porque todo lo externo entra
por un puerto.

- Prueba el **comportamiento** (invariante, regla, resultado), no la
  implementación. Un test que verifica "se llamó a `save()` una vez" se rompe en
  cada refactor sin detectar un solo fallo real.
- Prefiere un **fake** (una implementación en memoria del puerto, reutilizable) a
  un mock con expectativas por método: se escribe una vez por puerto, se lee
  mejor y no se rompe al reordenar llamadas.
- Los puertos de reloj e ids son los que hacen los tests deterministas: fíjalos
  en el doble en vez de tolerar `Date.now()`.
- La pirámide aquí: mucho dominio y caso de uso (rápidos, sin infraestructura),
  y unos pocos e2e que cubran el cableado real, que es donde fallan las cosas
  que el resto no ve.

## Migraciones

- `apps/back/src/database/migrations/<timestamp>-<Nombre>.ts`, timestamp
  estrictamente creciente sobre la última existente.
- Siempre **aditivas** y con `down()` completo y probado (`migration:revert`,
  no solo `run`).
- Constraint nueva sobre una tabla con datos históricos que la violan: `NOT
  VALID`, para que no invalide lo viejo pero sí exija la regla en toda escritura
  nueva. No añadir `VALIDATE CONSTRAINT` después "para dejarlo limpio": eso
  reintroduce justo el fallo que el `NOT VALID` evita.
- Antes de una constraint, **buscar todos los productores** de esas filas
  (seeds, cargadores de datos demo, jobs). Un productor en runtime que las viole
  empieza a fallar en caliente, no en la migración.

---

## Prohibido (anti-patrones concretos)

| Anti-patrón | Por qué |
|---|---|
| Entidad ORM (`@Entity`, `@Column`) en `domain/` | Acopla el núcleo al ORM; rompe la regla de dependencias |
| Inyectar la clase concreta del repositorio | El puerto queda decorativo; no hay inversión real |
| Clase `XUseCases` con todo el CRUD | God Service; tests acoplados; fichero en conflicto permanente |
| Controlador en `application/` | Mezcla transporte con orquestación |
| `return new NotFoundException(...)` | Devuelve **200** con la excepción en el cuerpo |
| `catch { return 0 }` / `catch { return null }` | Traga la causa; imposible de diagnosticar en despliegue |
| Entidad anémica (campos públicos, sin `create()`) | Permite construir objetos inválidos; las reglas se dispersan |
| `new Date()` / `uuid()` dentro de dominio o caso de uso | No determinista; obliga a mocks frágiles |
| `companyId` en firmas o rutas | `company` es **singleton** por diseño; el multi-tenant está aplazado a la fase de auth |
| Un contexto importando otro contexto | Se declara un puerto propio y se implementa en su infraestructura |
| `ValidationPipe` sin `whitelist` | Campos no declarados llegan al dominio: *mass assignment* |
| `Scope.REQUEST` en repositorios o casos de uso | Se contagia hacia arriba y reconstruye media app por petición |
| `useClass` dos veces para el mismo puerto | Dos instancias distintas; si guardan estado, diverge. Es `useExisting` |
| Publicar un evento de dominio antes de persistir | Se notifica un hecho que todavía puede fallar |
| Mockear el repositorio con expectativas por método | El test se rompe en cada refactor sin detectar fallos reales; usa un fake |
| Un value object por cada `string` | Ceremonia: multiplica ficheros y mapeos sin comprar ninguna regla |

---

## Checklist para revisar un plan o un PR de backend

1. ¿`domain/` compila sin `infrastructure/`? ¿Cero imports de NestJS/TypeORM ahí?
2. ¿Cada operación tiene su propio caso de uso con `execute()`?
3. ¿Los repositorios se inyectan por token y se tipan por interfaz?
4. ¿Las entidades validan sus invariantes en `create()`, y `withChanges()` revalida?
5. ¿Los errores son excepciones de dominio traducidas en un único filtro?
6. ¿La entidad ORM está en `persistence/` y hay mapper en los dos sentidos?
7. ¿Command sin decoradores, DTO con validación, controlador delgado?
8. ¿La migración es aditiva, reversible y con el `down()` probado?
9. ¿El módulo cablea todos los puertos que sus casos de uso inyectan? ¿Arranca de verdad?
10. ¿Ningún `companyId` colado?
11. ¿Todo provider en `DEFAULT`? ¿Ningún `REQUEST` que se contagie hacia arriba?
12. ¿`ValidationPipe` global con `whitelist` y `forbidNonWhitelisted`? ¿CORS con origen explícito?
13. ¿Los tests de dominio y caso de uso corren sin BD, sin HTTP y sin reloj real?
14. Si se introducen VOs o eventos: ¿resuelven una regla repetida o un efecto
    cruzado real, o son ceremonia? Ante la duda, no.

---

## Nota sobre las fuentes

Esta doctrina consolida los artículos de arquitectura limpia y DDD en NestJS que
maneja David y la documentación oficial de NestJS (custom providers, provider
scopes, validation, security), **contrastados contra el código real del repo**.
Donde una fuente contradice la regla de dependencias, manda la regla: los
artículos colocan el modelo del ORM en `domain/` y el controlador en
`application/`, e inyectan el repositorio concreto en vez del puerto — los tres
están en la tabla de prohibidos de arriba, no reproducidos.
