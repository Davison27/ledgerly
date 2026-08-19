#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

main() {
  require_installed

  local status
  status="$(state_get STATUS 2>/dev/null || printf '')"
  if [ "$status" != "completed" ]; then
    fail "The installation is not complete yet."
    printf '       → Complete it with: make setup\n'
    exit 1
  fi

  step "Updating Ledgerly"

  if [ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]; then
    fail "There are uncommitted local changes in ${REPO_ROOT}."
    printf '       → Run git status; save or discard those changes before updating.\n'
    exit 1
  fi

  command -v flock >/dev/null 2>&1 || { fail "flock is required for safe updates"; exit 1; }
  mkdir -p "$BACKUPS_DIR"
  local lock_file="$BACKUPS_DIR/.ledgerly.lock"
  ( umask 077; : >"$lock_file"; chmod 600 "$lock_file" )
  exec 9>"$lock_file"
  if ! flock -n 9; then
    fail "Another backup, restore, or update is already running"
    exit 1
  fi

  bash "$SCRIPT_DIR/backup.sh" --lock-held

  if ! git -C "$REPO_ROOT" pull --ff-only; then
    fail "git pull --ff-only failed (the local and remote histories have likely diverged)."
    printf '       → Run git -C %s log --oneline -5 and resolve it manually before running make update again.\n' "$REPO_ROOT"
    exit 1
  fi
  ok "Code updated"

  step "Rebuilding and migrating"
  compose config --quiet
  compose build --pull
  ok "Images rebuilt"

  compose up -d --wait postgres
  compose run --rm migrator node dist/database/migrate.js --mode=auto
  ok "Migrations applied"

  compose up -d --wait back front caddy
  ok "Services running"

  docker image prune -f >/dev/null
  ok "Old images removed"

  printf '\n'
  bash "$SCRIPT_DIR/doctor.sh"
}

main
