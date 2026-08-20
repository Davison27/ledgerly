#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$BASH_SOURCE[0]")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

require_installed
command -v docker >/dev/null 2>&1 || { fail "Docker is required for the baseline rehearsal"; exit 1; }
docker info >/dev/null 2>&1 || { fail "Docker is not running"; exit 1; }

DUMP_FILE=""
for argument in "$@"; do
  case "$argument" in
    FILE=*) DUMP_FILE="${argument#FILE=}" ;;
    *) fail "Unknown rehearsal argument: $argument"; exit 1 ;;
  esac
done

validate_supplied_dump() {
  case "$DUMP_FILE" in
    /*) ;;
    *) DUMP_FILE="$REPO_ROOT/$DUMP_FILE" ;;
  esac
  [ -f "$DUMP_FILE" ] || { fail "The rehearsal dump does not exist: $DUMP_FILE"; exit 1; }
  compose exec -T postgres pg_restore --list - <"$DUMP_FILE" >/dev/null || {
    fail "The rehearsal dump is not a readable PostgreSQL custom archive"
    exit 1
  }
}

docker image inspect ledgerly-back:local >/dev/null 2>&1 || {
  fail "The backend image ledgerly-back:local is not available"
  printf '       → Run make build or make setup first.\n'
  exit 1
}
service_running postgres || { fail "postgres is not running"; exit 1; }
[ -n "$DUMP_FILE" ] || { fail "A supplied external PostgreSQL custom-format dump is required: FILE=/path/to/dump"; exit 1; }

temporary_directory="$(mktemp -d "${TMPDIR:-/tmp}/ledgerly-baseline.XXXXXX")"
project_name="ledgerly-baseline-$$"
compose_file="$temporary_directory/docker-compose.yml"
rehearsal_user="$(env_get DB_USER)"
rehearsal_name="ledgerly_baseline"
rehearsal_password="$(gen_password)"

cleanup() {
  docker compose --project-name "$project_name" --file "$compose_file" down --volumes --remove-orphans >/dev/null 2>&1 || true
  rm -rf "$temporary_directory"
}
trap cleanup EXIT

export REHEARSAL_DB_USER="$rehearsal_user"
export REHEARSAL_DB_NAME="$rehearsal_name"
export REHEARSAL_DB_PASSWORD="$rehearsal_password"
export LEDGERLY_ENV_FILE="$ENV_FILE"

cat >"$compose_file" <<'EOF'
name: ledgerly-baseline-rehearsal

services:
  postgres:
    image: postgres:17-alpine@sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73
    environment:
      POSTGRES_USER: ${REHEARSAL_DB_USER}
      POSTGRES_PASSWORD: ${REHEARSAL_DB_PASSWORD}
      POSTGRES_DB: ${REHEARSAL_DB_NAME}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${REHEARSAL_DB_USER} -d ${REHEARSAL_DB_NAME}"]
      interval: 2s
      timeout: 5s
      retries: 30

  migrator:
    image: ledgerly-back:local
    env_file:
      - ${LEDGERLY_ENV_FILE}
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ${REHEARSAL_DB_NAME}
      DB_USER: ${REHEARSAL_DB_USER}
      DB_PASSWORD: ${REHEARSAL_DB_PASSWORD}
      LEDGERLY_EXISTING_DB_CUTOVER: "1"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - default

networks:
  default:
EOF

rehearsal_compose() {
  docker compose --project-name "$project_name" --file "$compose_file" "$@"
}

step "Create disposable PostgreSQL clone"
rehearsal_compose up -d --wait postgres >/dev/null
validate_supplied_dump
rehearsal_compose exec -T postgres pg_restore --clean --if-exists --no-owner \
  -U "$rehearsal_user" -d "$rehearsal_name" <"$DUMP_FILE"
rehearsal_compose exec -T postgres psql -U "$rehearsal_user" -d "$rehearsal_name" \
  -c 'DROP TABLE IF EXISTS "migrations"' >/dev/null
ok "Production data cloned into an isolated disposable database"

step "Rehearse existing-database cutover"
rehearsal_compose run --rm migrator node dist/database/migrate.js --mode=baseline-existing
rehearsal_compose run --rm migrator node dist/database/migrate.js --mode=auto
rehearsal_compose run --rm migrator node dist/database/migrate.js --mode=verify
ok "Existing-database baseline, pending migrations, and verification passed"
