#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

main() {
  require_installed

  local dump_file="${1:-}"
  if [ -z "$dump_file" ]; then
    dump_file="$(find "$BACKUPS_DIR" -maxdepth 1 -name 'ledgerly-*.dump' -type f 2>/dev/null | sort -r | head -n1 || printf '')"
  fi

  if [ -z "$dump_file" ] || [ ! -f "$dump_file" ]; then
    fail "No backup was found."
    printf '       Specify the path: bash deploy/scripts/restore.sh deploy/backups/ledgerly-XXXX.dump\n'
    exit 1
  fi

  step "Restore a backup"
  warn "You are about to restore ${dump_file}."
  printf '       This OVERWRITES all current Ledgerly data. There is no\n'
  printf '       way back unless you have another backup.\n\n'

  local confirmation
  read -r -p '  Type RESTORE to confirm > ' confirmation
  if [ "$confirmation" != "RESTORE" ]; then
    warn "Cancelled; nothing was changed."
    exit 1
  fi

  local db_user db_name
  db_user="$(env_get DB_USER)"
  db_name="$(env_get DB_NAME)"

  step "Restoring ${dump_file}"
  compose stop back
  if ! compose exec -T postgres pg_restore --clean --if-exists -U "$db_user" -d "$db_name" <"$dump_file"; then
    fail "pg_restore failed during the restore."
    printf '       → Carefully review the data before continuing: docker compose -f deploy/docker-compose.yml --env-file deploy/.env logs postgres\n'
    printf '       → back remains stopped; start it with: docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d back\n'
    exit 1
  fi
  ok "Data restored"

  compose up -d --wait back
  ok "back started again"

  printf '\n'
  bash "$SCRIPT_DIR/doctor.sh"
}

main "$@"
