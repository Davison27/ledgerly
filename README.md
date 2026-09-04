<div align="center">
  <a href="https://github.com/Davison27/ledgerly">
    <img src="apps/front/src/assets/ledgerly-icon.svg" alt="Ledgerly" width="72" height="72">
  </a>
  <h1>Ledgerly</h1>
  <p><strong>Your business, clearly connected.</strong></p>
  <p>An enterprise-grade, self-hosted operational workspace uniting projects, financials, encrypted documents, teams, and business decisions.</p>

  <p>
    <a href="#run-locally"><img src="https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white" alt="React 19"></a>
    <a href="#run-locally"><img src="https://img.shields.io/badge/NestJS-11-E0234E?style=flat-square&logo=nestjs&logoColor=white" alt="NestJS 11"></a>
    <a href="#run-locally"><img src="https://img.shields.io/badge/PostgreSQL-17-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL 17"></a>
    <a href="#security-by-design"><img src="https://img.shields.io/badge/Security-AES--256--GCM-0D9488?style=flat-square" alt="AES-256-GCM"></a>
    <a href="#install-on-a-vps"><img src="https://img.shields.io/badge/Deploy-Docker%20Compose-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker Compose"></a>
    <img src="https://img.shields.io/badge/Privacy-Self--Hosted-6366F1?style=flat-square" alt="Self-Hosted">
  </p>

  <p>
    <a href="#-why-ledgerly"><strong>Explore Features »</strong></a>
    ·
    <a href="#-product-tour"><strong>Product Tour</strong></a>
    ·
    <a href="#-run-locally"><strong>Quickstart</strong></a>
    ·
    <a href="#-install-on-a-vps"><strong>Deploy to VPS</strong></a>
    ·
    <a href="#-security-by-design"><strong>Security Architecture</strong></a>
    ·
    <a href="#-architecture"><strong>Architecture</strong></a>
  </p>
</div>

<br>

<div align="center">
  <img src=".github/assets/readme/overview.png" alt="Ledgerly Overview Dashboard" width="100%">
</div>

<br>

---

## ⚡ Why Ledgerly?

Traditional business management is scattered across fragmented spreadsheets, invoice drives, and disconnected chat threads. Ledgerly brings everything into one cohesive, self-hosted operational command center:

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>📊 Real-Time Financial Visibility</h3>
      <ul>
        <li><strong>Project-driven P&L:</strong> Live margin, income, and expense tracking directly mapped to work orders.</li>
        <li><strong>Multi-currency operations:</strong> Handle domestic and international transactions cleanly.</li>
        <li><strong>Cash-flow forecasting:</strong> Instant breakdown of pending VAT and projected expenses.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>📑 Intelligent Document Pipeline</h3>
      <ul>
        <li><strong>PDF.js & Structured Extraction:</strong> Extract text and embedded structured data from incoming invoices (PDF, XML, Facturae, Factur-X, UBL), with manual completion for scanned PDFs without a text layer.</li>
        <li><strong>Smart duplicate prevention:</strong> Flag repeated bills and anomalous amounts automatically.</li>
        <li><strong>Full audit trail:</strong> Document lifecycle tracking with real-time alerts.</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🗓️ Unified Scheduling & Resource Planning</h3>
      <ul>
        <li><strong>Conflict detection:</strong> Prevent double-booking staff or equipment across overlapping projects.</li>
        <li><strong>Compliance timeline:</strong> Automatic tracking of employee document expiries and tax deadlines.</li>
        <li><strong>Multi-view calendar:</strong> Dense day, week, and agenda views tailored for rapid coordination.</li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>🛡️ Encrypted Self-Hosted Storage</h3>
      <ul>
        <li><strong>Authenticated AES-256-GCM:</strong> Confidential PDFs (compliance, equipment, employee records) encrypted at rest in PostgreSQL.</li>
        <li><strong>Versioned Keyring & Re-key CLI:</strong> Seamless key rotation and validation without downtime.</li>
        <li><strong>Self-hosted control:</strong> Your database and stored files remain on the configured VPS, with the host and Docker administrator as trusted operational boundaries.</li>
      </ul>
    </td>
  </tr>
</table>

---

## 🖼️ Product Tour

| Project Portfolio & Margins | Equipment & Asset Management |
| :---: | :---: |
| <img src=".github/assets/readme/projects.png" alt="Ledgerly Project Portfolio" width="100%"> | <img src=".github/assets/readme/products.png" alt="Ledgerly Equipment Management" width="100%"> |
| *Track project health, budgets, and attached documentation in real time.* | *Manage machinery and tools, track rental rates, and store encrypted tech specs.* |

> The screenshots use a sanitized example workspace. An installation can apply its own company name, logo, and brand colour across the sign-in experience and authenticated application.

---

## 🔒 Security by Design

Ledgerly is built with defense-in-depth security principles:

- **Google Workspace & OAuth Access**: Authentication handled by Better Auth, coupled with Ledgerly's internal workspace authorization guard.
- **Granular RBAC**: Role-based access matrices (`none`, `view`, `edit`) across every business context with admin, editor, and viewer presets.
- **Envelope Encryption**: Stored binary files use AES-256-GCM with unique 12-byte nonces and 16-byte authentication tags across 7 isolated store kinds.
- **Hardened Ingestion**: Strict MIME and magic-byte validation, bounded PDF parsers, and XML entity expansion (XXE) protections.
- **Server-held Application Keys**: The backend holds the configured stored-file keys so it can encrypt, decrypt, scan, and serve authorized files; this is encryption at rest rather than client-only encryption.
- **Self-Hosted Trust Boundary**: The VPS operator and Docker daemon can access deployment secrets, process memory, and mounted data. Host firewall, SSH, operating-system updates, disk protection, and backups remain operational responsibilities.
- **Private Malware Scanning**: Uploaded PDF bytes are sent to ClamAV over the private scanner network without a public ClamAV port. The backend and scanner both process those bytes during the scan.
- **Signature Freshness**: The official image uses FreshClam to download and verify signature updates. The internal production scanner network has no default outbound path, so keeping definitions current uses the controlled `make MODE=production clamav-update` procedure.
- **Staff document scope**: New staff-document uploads are currently deferred and shown as “Coming soon”. Payroll document creation is disabled; historical staff and payroll records remain available under the existing access rules.

