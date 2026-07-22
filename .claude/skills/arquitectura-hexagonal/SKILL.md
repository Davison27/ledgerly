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

**Dónde vive una regla de negocio:** si depende solo del estado de un agregado,
va en la entidad. Si necesita coordinar varios agregados o consultar el exterior,
va en el caso de uso.

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
