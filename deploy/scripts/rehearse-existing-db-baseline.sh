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
  local manifest expected_bytes actual_bytes expected_hash actual_hash
  case "$DUMP_FILE" in
    /*) ;;
    *) DUMP_FILE="$REPO_ROOT/$DUMP_FILE" ;;
  esac
  manifest="${DUMP_FILE%.dump}.manifest"
  [ -f "$DUMP_FILE" ] || { fail "The rehearsal dump does not exist: $DUMP_FILE"; exit 1; }
  [ -f "$manifest" ] || { fail "The rehearsal manifest does not exist: $manifest"; exit 1; }
  [ "$(grep -E '^dump_file=' "$manifest" | tail -n1 | cut -d= -f2-)" = "$(basename "$DUMP_FILE")" ] || {
    fail "The rehearsal manifest does not match its dump filename"
    exit 1
  }
  expected_bytes="$(grep -E '^bytes=' "$manifest" | tail -n1 | cut -d= -f2-)"
  actual_bytes="$(wc -c <"$DUMP_FILE" | tr -d '[:space:]')"
  [ "$expected_bytes" = "$actual_bytes" ] || { fail "The rehearsal dump byte count is invalid"; exit 1; }
  expected_hash="$(grep -E '^sha256=' "$manifest" | tail -n1 | cut -d= -f2-)"
  if command -v sha256sum >/dev/null 2>&1; then
    actual_hash="$(sha256sum "$DUMP_FILE" | awk '{print $1}')"
  else
    actual_hash="$(shasum -a 256 "$DUMP_FILE" | awk '{print $1}')"
  fi
  [ "$expected_hash" = "$actual_hash" ] || { fail "The rehearsal dump checksum is invalid"; exit 1; }
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

command -v flock >/dev/null 2>&1 || { fail "flock is required for baseline rehearsals"; exit 1; }
mkdir -p "$BACKUPS_DIR"
lock_file="$BACKUPS_DIR/.ledgerly.lock"
( umask 077; : >"$lock_file"; chmod 600 "$lock_file" )
exec 9>"$lock_file"
flock -n 9 || { fail "Another backup, restore, or baseline operation is already running"; exit 1; }

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
if [ -n "$DUMP_FILE" ]; then
  validate_supplied_dump
  rehearsal_compose exec -T postgres pg_restore --clean --if-exists --no-owner \
    -U "$rehearsal_user" -d "$rehearsal_name" <"$DUMP_FILE"
else
  compose exec -T postgres pg_dump -U "$(env_get DB_USER)" -d "$(env_get DB_NAME)" -Fc |
    rehearsal_compose exec -T postgres pg_restore --clean --if-exists --no-owner \
      -U "$rehearsal_user" -d "$rehearsal_name"
fi
rehearsal_compose exec -T postgres psql -U "$rehearsal_user" -d "$rehearsal_name" \
  -c 'DROP TABLE IF EXISTS "migrations"' >/dev/null
ok "Production data cloned into an isolated disposable database"

step "Rehearse existing-database cutover"
rehearsal_compose run --rm migrator node dist/database/migrate.js --mode=baseline-existing
rehearsal_compose run --rm migrator node dist/database/migrate.js --mode=auto
rehearsal_compose run --rm migrator node dist/database/migrate.js --mode=verify
ok "Existing-database baseline, pending migrations, and verification passed"
