# Production deployment

Ledgerly is deployed to a self-managed VPS from `deploy/`. The deployment
tooling comprises `deploy/docker-compose.yml`, `deploy/Caddyfile`,
`deploy/scripts/`, and `deploy/.env.example`; the root `Makefile` provides
`setup`, `doctor`, `configure`, `update`, `up`, `down`, `restart`, `logs`,
`migrate`.

## Topology and same-origin policy

Caddy is the only public entry point. It terminates TLS and routes the API to
the backend while a second Caddy instance serves the frontend bundle.

```text
Internet -> Caddy (TLS, :80/:443)
              |- /api/* -> back:3000
              `- all else -> front:8080 (static Caddy process)
```

The production frontend is built with `VITE_API_URL=/api`, a relative URL.
This keeps the frontend and API on one origin and lets `make MODE=production configure` change
the domain without rebuilding the frontend image. It also makes browser CORS
configuration unnecessary in production and aligns `FRONTEND_URL`, origin
checks, and secure cookies with the single public domain. A runtime
`config.json` was rejected because it adds a blocking request and another
runtime failure mode for no benefit.

## Command modes

Make defaults to the development stack. Production commands require the
explicit `MODE=production` variable; the presence of `deploy/.env` never changes
the selected mode. Use `make MODE=production build-production` to build the
`ledgerly-back:local` image consumed by the production stack and by the existing
database rehearsal.

## PDF processing

The backend uses PDF.js for bounded text-layer extraction and for structured
data embedded in supported PDF attachments. XML, Facturae, Factur-X, and UBL
payloads use their dedicated parsers. The production image uses bounded PDF.js
readers rather than an image-to-text pipeline. A scanned or otherwise textless
PDF can still be uploaded, but extraction reports that it has no text layer so
the user can complete its metadata manually.

## Containers and persistent data

Always invoke the production stack with:

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env
```

For normal lifecycle operations, use `make MODE=production up`,
`make MODE=production down`, `make MODE=production restart`, or
`make MODE=production logs` so the production mode is explicit.

| Service    | Image                                   | Public ports           | Persistent volume            |
| ---------- | --------------------------------------- | ---------------------- | ---------------------------- |
| `postgres` | `postgres:17-alpine`                    | None                   | `pgdata`                     |
| `back`     | `ledgerly-back:local`                   | None                   | None                         |
| `front`    | `ledgerly-front:local`                  | None                   | None                         |
| `caddy`    | `caddy:2.11-alpine`                     | `80`, `443`, `443/udp` | `caddy_data`, `caddy_config` |
| `clamav`   | `clamav/clamav:1.5.3-debian@sha256:741e6c447241220e0792a901befcaec1d55a755c5097fc9cd88d7fd8be251a5c` | None | `clamav_data` |
| `migrator` | `ledgerly-back:local` (`tools` profile) | None                   | None                         |

`migrator` runs only on demand through `make MODE=production migrate` and
`make MODE=production update`.
Postgres is intentionally not published outside the Docker network. For
server-side inspection, use:

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env \
  exec postgres psql -U ledgerly ledgerly
