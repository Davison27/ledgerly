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
compose config --quiet
compose run --rm -e LEDGERLY_EXISTING_DB_CUTOVER=1 migrator node dist/database/migrate.js --mode=baseline-existing
compose run --rm migrator node dist/database/migrate.js --mode=auto
compose run --rm migrator node dist/database/migrate.js --mode=verify
ok "Existing database baseline verified"
