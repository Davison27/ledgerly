---
name: arquitectura-hexagonal
description: Clean/hexagonal architecture and DDD doctrine for the Ledgerly NestJS backend. Use it when planning or reviewing work in apps/back — contexts, layers, ports, use cases, entities, mappers, errors, and modules. It defines where every file belongs and prohibited patterns.
---

# Hexagonal architecture in NestJS — Ledgerly doctrine

The canonical reference for planning and reviewing `apps/back`. If a plan
contradicts this, the plan is wrong.

## The only rule that matters

**Dependencies point inward.** `domain` imports nothing from `application` or
`infrastructure`, nor from NestJS, TypeORM, or Express. `application` imports
`domain`. `infrastructure` imports both.

Smoke test: if you delete the entire `infrastructure/`, `domain/` must still
compile. If it does not, there is a violation.

Almost every decision below follows mechanically from this rule. When in doubt,
return here rather than improvising.

---

## Organization: context first, then layer

```
apps/back/src/
├── contexts/
│   └── <context>/                  # company, documents, projects, staff, invoices…
│       ├── domain/
│       │   ├── <aggregate>.ts                   # rich entity with invariants
│       │   ├── <aggregate>.repository.ts        # port plus Symbol token
│       │   ├── <capability>.port.ts             # other ports
│       │   └── errors/<case>.exception.ts       # domain exceptions
│       ├── application/
│       │   └── <verb-aggregate>/                # one folder per use case
│       │       ├── <verb-aggregate>.use-case.ts
│       │       ├── <verb-aggregate>.command.ts  # use-case input
│       │       └── <verb-aggregate>.use-case.spec.ts
│       ├── infrastructure/
│       │   ├── http/
│       │   │   ├── <resource>.controller.ts
│       │   │   ├── dtos/<verb>-<resource>.dto.ts
│       │   │   └── <resource>.response.ts
│       │   └── persistence/
│       │       ├── <aggregate>.orm-entity.ts    # TypeORM belongs here, never in domain
│       │       ├── <aggregate>.mapper.ts
│       │       └── typeorm-<aggregate>.repository.ts
│       └── <context>.module.ts
├── shared/
│   ├── domain/                     # DomainException, cross-cutting ports (IdGenerator)
│   └── infrastructure/http/        # DomainExceptionFilter
└── database/
    ├── migrations/<timestamp>-<Name>.ts
    └── seeds/
```