```

Never delete `caddy_data`: it contains Let's Encrypt certificates and forcing
reissue can hit certificate limits.

The application containers use a read-only root filesystem, a `tmpfs` for
temporary work, dropped Linux capabilities, `no-new-privileges`, process
limits, CPU and memory limits, and rotated local container logs. The resource
values in `deploy/.env.example` are conservative starting defaults, not a
VPS-specific sizing decision; tune them only after measuring the selected
machine. The exact host firewall, SSH, kernel, swap, update, and provider
configuration remains outside this repository.

The base images are pinned to multi-platform registry digests in the Compose
and Dockerfile definitions. Refresh them only as an explicit release change:
verify the new digest for the target architecture, rebuild and test the
images, then record the change in the release notes.

## Malware scanning and signature freshness

Before PDF parsing or persistence, the backend sends the file bytes to ClamAV
over the private `scanner` Docker network using the ClamD protocol. ClamAV has
no published host port, but the backend and the scanner both see the PDF bytes
while the scan is running. This is an internal service boundary, not a
client-only confidentiality boundary.

The official ClamAV image uses FreshClam to download signature updates. The
production `scanner` network is internal and has no default outbound path, so
signature freshness requires an explicit, controlled VPS operations procedure.
Do not assume that a successful scan means the definitions are current, and do
not add unrestricted scanner egress as a convenience.

## Encrypted file persistence

All seven Ledgerly stored-file byte locations use AES-256-GCM authenticated
envelopes at the application persistence boundary. Each non-null envelope has a
fresh 12-byte nonce, a 16-byte authentication tag, ciphertext, and a key-version
identifier; every configured key decodes to exactly 32 bytes. Authenticated data
binds the store kind and immutable row ID, plus MIME and size where the store
has those fields.

| Store             | Encrypted bytes            | Central plaintext limit |
| ----------------- | -------------------------- | ----------------------: |
| Documents         | Uploaded document content  |                  10 MiB |
| Staff documents   | Staff-document content     |                  10 MiB |
| Company documents | Company-document content   |                  10 MiB |
| Companies         | Company logo               |     2 MiB decoded bytes |
| Projects          | Project image              |     2 MiB decoded bytes |
| Equipment         | Equipment image            |     2 MiB decoded bytes |
| Equipment docs    | Equipment-document content |                  10 MiB |

The limits are enforced by one shared policy before encryption and therefore
apply to HTTP, repository, and operational CLI paths. Whole-buffer
encryption is bounded by these limits; increasing them requires a separate
streaming design. Image inputs are canonical PNG, JPEG, or WebP data URLs with
strict base64, MIME, magic-byte, and decoded-size checks.

File bytes are encrypted; IDs, names, MIME types, sizes, relationships,
dates/statuses, invoice extraction fields, tax IDs, contact data, notes, and
other searchable or display metadata remain plaintext. File encryption does
not protect that metadata. Image MIME and size columns are plaintext metadata
that are also authenticated through the envelope's associated data.

There is no plaintext fallback or dual-read path. Null assets leave every
envelope column null, while partial envelopes are rejected by application and
database checks. Migration `AddEncryptedStoredFileEnvelopes1730000002000`
requires every old document, staff-document, company-document, company-logo,
project-image, equipment-image, and equipment-document column to be empty before it drops those
columns and adds encrypted envelope columns. It fails before schema changes if
any legacy file value exists. Reverting the migration likewise refuses while
encrypted data exists; only an empty schema can return to empty legacy columns.
The disposable development reset is therefore a prerequisite for adopting the
encrypted schema when old local rows are present.

This provides encryption at rest rather than client-only encryption. The backend
holds the configured application keys so it can encrypt, decrypt, scan, extract,
and serve files for authorized operations. The VPS operator and Docker daemon
are trusted boundaries: anyone who controls them may access deployment secrets,
process memory, mounted volumes, or database contents.

## Key management and stored-file operations

`make MODE=production setup` generates a fresh 32-byte stored-file key for a new installation
and writes the active version and keyring to the mode-600 `deploy/.env`.
For controlled manual generation, the backend script is:

```bash
pnpm --filter @ledgerly/back run stored-files:generate-keyring
```

Its output is secret material: capture it into protected deployment
configuration and never commit it, paste it into logs, or include it in support
output. When setup resumes, it validates and preserves the existing keyring
rather than generating a replacement. `STORED_FILE_KEYS` is a version-to-key
map and must retain old versions while their envelopes are being re-keyed;
`STORED_FILE_ACTIVE_KEY_VERSION` names the writer key. Bootstrap and the
standalone operations use the same strict parser and reject malformed or
missing active keys.

The package scripts operate on the compiled backend and accept
`--batch-size=<n>` or `STORED_FILES_BATCH_SIZE=<n>`, but not both. The default
is 100 and the maximum is 500:

```bash
pnpm --filter @ledgerly/back run build
pnpm --filter @ledgerly/back run stored-files:rekey -- --batch-size=100
pnpm --filter @ledgerly/back run stored-files:verify -- --batch-size=100
```

On a production stack, run the same compiled CLIs through the tools profile:

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env --profile tools \
  run --rm migrator node dist/database/stored-files/rekey-cli.js --batch-size=100
docker compose -f deploy/docker-compose.yml --env-file deploy/.env --profile tools \
  run --rm migrator node dist/database/stored-files/verify-cli.js --batch-size=100
```

Re-key reports batch and row totals. Verification reports aggregate
store/key-version/result counts; neither command prints record identifiers.

Rotate keys in this order:

1. Add the new version to the retained keyring on every writer and operations
   instance while the old version remains available.
2. Switch every writer to the new active version and redeploy.
3. During a quiescent pass, run `stored-files:rekey` until it completes; it
   decrypts and verifies each old envelope, writes a fresh authenticated
   envelope, and updates transactionally in bounded batches.
4. Run `stored-files:verify` and require zero partial, malformed,
   unknown-key, tampered/wrong-key, or retired-version rows across all seven
   stores.
5. Test a copied disposable database with active-only key configuration and
   confirm startup and verification succeed.
6. Only then remove the retired key from every keyring and redeploy.

Never retire a key before verification. A failed batch rolls back; committed
batches can resume, and a repeat run is idempotent. No plaintext is written by
the re-key or verification commands.

## Configuration and installation state

The following untracked paths contain deployment state and secrets:

- `deploy/.env` (`0600`) contains domain, database, Better Auth, and Google
  OAuth configuration.
- `deploy/.state` (`0600`) records installation state.

`deploy/.state` is absent, `in_progress`, or `completed`. Setup marks it
`completed` only after `https://$LEDGERLY_DOMAIN/api/health/ready` returns
`200`.
This allows an interrupted installation to resume from the saved environment
without reporting success before migrations, containers, DNS, or certificates
are ready.

