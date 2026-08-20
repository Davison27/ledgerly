<div align="center">
  <img src="apps/front/src/assets/ledgerly-logo.svg" alt="Ledgerly" width="252">
  <h1>Ledgerly</h1>
  <p><strong>Your business, clearly connected.</strong></p>
  <p>A self-hosted workspace for the projects, records, people, and decisions that keep a business moving.</p>
  <p>
    <img src="https://img.shields.io/badge/React-19-149ECA?style=flat-square" alt="React 19">
    <img src="https://img.shields.io/badge/NestJS-11-E0234E?style=flat-square" alt="NestJS 11">
    <img src="https://img.shields.io/badge/PostgreSQL-17-4169E1?style=flat-square" alt="PostgreSQL 17">
    <img src="https://img.shields.io/badge/pnpm-11-F69220?style=flat-square" alt="pnpm 11">
    <img src="https://img.shields.io/badge/deployment-Docker%20Compose-2496ED?style=flat-square" alt="Docker Compose deployment">
  </p>
</div>

<img src=".github/assets/readme/overview.png" alt="Ledgerly sign-in experience with a preview of business metrics, project performance, document status, and upcoming work" width="100%">

<p align="center">
  <a href="#inside-ledgerly">Inside Ledgerly</a> ·
  <a href="#product-tour">Product tour</a> ·
  <a href="#run-locally">Run locally</a> ·
  <a href="#install-on-a-vps">Install on a VPS</a> ·
  <a href="#operations">Operations</a> ·
  <a href="#architecture">Architecture</a>
</p>

## Inside Ledgerly

Ledgerly brings day-to-day business operations into one coherent workspace. Projects connect financials and documents; the calendar brings together delivery work, staff events, and tax deadlines; shared catalogues keep suppliers and equipment close to the records that use them.

**Plan and deliver.** Track projects, dates, status, budgets, income, expenses, profitability, attached documents, and assigned equipment without losing the business context around the work.

**Keep records connected.** Manage uploaded business documents, suppliers, and reusable equipment records with filtering, encrypted PDFs, and detail views designed for regular operational use.

**Coordinate people and obligations.** Maintain staff profiles, payrolls, documentation expiry, schedule events, tax profiles, and monitored tax sources from the same installation.

**Understand the business.** Use the dashboard to review core indicators, cash flow, VAT, budget performance, leading projects, and upcoming activity at a glance.

## Product tour

|                                                                                  Project portfolio                                                                                   |                                                               Equipment catalogue                                                               |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------------: |
| <img src=".github/assets/readme/projects.png" alt="Ledgerly project portfolio showing project identity, profitability, income, expenses, margins, and document status" width="100%"> | <img src=".github/assets/readme/products.png" alt="Ledgerly equipment catalogue showing references, categories, pricing, and stock" width="100%"> |

The screenshots use a sanitized example workspace. An installation can apply its own company name, logo, and brand colour across the sign-in experience and authenticated application.

## Made for a private workspace

- **Google-based access.** Better Auth handles Google sign-in and sessions, while Ledgerly separately verifies workspace membership before granting application access.
- **Roles and module permissions.** Administrators can manage members using admin, editor, viewer, or custom permission matrices with `none`, `view`, and `edit` levels.
- **A UI that adapts.** The interface supports persistent light and dark themes, tenant branding, and Spanish or English language selection.
- **Guided VPS deployment.** The installer collects the domain, Google OAuth credentials, administrator email, and timezone, then validates the public installation.
- **Automatic HTTPS.** Caddy terminates TLS and keeps the frontend and API on the same origin.
- **Controlled updates.** The update workflow rebuilds images and applies migrations without deleting the PostgreSQL volume.
- **Data under your control.** Application records and uploaded documents live in the installation's PostgreSQL volume. A database dump contains both structured data and uploads.

## Run locally

### Requirements

- Node.js 20 or newer
- pnpm 11 or newer
- Docker with Docker Compose
- `make`

From the repository root:

```bash
make dev
```

