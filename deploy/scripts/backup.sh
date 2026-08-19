#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$BASH_SOURCE")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

KEEP_LAST=14
LOCK_HELD=0
if [ "$#" -gt 0 ] && [ "$1" = "--lock-held" ]; then LOCK_HELD=1; fi

checksum_file() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
  else
    shasum -a 256 "$file" | awk '{print $1}'
  fi
}

database_size_bytes() {
  compose exec -T postgres psql -U "$(env_get DB_USER)" -d "$(env_get DB_NAME)" -tAc \
    'SELECT pg_database_size(current_database())' | tr -d '[:space:]'
}

backup_locked() {
  require_installed
  service_running postgres || { fail "postgres is not running"; exit 1; }

  ( umask 077; mkdir -p "$BACKUPS_DIR" )
  chmod 700 "$BACKUPS_DIR"

  local free_bytes database_bytes required_bytes
  free_bytes="$(( $(df -Pk "$BACKUPS_DIR" | awk 'NR==2 {print $4}') * 1024 ))"
  database_bytes="$(database_size_bytes)"
  required_bytes="$(( database_bytes * 2 + 67108864 ))"
  if [ "$free_bytes" -lt "$required_bytes" ]; then
    fail "Insufficient free disk space for a safe backup"
    printf '       Required: %s bytes; available: %s bytes.\n' "$required_bytes" "$free_bytes"
    exit 1
  fi

  local timestamp base dump_file partial_dump manifest_file partial_manifest db_user db_name
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  base="ledgerly-$timestamp"
  dump_file="$BACKUPS_DIR/$base.dump"
  partial_dump="$BACKUPS_DIR/.$base.dump.partial"
  manifest_file="$BACKUPS_DIR/$base.manifest"
  partial_manifest="$BACKUPS_DIR/.$base.manifest.partial"
  db_user="$(env_get DB_USER)"
  db_name="$(env_get DB_NAME)"

  step "Backup"
  rm -f "$partial_dump" "$partial_manifest"
  compose exec -T postgres pg_dump -U "$db_user" -Fc "$db_name" >"$partial_dump"
  compose exec -T postgres pg_restore --list - <"$partial_dump" >/dev/null

  local bytes digest postgres_version migration_count better_auth_tables better_auth_status
  bytes="$(wc -c <"$partial_dump" | tr -d '[:space:]')"
  digest="$(checksum_file "$partial_dump")"
  postgres_version="$(compose exec -T postgres psql -U "$db_user" -d "$db_name" -tAc 'SELECT version()' | tr '\n' ' ' | sed 's/[[:space:]]*$//')"
  migration_count="$(compose exec -T postgres psql -U "$db_user" -d "$db_name" -tAc \
    "SELECT CASE WHEN to_regclass('public.migrations') IS NULL THEN 0 ELSE (SELECT count(*) FROM migrations) END" | tr -d '[:space:]')"
  better_auth_tables="$(compose exec -T postgres psql -U "$db_user" -d "$db_name" -tAc \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('user','session','account','verification')" | tr -d '[:space:]')"
  better_auth_status="incomplete"
  [ "$better_auth_tables" = "4" ] && better_auth_status="complete"

  {
    printf 'format=custom-postgres\n'
    printf 'created_at=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf 'database=%s\n' "$db_name"
    printf 'postgres_version=%s\n' "$postgres_version"
    printf 'dump_file=%s.dump\n' "$base"
    printf 'bytes=%s\n' "$bytes"
    printf 'sha256=%s\n' "$digest"
    printf 'typeorm_migration_count=%s\n' "$migration_count"
    printf 'better_auth_migration_status=%s\n' "$better_auth_status"
  } >"$partial_manifest"

  chmod 600 "$partial_dump" "$partial_manifest"
  mv "$partial_dump" "$dump_file"
  mv "$partial_manifest" "$manifest_file"
  ok "Saved $dump_file and $manifest_file ($bytes bytes)"

  local manifest old_base manifest_count
  local complete_manifests=()
  while IFS= read -r manifest; do
    [ -n "$manifest" ] || continue
    [ -f "${manifest%.manifest}.dump" ] || continue
    complete_manifests+=("$manifest")
  done < <(find "$BACKUPS_DIR" -maxdepth 1 -name 'ledgerly-*.manifest' -type f | sort -r)
  manifest_count="${#complete_manifests[@]}"
  if [ "$manifest_count" -gt "$KEEP_LAST" ]; then
    while IFS= read -r manifest; do
      old_base="$(printf '%s' "$manifest" | sed 's/\.manifest$//')"
      rm -f "$manifest" "$old_base.dump"
    done < <(printf '%s\n' "${complete_manifests[@]:$KEEP_LAST}")
    ok "Retained the latest $KEEP_LAST complete backup pairs"
  fi
}

run_locked() {
  local lock_file="$BACKUPS_DIR/.ledgerly.lock"
  ( umask 077; mkdir -p "$BACKUPS_DIR"; : >"$lock_file"; chmod 600 "$lock_file" )
  if ! command -v flock >/dev/null 2>&1; then
    fail "flock is required for safe backup concurrency"
    exit 1
  fi
  exec 9>"$lock_file"
  if ! flock -n 9; then
    fail "Another backup or restore is already running"
    exit 1
  fi
  backup_locked
}

if [ "$LOCK_HELD" -eq 1 ]; then
  backup_locked
else
  run_locked
fi