**Why context first rather than `src/domain/`, `src/application/`, and
`src/infrastructure/` at the root:** with eight contexts, grouping by layer
forces a single-feature change to touch three distant trees, and `domain/`
becomes a drawer of eight unrelated subdirectories. Context grouping makes the
system's purpose obvious (screaming architecture) and keeps together what
changes together. This is required by `CLAUDE.md` ("hexagonal architecture
**by contexts**").

A context **does not import** another context. If it needs something external,
it declares an **own port** in its `domain/` and implements it in its
`infrastructure/`, querying whatever it needs. A real example:
`documents/domain/staff-member-existence-checker.port.ts` — the documents
context checks that a staff member exists without coupling to the `staff`
context.

---

## Domain layer

### Rich entities, never anemic

An entity **is not** a bag of public fields. It encapsulates state and
**protects its invariants**: if an object exists, it is valid. It cannot be
constructed invalid.

```ts
export class Document {
  private constructor(private readonly props: DocumentProps) {}

  static create(props: DocumentProps): Document {
    if (props.type === 'nomina' && props.staffMemberId === null) {
      throw new InvalidValueException('A payroll document requires a staff member');
    }
    return new Document(props);
  }

  withChanges(changes: Partial<DocumentProps>): Document {
    return Document.create({ ...this.props, ...changes });
  }
}
```

Key points: private constructor plus a validating `create()` factory;
`withChanges()` reruns `create()` so a change cannot bypass an invariant; getters
rather than mutable public fields.

Rather than one getter per field, prefer **methods that express intent**: instead
of `doc.getStatus() === 'vencido'` in six places, use `doc.isOverdue()`. A
getter exposes state; a method exposes the rule, and the rule lives in one
place. This is not dogma — a getter for displaying a field is fine; the
criterion is that no business **decision** is made outside the aggregate by
reading its internals.

**Where a business rule belongs:** if it depends only on the state of one
aggregate, it belongs in the entity. If it needs to coordinate multiple
aggregates or query outside data, it belongs in the use case.

### Value objects: validate once, at the domain boundary

A value object wraps a primitive with its rule and **cannot exist invalid**. It
is compared by value rather than identity, and it is immutable.

```ts
export class DocumentAmount {
  private constructor(private readonly value: number) {}

  static fromNumber(value: number): DocumentAmount {
    if (!Number.isFinite(value) || value < 0) {
      throw new InvalidValueException('amount must be a positive number');
    }
    return new DocumentAmount(value);
  }

  toNumber(): number {
    return this.value;
  }
}
```

What this buys: validation no longer repeats in every DTO, use case, and test,
and `function pay(amount: number, tax: number)` can no longer be invoked with
arguments in the wrong order.

**When NOT to use them** — this matters as much as the above: one VO for every
application `string` is ceremony that multiplies files and mappings without
adding value. It is justified when the primitive has its **own rule** (amount,
tax ID, email, currency, percentage) or when it can be confused with another of
the same type in a signature. For free-form `notes: string | null`, a VO is
unnecessary.

Ledgerly currently validates in the aggregate factory, which is enough for most
fields. Introducing VOs is an **incremental, localized** improvement: start
with those that already have a repeated rule, not a complete sweep.

### Domain events: when an effect is not the use case's concern

An aggregate records what happened to it; the use case publishes it after
persistence; a subscriber reacts. This decouples side effects (notification,
synchronization, auditing) from the use case that caused them.

```ts
private events: DomainEvent[] = [];
pullEvents(): DomainEvent[] { const e = this.events; this.events = []; return e; }

await this.repository.save(document);
this.eventBus.publish(document.pullEvents());
```

Rules: publish **after** persistence (otherwise you notify about something that
can still fail); the event names a completed fact in the past
(`DocumentUploaded`, not `UploadDocument`); and the aggregate **does not**
perform the effect, it only records it.

**Repository criterion:** Ledgerly already has a shared in-process domain-event
publisher for action-based notifications. Use it when a completed fact must
trigger effects in another context without coupling those contexts. Do not route
ordinary calls through it merely "because DDD": direct use-case orchestration is
still clearer when the effect belongs to the same operation. See
`docs/architecture/notifications.md` for the existing publisher, subscriber,
and retry boundary.

### Ports: interface + injection token

TypeScript erases interfaces at compile time, so Nest **cannot** inject by
interface. Without a token, dependency inversion does not exist: the concrete
class ends up injected and the port is decorative.

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

Name the port in domain language (`save`, `findById`), not ORM language (no
`createQueryBuilder` or `findOne({where})` leaking into the signature).

### Domain errors

The domain throws **its own** exceptions, without knowing HTTP status codes:

```ts
export class StaffMemberHasPayrollsException extends DomainException {
  readonly code = 'RESOURCE_IN_USE';
}
```

Translation to HTTP is **single-sourced** and belongs in shared infrastructure
(`shared/infrastructure/http/domain-exception.filter.ts`), with its
`STATUS_BY_CODE` map. Adding a new case means adding one code to the map, not
scattering Nest `NotFoundException` throughout the domain.

---

## Application layer

### One use case per operation

One class per operation, with a single `execute()` method. **Do not** create an
`XUseCases` class containing six CRUD methods: that reintroduces the God Service
this architecture avoids, makes every test bring dependencies it does not use,
and turns the file into a conflict zone between agents.

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

Notice that it injects **the token**, typed as **the interface**. Never the
`TypeOrmStaffMemberRepository` class.

### Command ≠ DTO

- The **command** (`application/`) is the use case input: plain types, no
  decorators, no `class-validator`, and no knowledge of HTTP.
- The **DTO** (`infrastructure/http/dtos/`) validates the HTTP request with
  `class-validator`. It is a transport detail.

The controller translates DTO → command. This lets a use case be invoked from a
job, CLI, or queue without bringing along HTTP decorators.

### Non-deterministic effects, through a port

IDs, clock, file system: never call `uuid()` or `new Date()` within a domain or
use case. Put them behind a port (`ID_GENERATOR`), which makes testing possible
without fragile mocks.

---

## Infrastructure layer

### The controller is an input adapter

It belongs in `infrastructure/http/`, **not** in `application/`. It is a
transport detail: if the input becomes gRPC or a queue tomorrow, the use case
does not notice. Its job is thin: receive the DTO, map it to a command, invoke
`execute()`, return a response.

**Exceptions are thrown, not returned.** `return new NotFoundException()`
serializes the exception object as a **200 OK** response body — a production bug
that neither the compiler nor type tests detect. Instead, let the domain
exception rise and the filter translate it.

### ORM entity ≠ domain entity, with a mapper between them

The class with `@Entity`/`@Column` is a **persistence detail** and belongs in
`infrastructure/persistence/`. Putting it in `domain/` couples the core to the
ORM and breaks the dependency rule — the most common and most expensive error
in this architecture, because the table schema then starts dictating the
business model.

The `mapper` translates in both directions (`toDomain`, `toOrm`) and is the only
place that knows both forms.

### Blobs and sensitive data

Binary-content columns use `select: false`, so a file is not loaded with every
list. Validate the actual type using _magic bytes_, not the filename extension
or the `mimetype` supplied by the client.

---

## Nest modules

The context module is where the port is **wired** to its implementation:

```ts
providers: [
  CreateStaffMemberUseCase,
  { provide: STAFF_MEMBER_REPOSITORY, useClass: TypeOrmStaffMemberRepository },
],
```

A real trap already seen in this repository: a module that declares its
providers locally (such as `demo.module.ts`) and **does not** import another
context's module must also register that entity in
`TypeOrmModule.forFeature([...])` and the port provider. Otherwise Nest fails
**at startup**, not compilation: `nest build` passes, and deployment fails.
Always verify with a real startup, not only a build.

---

## Providers: registration forms and scopes

The four forms and when to use them:

| Form          | Use case                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `useClass`    | The normal case: wire a port to its implementation                                                     |
| `useValue`    | Constants, configuration objects, test doubles                                                         |
| `useFactory`  | The instance depends on something at runtime (environment, another provider); supports `inject: [...]` |
| `useExisting` | Alias an already registered provider, **sharing the instance**                                         |

`useExisting` is not `useClass` under another name: `useClass` creates a new
instance, `useExisting` reuses the existing one. Registering the same repository
twice with `useClass` leaves you with two instances and two states if they ever
store state.

**Alternative to `Symbol` tokens: an abstract class.** An interface is erased
at compile time, but an abstract class **exists at runtime**, so it can be a
token itself and avoids `@Inject()`:

```ts
export abstract class Clock {
  abstract now(): Date;
}
// providers: [{ provide: Clock, useClass: SystemClock }]
constructor(private readonly clock: Clock) {}
```

Both are valid. **This repository consistently uses `Symbol` + `@Inject()`** —
do not mix styles within the same context merely to save a decorator;
consistency matters more here than brevity.

### Scopes: `DEFAULT` unless proven otherwise

- `DEFAULT` — singleton. This is correct for repositories, use cases, and
  adapters. Everything in Ledgerly must use this.
- `REQUEST` — a new instance per request. **It costs performance and propagates
  upward**: if a repository is `REQUEST`, the use case injecting it and the
  controller injecting that use case become request-scoped too, eventually
  rebuilding half the application on every request.
- `TRANSIENT` — a dedicated instance per consumer. It does not propagate.

Practical rule: if someone proposes `REQUEST` to access "the current user" or
"the tenant", it is almost always better to pass that data **as a command
argument**. Scope is the last option, not the first.

## HTTP boundary and safe deployment

The architecture protects the domain; this protects the process. It belongs in
`main.ts`, the _composition root_.

- **Global `ValidationPipe` with `whitelist: true` and
  `forbidNonWhitelisted: true`.** This is not cosmetic: without `whitelist`,
  any extra property in a request body reaches the command and then the
  aggregate — the classic _mass assignment_ route, where a client slips in a
  field the form does not show. `whitelist` removes it;
  `forbidNonWhitelisted` also rejects the request. Ledgerly already has this.
- **`transform: true`** so the DTO arrives as an instance of its class and
  primitive types are converted. Without it, `@IsInt()` on a route parameter
  validates a string.
- **CORS with an explicit origin**, never `*` in production.
- **Security headers with `helmet`**, applied **before** any other `app.use()`
  or route: if registered later, it does not cover what was already defined.
- **Rate limiting** (`@nestjs/throttler`) on expensive or write endpoints;
  with file uploads and PDF extraction, an unlimited endpoint invites process
  exhaustion.
- **A request-body size limit** aligned with the file-upload limit.
- **`disableErrorMessages: true` in production** if validation messages reveal
  internal structure. Keep them in development.
- No secrets in the repository; configure through environment variables,
  validate at startup so a deployment with a missing variable fails at bootstrap
  rather than on the user's first request.

## Tests: honest doubles, not mocks for everything

The value of this architecture is that domain and use cases are tested **without
a database, HTTP, or the real clock**, because every external dependency enters
through a port.

- Test **behaviour** (invariant, rule, result), not implementation. A test that
  asserts "`save()` was called once" breaks on every refactor without detecting
  a real failure.
- Prefer a **fake** (a reusable in-memory implementation of a port) to a mock
  with per-method expectations: write it once per port, read it more easily,
  and it does not break when calls are reordered.
- Clock and ID ports make tests deterministic: fix them in the double rather
  than accommodating `Date.now()`.
- The pyramid here: much domain and use-case coverage (fast, without
  infrastructure), plus a few e2e tests covering real wiring, which catches what
  the rest cannot see.

## Migrations

- `apps/back/src/database/migrations/<timestamp>-<Name>.ts`, with a timestamp
  strictly increasing over the last existing one.
- Always **additive**, with a complete, tested `down()` (`migration:revert`, not
  only `run`).
- A new constraint on a table with historical data that violates it: `NOT
VALID`, so it does not invalidate old data but does enforce the rule on every
  new write. Do not add `VALIDATE CONSTRAINT` afterwards "to leave it clean":
  that reintroduces the exact failure that `NOT VALID` prevents.
- Before a constraint, **find every producer** of those rows (seeds, demo-data
  loaders, jobs). A runtime producer that violates it starts failing live, not
  in the migration.

---

## Forbidden (specific anti-patterns)

| Anti-pattern                                      | Why                                                                                                 |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| ORM entity (`@Entity`, `@Column`) in `domain/`    | Couples the core to the ORM; breaks the dependency rule                                             |
| Injecting the concrete repository class           | The port becomes decorative; there is no real inversion                                             |
| `XUseCases` class with all CRUD                   | God Service; coupled tests; permanently conflicting file                                            |
| Controller in `application/`                      | Mixes transport with orchestration                                                                  |
| `return new NotFoundException(...)`               | Returns **200** with the exception in the body                                                      |
| `catch { return 0 }` / `catch { return null }`    | Swallows the cause; impossible to diagnose in deployment                                            |
| Anemic entity (public fields, no `create()`)      | Allows invalid objects; rules are scattered                                                         |
| `new Date()` / `uuid()` in a domain or use case   | Non-deterministic; forces fragile mocks                                                             |
| `companyId` in signatures or routes               | `company` is a design **singleton**; multi-tenancy is deferred to its own dedicated phase           |
| One context importing another context             | Declare its own port and implement it in its infrastructure                                         |
| `ValidationPipe` without `whitelist`              | Undeclared fields reach the domain: _mass assignment_                                               |
| `Scope.REQUEST` in repositories or use cases      | Propagates upward and rebuilds half the app per request                                             |
| `useClass` twice for the same port                | Two distinct instances; state diverges if they store it. Use `useExisting`                          |
| Publishing a domain event before persistence      | Notifies a fact that can still fail                                                                 |
| Mocking repositories with per-method expectations | Tests break on every refactor without finding failures; use a fake                                  |
| A value object for every `string`                 | Ceremony: multiplies files and mappings without adding a rule                                       |
| **Any code comment**                              | Forbidden in this repository. If explanation is needed, code is wrong: rename or extract. See below |

---

## Checklist for reviewing a backend plan or PR

1. Does `domain/` compile without `infrastructure/`? Are there zero NestJS/TypeORM imports there?
2. Does every operation have its own use case with `execute()`?
3. Are repositories injected by token and typed by interface?
4. Do entities validate invariants in `create()`, and does `withChanges()` revalidate?
5. Are errors domain exceptions translated in one filter?
6. Is the ORM entity in `persistence/`, with a mapper in both directions?
7. Is the command undecorated, the DTO validated, and the controller thin?
8. Is the migration additive, reversible, and its `down()` tested?
9. Does the module wire every port injected by its use cases? Does it actually start?
10. Is there no stray `companyId`?
11. Is every provider `DEFAULT`? Is there no `REQUEST` that propagates upward?
12. Does the global `ValidationPipe` use `whitelist` and `forbidNonWhitelisted`? Does CORS have an explicit origin?
13. Do domain and use-case tests run without a database, HTTP, or a real clock?
14. If VOs or events are introduced: do they solve a repeated rule or real
    cross-context effect, or are they ceremony? When in doubt, do not add them.

---

## Code without comments

This repository **does not write any comments**. No line comments, block
comments, or JSDoc. Only **directives** (`eslint-disable`, `@ts-expect-error`)
remain, which are not comments: removing them breaks lint or the build.

The rule is not cosmetic; it fits everything above: if a piece of code needs a
sentence next to it, its intent is not in the code. The answer is to
rename, extract a function whose name is the explanation, or move the rule into
the aggregate, where nobody can bypass it.

A comment also ages silently: nothing compiles or tests it, so by the third
refactor it lies. A poorly chosen name reveals itself in usage; a false comment
does not reveal itself to anyone.

Where everything once written as a comment now belongs:

| Before                                                             | Now                                                |
| ------------------------------------------------------------------ | -------------------------------------------------- |
| What this block does                                               | Extract a named function; the name is the sentence |
| What this value means                                              | A value object or type, not a side note            |
| Why it was done this way                                           | Commit message                                     |
| Consequence warning (`NOT VALID`, `helmet` order, module-local DI) | **This skill**, read by whoever makes the decision |
| Context design                                                     | `docs/architecture/`                               |

The three warnings that once lived as code comments are already captured above,
in “Migrations”, “Nest modules”, and “HTTP boundary and safe deployment”: that
is their place, because they apply to the entire repository rather than only the
line where they used to live.

---

## Note on sources

This doctrine consolidates the clean architecture and DDD in NestJS articles
David uses, and official NestJS documentation (custom providers, provider
scopes, validation, security), **checked against the repository's real code**.
Where a source contradicts the dependency rule, the rule wins: articles place
the ORM model in `domain/` and the controller in `application/`, and inject the
concrete repository instead of the port — all three are in the forbidden table
above and are not reproduced here.