Run the interactive installer once:

```bash
make MODE=production setup
```

It validates the domain, collects Google credentials, the initial
administrator email, and timezone, generates deployment secrets, builds the
images, applies database migrations, starts the stack, requests TLS, and
checks the public readiness endpoint. It refuses to overwrite a completed
installation. `LEDGERLY_ALLOW_RESETUP=1 make MODE=production setup` is a support escape hatch;
it does not delete existing data.

Database startup is explicit and fail-closed. Fresh databases run TypeORM and
Better Auth migrations with `synchronize=false`. Existing tables without the
Ledgerly migration marker are refused by normal startup. For an installation
that predates migrations, first run the disposable-clone rehearsal, then the
gated cutover:

```bash
make MODE=production rehearse-existing-db-baseline FILE=/path/to/external.dump
make MODE=production baseline-existing-db
```

When a verified production dump is already available, use it explicitly:

```bash
make MODE=production rehearse-existing-db-baseline FILE=/path/to/external.dump
```

The cutover validates the supplied external PostgreSQL custom-format dump with
`pg_restore --list`, records the initial marker only after schema validation,
applies subsequent migrations, and runs a final verify.
`make MODE=production migrate` is the normal command afterwards;
`pnpm --filter @ledgerly/back run db:verify` is the backend package script for
a read-only schema check.

For the Google OAuth client, use:

```text
Authorized JavaScript origin: https://<domain>
Authorized redirect URI:     https://<domain>/api/auth/callback/google
```

The values must match exactly. See `docs/architecture/auth.md` for the
authentication model and the required OAuth scopes.

## Operations

`make MODE=production doctor` is safe for manual use and cron. It exits non-zero only for
failures and never prints secret values. It checks Docker, deployment file
permissions and required keys, production environment invariants, container
health, database connectivity and migration state, the configured connection
budget, DNS, Caddy ports, the public readiness endpoint, certificate expiry,
disk usage, and the founder record.

Use `make MODE=production configure` instead of editing `deploy/.env` directly. It can change
the domain, Google credentials, initial administrator email, or database
password and finishes with `make MODE=production doctor`.

- Changing the domain requires updating the Google origin and redirect URI;
  existing browser sessions do not move to the new domain. The frontend image
  does not need rebuilding because its API URL is relative.
- Changing Google credentials affects future sign-ins, not existing Ledgerly
  sessions.
- Changing `BOOTSTRAP_ADMIN_EMAIL` after a founder exists does not transfer
  the founder account.
- Database-password rotation changes Postgres first, then `deploy/.env`, then
  recreates backend services. If a later step fails, repeat that option with
  the new password.

Update an installed instance with:

```bash
make MODE=production update
```

It requires a completed installation, runs `git pull --ff-only`, rebuilds
images, applies pending migrations, waits for healthy services, removes old
images, and runs `make MODE=production doctor`. It never runs `down -v` or deletes volumes.

## Recovery and local reset

External recovery, dump creation, retention, and restore operations are outside
Ledgerly. The repository has no backup creation, retention, restore, or backup
schedule tooling. An operator may supply an externally managed PostgreSQL dump
to the disposable rehearsal/baseline flow, but Ledgerly does not create or
retain that dump.

The only supported destructive development command is:

```bash
make reset-db CONFIRM=RESET_LEDGERLY_DEV
```

It refuses deployment, remote, shared, unlabeled, ambiguous, and non-local
Docker states. On its first successful run it transitions the verified legacy
local Compose project `back` to `ledgerly-dev`; later runs reset only the fixed
`ledgerly-dev` project. `DRY_RUN=1 make reset-db CONFIRM=RESET_LEDGERLY_DEV`
prints the inspected plan without deleting resources. `make clean` preserves
PostgreSQL volumes.

Remote/off-site recovery, CI/CD, image registries, replicas, high availability,
and domain aliases are not configured by this deployment. Docker installation
and host firewall management remain host-administrator responsibilities.

## Dependency triage and residual follow-ups

The remaining moderate TypeORM advisory is triaged as development CLI
reachability only: `migration:generate` is not invoked by Ledgerly production
startup or deployment commands and is absent from the production runtime
execution path. Owner: David. Review date: 2026-11-20.

The following controls remain explicit follow-ups rather than implemented
claims:

- VPS and Google configuration: host hardening, DNS/provider operations, and
  Google OAuth console setup and credential administration.
- Distributed throttling across multiple backend instances.
- Content disarm and reconstruction (CDR).
- Encryption and search design for searchable/display metadata.
- Immutable retention for security audit logs.
- Legal retention and deletion policy.

Ledgerly documents defense-in-depth controls and residual risk; it does not
claim complete security.

## See also

- `docs/architecture/auth.md` — Better Auth, Google OAuth, and session
  configuration.
- `docs/architecture/tenancy.md` — the company singleton and first-run flow.
