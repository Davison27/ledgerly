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

  if ! git -C "$REPO_ROOT" pull --ff-only; then
    fail "git pull --ff-only failed (the local and remote histories have likely diverged)."
    printf '       → Run git -C %s log --oneline -5 and resolve it manually before running make update again.\n' "$REPO_ROOT"
    exit 1
  fi
  ok "Code updated"

  bash "$SCRIPT_DIR/backup.sh"

  step "Rebuilding and migrating"
  compose build
  ok "Images rebuilt"

  compose up -d --wait postgres
  compose run --rm migrator
  ok "Migrations applied"

  compose up -d --wait
  ok "Services running"

  docker image prune -f >/dev/null
  ok "Old images removed"

  printf '\n'
  bash "$SCRIPT_DIR/doctor.sh"
}

main
