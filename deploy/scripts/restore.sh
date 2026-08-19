#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$BASH_SOURCE")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

NO_PRE_BACKUP=0
DUMP_FILE=""
for argument in "$@"; do
  case "$argument" in
    --no-pre-restore-backup) NO_PRE_BACKUP=1 ;;
    FILE=*) DUMP_FILE="$(printf '%s' "$argument" | cut -d= -f2-)" ;;
    *.dump) DUMP_FILE="$argument" ;;
    *) fail "Unknown restore argument: $argument"; exit 1 ;;
  esac
done

checksum_file() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
  else
    shasum -a 256 "$file" | awk '{print $1}'
  fi
}

manifest_value() {
  local key="$1" file="$2"
  grep -E "^$key=" "$file" | tail -n1 | cut -d= -f2-
}

select_latest_dump() {
  find "$BACKUPS_DIR" -maxdepth 1 -name 'ledgerly-*.manifest' -type f | sort -r | while IFS= read -r manifest; do
    local candidate
    candidate="$(manifest_value dump_file "$manifest")"
    if [ -n "$candidate" ] && [ -f "$BACKUPS_DIR/$candidate" ]; then
      printf '%s' "$BACKUPS_DIR/$candidate"
      return 0
    fi
  done
}

validate_pair() {
  local dump_file="$1" manifest_file expected_bytes actual_bytes expected_hash actual_hash
  manifest_file="$(printf '%s' "$dump_file" | sed 's/\.dump$/.manifest/')"
  [ -f "$dump_file" ] || { fail "Backup dump does not exist: $dump_file"; return 1; }
  [ -f "$manifest_file" ] || { fail "Backup manifest does not exist: $manifest_file"; return 1; }
  [ "$(manifest_value dump_file "$manifest_file")" = "$(basename "$dump_file")" ] || {
    fail "Backup manifest does not match its dump filename"
    return 1
  }
  expected_bytes="$(manifest_value bytes "$manifest_file")"
  actual_bytes="$(wc -c <"$dump_file" | tr -d '[:space:]')"
  [ "$expected_bytes" = "$actual_bytes" ] || {
    fail "Backup byte count does not match its manifest"
    return 1
  }
  expected_hash="$(manifest_value sha256 "$manifest_file")"
  actual_hash="$(checksum_file "$dump_file")"
  [ "$expected_hash" = "$actual_hash" ] || {
    fail "Backup checksum does not match its manifest"
    return 1
  }
  compose exec -T postgres pg_restore --list - <"$dump_file" >/dev/null || {
    fail "Backup archive is not readable by the target Postgres tools"
    return 1
  }
}

require_lock() {
  local lock_file="$BACKUPS_DIR/.ledgerly.lock"
  ( umask 077; mkdir -p "$BACKUPS_DIR"; : >"$lock_file"; chmod 600 "$lock_file" )
  command -v flock >/dev/null 2>&1 || { fail "flock is required for safe restore concurrency"; exit 1; }
  exec 9>"$lock_file"
  flock -n 9 || { fail "Another backup or restore is already running"; exit 1; }
}

main() {
  require_installed
  require_lock
  [ -n "$DUMP_FILE" ] || DUMP_FILE="$(select_latest_dump || true)"
  [ -n "$DUMP_FILE" ] || { fail "No complete backup pair was found"; exit 1; }
  case "$DUMP_FILE" in
    /*) ;;
    *) DUMP_FILE="$REPO_ROOT/$DUMP_FILE" ;;
  esac
  validate_pair "$DUMP_FILE"

  step "Restore a backup"
  warn "You are about to restore $DUMP_FILE."
  printf '       This OVERWRITES all current Ledgerly data.\n\n'
  local confirmation
  if [ "$NO_PRE_BACKUP" -eq 1 ]; then
    read -r -p '  Type RESTORE WITHOUT SAFETY BACKUP to confirm > ' confirmation
    [ "$confirmation" = "RESTORE WITHOUT SAFETY BACKUP" ] || { warn "Cancelled; nothing was changed."; exit 1; }
  else
    read -r -p '  Type RESTORE to confirm > ' confirmation
    [ "$confirmation" = "RESTORE" ] || { warn "Cancelled; nothing was changed."; exit 1; }
  fi

  if [ "$NO_PRE_BACKUP" -eq 0 ]; then
    bash "$SCRIPT_DIR/backup.sh" --lock-held
  fi

  local db_user db_name
  db_user="$(env_get DB_USER)"
  db_name="$(env_get DB_NAME)"
  step "Restoring $DUMP_FILE"
  compose stop back
  if ! compose exec -T postgres pg_restore --clean --if-exists --exit-on-error -U "$db_user" -d "$db_name" <"$DUMP_FILE"; then
    fail "pg_restore failed; back remains stopped"
    printf '       → Review Postgres logs and start back only after verifying the database.\n'
    exit 1
  fi
  ok "Data restored"

  compose run --rm migrator node dist/database/migrate.js --mode=auto
  compose up -d --wait back front caddy
  bash "$SCRIPT_DIR/doctor.sh"
}

main