This installs dependencies, creates `apps/back/.env` from the example when needed, starts PostgreSQL and the containerized backend, applies migrations, and launches the Vite frontend with hot reload.

Generate a unique stored-file keyring before starting the backend, then copy both printed lines into `apps/back/.env`:

```bash
pnpm --filter @ledgerly/back run stored-files:generate-keyring
```

Keep the generated keyring private and retain it while encrypted files exist. Replacing or deleting a key prevents access to files written with that version.

Google sign-in requires a local OAuth client and matching environment values. Follow the [authentication setup](docs/architecture/auth.md#google-cloud-and-local-setup) before signing in.

### Local endpoints

- Frontend: `http://localhost:5173`
- API: `http://localhost:3005/api`
- PostgreSQL: `localhost:5432`

Vite proxies `/api` to the backend during development. The local ports and origins can be adjusted in `apps/back/.env`.

## Install on a VPS

The guided deployment expects a Linux server with Docker, Docker Compose, Git, and Make. On a minimal Debian installation:

```bash
sudo apt-get install -y git make
git clone <repository-url> /opt/ledgerly
cd /opt/ledgerly
make setup
```

`make setup` builds the application, initializes PostgreSQL, applies database migrations, starts the Docker Compose stack, provisions HTTPS, and checks the public readiness endpoint. Production exposes only ports `80` and `443`; PostgreSQL and the backend remain inside Docker networks.

Read the complete [deployment runbook](docs/architecture/deployment.md) before operating an installation.

## Operations

Use `make help` to see commands in the current environment. Lifecycle and database commands automatically target production when `deploy/.env` exists; otherwise they target the local development stack.

### Installation and lifecycle

- `make setup` — run the one-time guided VPS installation.
- `make doctor` — validate configuration, containers, database, DNS, certificates, disk space, and public health.
- `make configure` — change the domain, Google credentials, administrator email, or database password safely.
- `make up`, `make down`, `make restart` — control the active stack.
- `make logs SERVICE=back` — follow all logs or select one service.

### Updates and data

- `make update` — pull with fast-forward only, rebuild, migrate, restart, and run diagnostics.
- External recovery is outside Ledgerly. This repository does not create, retain, or restore database dumps.
- `make migrate` — apply pending database migrations and validate the application schema.
- `make rehearse-existing-db-baseline FILE=/path/to/external.dump` — test a legacy-database cutover on a disposable clone.
- `make baseline-existing-db` — gate and apply the legacy-database migration marker.
- `make seed` — load development sample data.
- `make reset-db CONFIRM=RESET_LEDGERLY_DEV` — inspect and recreate only the guarded local development database. `DRY_RUN=1` shows the resolved plan without mutation.

### Quality and maintenance

- `make build` — build the frontend and backend.
- `make lint` — run repository linting and hygiene checks.
- `make typecheck` — check TypeScript across the monorepo.
- `make test` — run the test suites.
- `make clean` — remove development builds and dependencies while preserving PostgreSQL volumes.

## Architecture

Ledgerly is a pnpm and Turborepo monorepo with two applications and a deployment layer:

```text
apps/front/   React 19, Vite, Ant Design, TanStack Query, Feature-Sliced Design
apps/back/    NestJS 11, TypeORM, PostgreSQL, hexagonal bounded contexts
deploy/       Docker Compose, Caddy, guided setup, diagnostics, and updates
docs/         Durable architecture and operations documentation
```

The frontend consumes the API through `/api`. In production, Caddy serves the frontend and routes API requests on the same origin. The backend keeps business contexts separated behind application ports and adapters, while PostgreSQL is the shared persistence layer.

### Durable documentation

- [Authentication and access control](docs/architecture/auth.md)
- [Deployment and updates](docs/architecture/deployment.md)
- [Company lifecycle and branding](docs/architecture/tenancy.md)
- [Workspace members and permissions](docs/architecture/workspace.md)
- [Frontend data layer](docs/architecture/data-layer.md)
- [Themes, tokens, and responsive styling](docs/architecture/styling.md)
- [Persisted notifications](docs/architecture/notifications.md)
