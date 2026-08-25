# TypeScript toolchain

Ledgerly uses a hybrid TypeScript toolchain while the native TypeScript 7
compiler does not expose the programmatic API required by Nest CLI, Jest,
`ts-node`, and ESLint integrations.

- `@typescript/native` provides the native `tsc` 7 compiler. Frontend
  typechecks and builds use it by default. Backend typechecks use it, and
  `build:ts7` provides a direct-emission parity check.
- The dependency named `typescript` aliases the official
  `@typescript/typescript6` compatibility package. API consumers such as
  `typescript-eslint`, `ts-jest`, `ts-node`, and Nest tooling resolve this
  package instead of TypeScript 7.
- The production backend build remains `nest build`. Docker therefore keeps
  the supported Nest packaging path while native backend emission remains a
  required compatibility gate.

The root `typecheck` command runs frontend and backend native checks
sequentially. This limits peak memory on development machines and small VPS
builders without disabling the native compiler's internal parallelism.
Incremental metadata for backend typecheck, Nest build, and native emission is
stored under separate ignored paths in `node_modules/.tmp` so the compilers do
not share incompatible state.

TypeScript 7 no longer accepts `baseUrl`. Frontend aliases use a relative
`paths` target, while Vite retains its independent `@` runtime alias. The
backend declares `rootDir` and ambient Node/Jest types explicitly. Do not make
TypeScript 7 the default Nest build until Nest and the surrounding API-based
tools support its compiler API.

Timestamp-prefixed database migration files are the only files discovered by
the operational TypeORM data source. Tests may live beside migrations, but
their filenames must never match the migration loader pattern.
