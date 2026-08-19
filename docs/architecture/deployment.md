# Production deployment

Ledgerly is deployed to a self-managed VPS from `deploy/`. The deployment
tooling comprises `deploy/docker-compose.yml`, `deploy/Caddyfile`,
`deploy/scripts/`, and `deploy/.env.example`; the root `Makefile` provides
`setup`, `doctor`, `configure`, `update`, `up`, `down`, `restart`, `logs`,
`migrate`, `backup`, and `restore`.

## Topology and same-origin policy

Caddy is the only public entry point. It terminates TLS and routes the API to
the backend while a second Caddy instance serves the frontend bundle.

```text
Internet -> Caddy (TLS, :80/:443)
              |- /api/* -> back:3000
              `- all else -> front:8080 (static Caddy process)
```

The production frontend is built with `VITE_API_URL=/api`, a relative URL.
This keeps the frontend and API on one origin and lets `make configure` change
the domain without rebuilding the frontend image. It also makes browser CORS
configuration unnecessary in production and aligns `FRONTEND_URL`, origin
checks, and secure cookies with the single public domain. A runtime
`config.json` was rejected because it adds a blocking request and another
runtime failure mode for no benefit.

## Containers and persistent data

Always invoke the production stack with:

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env
```

| Service    | Image                                   | Public ports           | Persistent volume            |
| ---------- | --------------------------------------- | ---------------------- | ---------------------------- |
| `postgres` | `postgres:17-alpine`                    | None                   | `pgdata`                     |
| `back`     | `ledgerly-back:local`                   | None                   | None                         |
| `front`    | `ledgerly-front:local`                  | None                   | None                         |
| `caddy`    | `caddy:2.11-alpine`                     | `80`, `443`, `443/udp` | `caddy_data`, `caddy_config` |
| `migrator` | `ledgerly-back:local` (`tools` profile) | None                   | None                         |

`migrator` runs only on demand through `make migrate` and `make update`.
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

## Configuration and installation state

The following untracked paths contain deployment state and secrets:

- `deploy/.env` (`0600`) contains domain, database, Better Auth, and Google
  OAuth configuration.
- `deploy/.state` (`0600`) records installation state.
- `deploy/backups/` (`0700`) holds database backups.

`deploy/.state` is absent, `in_progress`, or `completed`. Setup marks it
`completed` only after `https://$LEDGERLY_DOMAIN/api/health/ready` returns
`200`.
This allows an interrupted installation to resume from the saved environment
without reporting success before migrations, containers, DNS, or certificates
are ready.

Run the interactive installer once:

```bash
make setup
```

It validates the domain, collects Google credentials, the initial
administrator email, and timezone, generates deployment secrets, builds the
images, applies database migrations, starts the stack, requests TLS, and
checks the public readiness endpoint. It refuses to overwrite a completed
installation. `LEDGERLY_ALLOW_RESETUP=1 make setup` is a support escape hatch;
it does not delete existing data.

Database startup is explicit and fail-closed. Fresh databases run TypeORM and
Better Auth migrations with `synchronize=false`. Existing tables without the
Ledgerly migration marker are refused by normal startup. For an installation
that predates migrations, first run the disposable-clone rehearsal, then the
gated cutover:

```bash
make rehearse-existing-db-baseline
make baseline-existing-db
```

When a verified production dump is already available, use it explicitly:

```bash
make rehearse-existing-db-baseline FILE=deploy/backups/ledgerly-<timestamp>.dump
```

The cutover takes a verified backup, records the initial marker only after
schema validation, applies subsequent migrations, and runs a final verify.
`make migrate` is the normal command afterwards; `make db:verify` is exposed
inside `apps/back` for a read-only schema check.

For the Google OAuth client, use:

```text
Authorized JavaScript origin: https://<domain>
Authorized redirect URI:     https://<domain>/api/auth/callback/google
```

The values must match exactly. See `docs/architecture/auth.md` for the
authentication model and the required OAuth scopes.

## Operations

`make doctor` is safe for manual use and cron. It exits non-zero only for
failures and never prints secret values. It checks Docker, deployment file
permissions and required keys, production environment invariants, container
health, database connectivity and migration state, the configured connection
budget, DNS, Caddy ports, the public readiness endpoint, certificate expiry,
disk usage, backup-pair inventory, and the founder record.

Use `make configure` instead of editing `deploy/.env` directly. It can change
the domain, Google credentials, initial administrator email, or database
password and finishes with `make doctor`.

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
make update
```

It requires a completed installation, runs `git pull --ff-only`, creates a
backup, rebuilds images, applies pending migrations, waits for healthy
services, removes old images, and runs `make doctor`. It never runs `down -v`
or deletes volumes.

## Backups and recovery

Uploaded documents are stored as `bytea` in Postgres, so a Postgres dump is a
complete application backup. `make backup` writes a compressed `pg_dump -Fc`
file and a matching `0600` manifest to `deploy/backups/`, validates the archive
with `pg_restore`, records its byte count and SHA-256, serializes backup and
restore operations with `flock`, and retains the 14 newest complete pairs.
`make restore` validates the pair before use, creates a fresh safety backup by
default, requires typed confirmation, and runs `pg_restore --clean
--if-exists`. Skipping that safety backup requires a separate explicit
confirmation phrase.

Example daily local backup:

```cron
0 3 * * * cd /opt/ledgerly && make backup >> /var/log/ledgerly.log 2>&1
```

Remote/off-site backup storage, CI/CD, image registries, replicas, high
availability, and domain aliases are not configured by this deployment. Docker
installation and host firewall management remain host-administrator
responsibilities.

## See also

- `docs/architecture/auth.md` — Better Auth, Google OAuth, and session
  configuration.
- `docs/architecture/tenancy.md` — the company singleton and first-run flow.