---

## 🚀 Run Locally

### Requirements

- Node.js 20 or newer
- pnpm 11 or newer
- Docker with Docker Compose
- `make`

From the repository root:

```bash
make dev
```

This installs dependencies, creates `apps/back/.env` from `.env.example` when needed, starts PostgreSQL and the containerized backend, applies database migrations, and launches the Vite frontend with hot module reload.

### Local Endpoints

- **Frontend (Vite)**: [http://localhost:5173](http://localhost:5173)
- **API (NestJS)**: [http://localhost:3005/api](http://localhost:3005/api)
- **PostgreSQL**: `localhost:5432`

Vite proxies `/api` to the backend during development. Local ports and origins can be adjusted in `apps/back/.env`.

---

## 🌐 Install on a VPS

The guided deployment expects a Linux server (Debian/Ubuntu) with Docker, Docker Compose, Docker Scout, Git, and Make. On a minimal Debian installation:

```bash
sudo apt-get install -y git make
git clone https://github.com/Davison27/ledgerly.git /opt/ledgerly
cd /opt/ledgerly
make MODE=production setup
```

`make MODE=production setup` builds the application, initializes PostgreSQL, applies database migrations, starts the Docker Compose stack, provisions automated Let's Encrypt HTTPS via Caddy, and checks the public readiness endpoint. Production exposes only ports `80` and `443`; PostgreSQL, the backend, and ClamAV remain inside Docker networks.

Read the complete [deployment runbook](docs/architecture/deployment.md) before operating a production installation.

---

## ⚙️ Operations

Use `make help` to see commands in the current environment. Make defaults to the local development stack; production commands require the explicit `MODE=production` variable, regardless of whether `deploy/.env` exists.

### Installation and Lifecycle

- `make MODE=production setup` — run the one-time guided VPS installation.
- `make MODE=production doctor` — validate configuration, containers, database, DNS, certificates, disk space, and public health.
- `make MODE=production configure` — change the domain, Google credentials, administrator email, or database password safely.
- `make MODE=production up`, `make MODE=production down`, `make MODE=production restart` — control the production stack.
- `make MODE=production logs SERVICE=back` — follow production logs or select one service.

### Updates and Data

- `make MODE=production update` — pull with fast-forward only, rebuild, migrate, restart, and run diagnostics.
- `make MODE=production release-audit` — audit production dependencies and Compose images before building a release.
- `make MODE=production clamav-update` — refresh and verify ClamAV definitions through the isolated maintenance profile.
- `make MODE=production migrate` — apply pending database migrations and validate the application schema.
- `make MODE=production build-production` — build the `ledgerly-back:local` image used by the production stack and database rehearsal.
- `make MODE=production rehearse-existing-db-baseline FILE=/path/to/external.dump` — test a legacy-database cutover on a disposable clone.
- `make MODE=production baseline-existing-db` — gate and apply the legacy-database migration marker.
- `make up`, `make down`, `make restart` — control the local development stack.
- `make seed` — load development sample data.
- `make reset-db CONFIRM=RESET_LEDGERLY_DEV` — inspect and recreate only the guarded local development database. `DRY_RUN=1` shows the resolved plan without mutation.

### Quality and Maintenance

- `make build` — build the frontend and backend.
- `make lint` — run repository linting and hygiene checks.
- `make typecheck` — check TypeScript across the monorepo.
- `make test` — run the test suites.
- `make clean` — remove development builds and dependencies while preserving PostgreSQL volumes.

---

## 🏗️ Architecture

Ledgerly is architected as a clean pnpm and Turborepo monorepo:

```text
apps/front/   React 19, Vite, Ant Design, TanStack Query, Feature-Sliced Design
apps/back/    NestJS 11, TypeORM, PostgreSQL 17, hexagonal bounded contexts
deploy/       Docker Compose, Caddy, guided setup, diagnostics, and updates
docs/         Durable architecture and operations documentation
```

The frontend consumes the API through `/api`. In production, Caddy serves the frontend and routes API requests on the same origin. The backend keeps business contexts separated behind application ports and adapters, while PostgreSQL is the shared persistence layer.

### 📚 Durable Documentation

- [Authentication and access control](docs/architecture/auth.md)
- [Deployment and updates](docs/architecture/deployment.md)
- [Company lifecycle and branding](docs/architecture/tenancy.md)
- [Workspace members and permissions](docs/architecture/workspace.md)
- [Frontend data layer](docs/architecture/data-layer.md)
- [Themes, tokens, and responsive styling](docs/architecture/styling.md)
- [Persisted notifications](docs/architecture/notifications.md)

---

## 📄 License

Ledgerly's source code and documentation are distributed under the [Apache License 2.0](LICENSE.md), unless a file states otherwise. The license permits use, modification, and redistribution when the license and attribution notices are retained and modified files are marked. The software is provided “AS IS” without warranties; see [LICENSE.md](LICENSE.md) for the complete warranty and liability terms.

The Ledgerly name and logo are not granted under the software license. Apache-2.0 permits reasonable reference to the original work, but branded redistributions require separate authorization.
