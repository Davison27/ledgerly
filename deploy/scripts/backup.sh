#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

KEEP_LAST=14

main() {
  require_installed

  if ! service_running postgres; then
    fail "postgres no está en marcha"
    printf '       → docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d postgres\n'
    exit 1
  fi

  ( umask 077; mkdir -p "$BACKUPS_DIR" )
  chmod 700 "$BACKUPS_DIR"

  local db_user db_name timestamp dump_file
  db_user="$(env_get DB_USER)"
  db_name="$(env_get DB_NAME)"
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  dump_file="${BACKUPS_DIR}/ledgerly-${timestamp}.dump"

  step "Copia de seguridad"
  ( umask 077; compose exec -T postgres pg_dump -U "$db_user" -Fc "$db_name" >"$dump_file" )
  chmod 600 "$dump_file"

  local size
  size="$(du -h "$dump_file" | cut -f1)"
  ok "Guardada en ${dump_file} (${size})"

  local old_backups
  mapfile -t old_backups < <(find "$BACKUPS_DIR" -maxdepth 1 -name 'ledgerly-*.dump' -type f | sort -r | tail -n +$((KEEP_LAST + 1)))
  if [ "${#old_backups[@]}" -gt 0 ]; then
    rm -f "${old_backups[@]}"
    ok "Eliminadas ${#old_backups[@]} copias antiguas (se conservan las últimas ${KEEP_LAST})"
  fi
}

main
