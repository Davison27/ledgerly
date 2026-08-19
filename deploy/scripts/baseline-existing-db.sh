#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$BASH_SOURCE")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

require_installed
cutover=0
if env | grep -qx 'LEDGERLY_EXISTING_DB_CUTOVER=1'; then cutover=1; fi
[ "$cutover" -eq 1 ] || {
  fail "Existing database cutover requires LEDGERLY_EXISTING_DB_CUTOVER=1"
  exit 1
}
command -v flock >/dev/null 2>&1 || { fail "flock is required for baseline operations"; exit 1; }

mkdir -p "$BACKUPS_DIR"
lock_file="$BACKUPS_DIR/.ledgerly.lock"
( umask 077; : >"$lock_file"; chmod 600 "$lock_file" )
exec 9>"$lock_file"
flock -n 9 || { fail "Another backup or restore is already running"; exit 1; }

compose config --quiet
bash "$SCRIPT_DIR/backup.sh" --lock-held
compose run --rm -e LEDGERLY_EXISTING_DB_CUTOVER=1 migrator node dist/database/migrate.js --mode=baseline-existing
compose run --rm migrator node dist/database/migrate.js --mode=auto
compose run --rm migrator node dist/database/migrate.js --mode=verify
ok "Existing database baseline verified"
