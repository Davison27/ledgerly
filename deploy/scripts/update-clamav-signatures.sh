#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

require_installed
ensure_clamav_defaults

run_doctor=1
case "${1:-}" in
  "") ;;
  --skip-doctor) run_doctor=0 ;;
  *)
    fail "Unknown option: $1"
    exit 1
    ;;
esac

if ! env_file_complete "$ENV_FILE"; then
  fail "deploy/.env is incomplete. Run make MODE=production configure before updating ClamAV."
  exit 1
fi

max_age_hours="$(clamav_signature_age_hours || true)"
if [ -z "$max_age_hours" ]; then
  fail "CLAMAV_MAX_SIGNATURE_AGE_HOURS is invalid. Set a value from 1 to 8760."
  exit 1
fi

scanner_stopped=0
scanner_ready=0
update_log="$(mktemp)"
eicar_output=""
cleanup() {
  rm -f "$update_log"
  if [ -n "$eicar_output" ]; then
    rm -f "$eicar_output"
  fi
  if [ "$scanner_ready" -eq 0 ] && [ "$scanner_stopped" -eq 1 ]; then
    compose stop clamav >/dev/null 2>&1 || true
    warn "ClamAV remains stopped after the failed signature verification; uploads stay fail-closed."
  fi
}
trap cleanup EXIT

step "Updating ClamAV signatures"
compose stop clamav >/dev/null
scanner_stopped=1
if ! compose --profile maintenance run --rm clamav-updater >"$update_log" 2>&1; then
  fail "ClamAV signature update failed; the scanner remains stopped until a verified update succeeds."
  tail -n 40 "$update_log"
  exit 1
fi

compose up -d --wait clamav >/dev/null
if ! clamav_definitions_fresh "$(container_name clamav)" "$max_age_hours"; then
  fail "ClamAV definitions are missing, invalid, or older than ${max_age_hours} hours."
  exit 1
fi

if ! compose exec -T clamav clamdscan --ping 1 >/dev/null 2>&1; then
  fail "ClamAV is not responding after the signature update."
  exit 1
fi

eicar_output="$(mktemp)"
eicar='X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
if printf '%s' "$eicar" | compose exec -T clamav clamdscan --stream - >"$eicar_output" 2>&1; then
  fail "ClamAV did not detect the verification signature."
  exit 1
fi
if ! grep -q 'FOUND' "$eicar_output"; then
  fail "ClamAV verification did not return the expected malware result."
  exit 1
fi

scanner_ready=1
scanner_stopped=0
ok "ClamAV definitions are fresh, parseable, and detecting test malware"
if [ "$run_doctor" -eq 1 ]; then
  MODE=production bash "$SCRIPT_DIR/doctor.sh" --quiet
fi
