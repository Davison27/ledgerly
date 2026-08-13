# ledgerly-erp

Monorepo managed with [Turborepo](https://turborepo.dev/) and pnpm.

## Structure

```
ledgerly-erp/
├── apps/
│   ├── front/   # React 19 + Vite + TypeScript
│   └── back/    # NestJS 11 + TypeScript
└── packages/    # Shared code (currently empty)
```

## Getting started

There are two paths: local development or installation on a server.

### Development

Requirements: Node.js >= 20, pnpm >= 11, and Docker.

One command installs dependencies, creates `apps/back/.env`, builds and starts
the same backend container used on the VPS, rebuilds the development schema, and
starts the frontend with hot reload:

```bash
make dev
```

### VPS installation

Server requirements: `docker`, `docker compose`, `git`, and `make`. On a
minimal Debian image, install the latter two first:

```bash
sudo apt-get install -y git make
```

Then run:

```bash
git clone <repo-url> /opt/ledgerly && cd /opt/ledgerly && make setup
```

`make setup` is interactive: it asks for the domain, Google credentials, and
administrator email, then serves the application at `https://<domain>` with
automatic HTTPS. For the complete runbook and the remaining operational
commands (`doctor`, `configure`, `update`, and `backup`), see
[`docs/architecture/deployment.md`](docs/architecture/deployment.md).

### Commands (`make help`)

| Area         | Command          | Description                                                                                                            |
| ------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Installation | `make setup`     | One-time guided server installation.                                                                                   |
| Installation | `make doctor`    | Diagnoses the installation and exits non-zero when anything fails.                                                     |
| Installation | `make configure` | Changes the domain, Google credentials, administrator email, or database password.                                     |
| Updates      | `make update`    | Fetches the new version, rebuilds images, and migrates without losing data.                                            |
| Updates      | `make backup`    | Creates a compressed database backup.                                                                                  |
| Updates      | `make restore`   | Restores a backup after typed confirmation.                                                                            |
| Lifecycle    | `make up`        | Starts the production stack or the local development containers.                                                       |
| Lifecycle    | `make down`      | Stops the active stack.                                                                                                |
| Lifecycle    | `make restart`   | Restarts the active stack.                                                                                             |
| Lifecycle    | `make logs`      | Follows logs; `make logs SERVICE=back` filters by service.                                                             |
| Development  | `make dev`       | Runs the local loop: dependencies, production-equivalent backend container, schema bootstrap, and frontend hot reload. |
| Development  | `make build`     | Builds the frontend and backend.                                                                                       |
| Development  | `make lint`      | Runs ESLint.                                                                                                           |
| Development  | `make typecheck` | Checks types.                                                                                                          |
| Development  | `make test`      | Runs tests.                                                                                                            |
| Database     | `make migrate`   | Reconciles the schema with the current application definitions.                                                        |
| Database     | `make reset-db`  | Deletes the volume and recreates the database. Development only.                                                       |
| Database     | `make seed`      | Loads sample data. Development only.                                                                                   |
| Cleanup      | `make clean`     | Removes builds, `node_modules`, and development volumes. Refuses production mode.                                      |

`up`, `down`, `restart`, `logs`, `migrate`, and `backup` are **contextual**:
they target the production stack when `deploy/.env` exists, otherwise the
development Postgres instance. The same command selects the appropriate target
on the server and on a workstation.

## Scripts (from the repository root)

| Command           | Description                                                    |
| ----------------- | -------------------------------------------------------------- |
| `pnpm dev`        | Starts the frontend and backend in development mode.           |
| `pnpm build`      | Builds every application.                                      |
| `pnpm lint`       | Runs ESLint across the monorepo.                               |
| `pnpm check:repo` | Rejects non-English docs and files that must not be versioned. |
| `pnpm typecheck`  | Checks types.                                                  |
| `pnpm test`       | Runs tests.                                                    |
| `pnpm format`     | Formats code with Prettier.                                    |

To run one package, use Turbo filtering, for example:

```bash
pnpm dev --filter=@ledgerly/front
pnpm dev --filter=@ledgerly/back
```

## Ports and development

- **Frontend** (Vite): http://localhost:5173
- **Backend** (NestJS): http://localhost:3005/api

The frontend proxies `/api` requests to the backend in development (see
`apps/front/vite.config.ts`), and the backend enables CORS for the frontend
origin. Copy `apps/back/.env.example` to `apps/back/.env` to customize `PORT`
and `FRONTEND_URL`.
