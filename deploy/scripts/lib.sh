#!/usr/bin/env bash
# Shared functions for deploy/scripts/*.sh. This file is imported with
# "source", not executed directly: it inherits "set -euo pipefail" from the
# script that imports it.

LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$LIB_DIR/.." && pwd)"
# shellcheck disable=SC2034 # used by preflight.sh, doctor.sh, and update.sh
REPO_ROOT="$(cd "$DEPLOY_DIR/.." && pwd)"

# shellcheck disable=SC2034 # used by scripts that source lib.sh
ENV_FILE="$DEPLOY_DIR/.env"
# shellcheck disable=SC2034
ENV_EXAMPLE="$DEPLOY_DIR/.env.example"
STATE_FILE="$DEPLOY_DIR/.state"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.yml"

ENV_CONTRACT_KEYS=(
  LEDGERLY_DOMAIN ACME_EMAIL TZ NODE_ENV PORT
  FRONTEND_URL BACKEND_PUBLIC_URL COOKIE_SECURE TRUST_PROXY
  STORED_FILE_ACTIVE_KEY_VERSION STORED_FILE_KEYS
  DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD
  DB_TYPEORM_POOL_MAX DB_AUTH_POOL_MAX DB_MIGRATOR_POOL_MAX
  DB_IDLE_TIMEOUT_MS DB_CONNECTION_TIMEOUT_MS DB_STATEMENT_TIMEOUT_MS
  DB_QUERY_TIMEOUT_MS DB_CONNECTION_BUDGET
  MAX_LIST_ITEMS MAX_PROJECT_PRODUCTS_PER_PROJECT MAX_CALENDAR_RANGE_DAYS MAX_CALENDAR_RESULTS
  BETTER_AUTH_SECRET GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET BOOTSTRAP_ADMIN_EMAIL
  PDF_OCR_ENABLED PDF_OCR_LANGUAGE PDF_MAX_PAGES PDF_OCR_MAX_PAGES PDF_OCR_TIMEOUT_SECONDS
  PDF_UPLOAD_MAX_ACTIVE PDF_UPLOAD_MAX_QUEUED PDF_UPLOAD_QUEUE_TIMEOUT_MS
  PDF_READER_MAX_ACTIVE PDF_READER_MAX_QUEUED PDF_READER_QUEUE_TIMEOUT_MS
  PDF_RETRY_AFTER_SECONDS PDF_MAX_EXTRACTED_TEXT_BYTES PDF_MAX_ATTACHMENTS
  PDF_MAX_ATTACHMENT_BYTES PDF_MAX_TOTAL_ATTACHMENT_BYTES PDF_MAX_OCR_OUTPUT_BYTES
  DEPLOY_BACK_CPUS DEPLOY_BACK_MEMORY DEPLOY_FRONT_CPUS DEPLOY_FRONT_MEMORY
  DEPLOY_POSTGRES_CPUS DEPLOY_POSTGRES_MEMORY DEPLOY_POSTGRES_SHM_SIZE
  DEPLOY_TMPFS_SIZE DEPLOY_FRONT_TMPFS_SIZE DEPLOY_PIDS_LIMIT DEPLOY_POSTGRES_PIDS_LIMIT
  DEPLOY_FRONT_PIDS_LIMIT DEPLOY_MIGRATOR_PIDS_LIMIT
)

if [ -t 1 ]; then
  C_OK=$'\033[32m'; C_WARN=$'\033[33m'; C_FAIL=$'\033[31m'
  C_BOLD=$'\033[1m'; C_RESET=$'\033[0m'
else
  C_OK=""; C_WARN=""; C_FAIL=""; C_BOLD=""; C_RESET=""
fi

ok()   { printf '  [ %sOK%s ] %s\n' "$C_OK" "$C_RESET" "$1"; }
warn() { printf '  [%sWARN%s] %s\n' "$C_WARN" "$C_RESET" "$1"; }
fail() { printf '  [%sFAIL%s] %s\n' "$C_FAIL" "$C_RESET" "$1"; }
step() { printf '\n  %s%s%s\n' "$C_BOLD" "$1" "$C_RESET"; }
section() {
  printf '\n  %s%s%s\n  %s\n' "$C_BOLD" "$1" "$C_RESET" \
    "$(printf '─%.0s' $(seq 1 63))"
}

ask() {
  local label="$1" answer
  read -r -p "  ${label} > " answer
  printf '%s' "$answer"
}

ask_default() {
  local label="$1" default_value="${2:-}" answer
  if [ -n "$default_value" ]; then
    read -r -p "  ${label} [${default_value}] > " answer
    [ -z "$answer" ] && answer="$default_value"
  else
    read -r -p "  ${label} > " answer
  fi
  printf '%s' "$answer"
}

ask_secret() {
  local label="$1" default_value="${2:-}" answer
  read -rs -p "  ${label} > " answer
  printf '\n' >&2
  if [ -z "$answer" ] && [ -n "$default_value" ]; then
    printf '%s' "$default_value"
  else
    printf '%s' "$answer"
  fi
}

confirm() {
  local label="$1" answer
  read -r -p "  ${label} [y/N] > " answer
  case "$answer" in
    y|Y|yes|Yes|YES) return 0 ;;
    *) return 1 ;;
  esac
}

is_domain() {
  local value="$1"
  [ -n "$value" ] || return 1
  [ "$value" != "localhost" ] || return 1
  case "$value" in
    */|http://*|https://*) return 1 ;;
  esac
  if [[ "$value" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    return 1
  fi
  [[ "$value" =~ ^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$ ]]
}

is_email() {
  local value="$1"
  [[ "$value" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]
}

is_google_client_id() {
  local value="$1"
  case "$value" in
    *.apps.googleusercontent.com)
      local prefix="${value%.apps.googleusercontent.com}"
      [ -n "$prefix" ]
      ;;
    *) return 1 ;;
  esac
}

is_client_secret() {
  local value="$1"
  [ -n "$value" ] || return 1
  case "$value" in
    *[[:space:]]*) return 1 ;;
  esac
  [ "${#value}" -ge 10 ]
}

gen_password() {
  ( LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32 ) || true
}

gen_stored_file_key() {
  ( dd if=/dev/urandom bs=32 count=1 2>/dev/null | base64 | tr -d '\n' ) || true
}

is_stored_file_key() {
  local value="$1"
  [[ "$value" =~ ^[A-Za-z0-9+/]{43}=$ ]]
}

is_stored_file_key_version() {
  local value="$1"
  [[ "$value" =~ ^v[1-9][0-9]{0,8}$ ]]
}

is_stored_file_keyring() {
  local active_version="$1" keyring="$2" entries_body entry version key found_active=0 seen_versions=""
  local -a entries
  is_stored_file_key_version "$active_version" || return 1
  [[ "$keyring" == \{*\} ]] || return 1
  entries_body="${keyring#\{}"
  entries_body="${entries_body%\}}"
  [ -n "$entries_body" ] || return 1
  IFS=',' read -r -a entries <<< "$entries_body"
  for entry in "${entries[@]}"; do
    if [[ "$entry" =~ ^\"(v[1-9][0-9]{0,8})\":\"([A-Za-z0-9+/]{43}=)\"$ ]]; then
      version="${BASH_REMATCH[1]}"
      key="${BASH_REMATCH[2]}"
    else
      return 1
    fi
    is_stored_file_key "$key" || return 1
    case ",$seen_versions," in
      *,"$version",*) return 1 ;;
    esac
    seen_versions="${seen_versions:+${seen_versions},}${version}"
    [ "$version" = "$active_version" ] && found_active=1
  done
  [ "$found_active" -eq 1 ]
}

env_get() {
  local key="$1" file="${2:-$ENV_FILE}" line
  [ -f "$file" ] || return 1
  line="$(grep -E "^${key}=" "$file" 2>/dev/null | tail -n1 || true)"
  [ -n "$line" ] || return 1
  printf '%s' "${line#*=}"
}

env_set() {
  local key="$1" value="$2" file="${3:-$ENV_FILE}" dir
  dir="$(dirname "$file")"
  mkdir -p "$dir"
  (
    umask 077
    local tmp
    tmp="$(mktemp "${dir}/.env.XXXXXX")"
    if [ -f "$file" ]; then
      awk -v k="$key" -v v="$value" '
        BEGIN { FS="="; done=0 }
        $1 == k { print k "=" v; done=1; next }
        { print }
        END { if (!done) print k "=" v }
      ' "$file" >"$tmp"
    else
      printf '%s=%s\n' "$key" "$value" >"$tmp"
    fi
    chmod 600 "$tmp"
    mv "$tmp" "$file"
  )
}

env_missing_keys() {
  local file="${1:-$ENV_FILE}" key missing=()
  for key in "${ENV_CONTRACT_KEYS[@]}"; do
    grep -Eq "^${key}=" "$file" 2>/dev/null || missing+=("$key")
  done
  printf '%s' "${missing[*]:-}"
}

env_file_complete() {
  local file="${1:-$ENV_FILE}"
  [ -f "$file" ] || return 1
  [ -z "$(env_missing_keys "$file")" ]
}

state_set() {
  local status="$1"
  (
    umask 077
    {
      printf 'STATUS=%s\n' "$status"
      printf 'TIMESTAMP=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    } >"$STATE_FILE"
    chmod 600 "$STATE_FILE"
  )
}

state_get() {
  local key="$1" line
  [ -f "$STATE_FILE" ] || return 1
  line="$(grep -E "^${key}=" "$STATE_FILE" 2>/dev/null | tail -n1 || true)"
  [ -n "$line" ] || return 1
  printf '%s' "${line#*=}"
}

format_date() {
  local iso="$1" with_time="${2:-0}" fmt='+%d/%m/%Y'
  [ "$with_time" = "1" ] && fmt='+%d/%m/%Y %H:%M'
  if date -d "$iso" "$fmt" >/dev/null 2>&1; then
    date -d "$iso" "$fmt"
    return 0
  fi
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$iso" "$with_time" <<'PY'
import sys, datetime
iso, with_time = sys.argv[1], sys.argv[2]
dt = datetime.datetime.strptime(iso, "%Y-%m-%dT%H:%M:%SZ")
fmt = "%d/%m/%Y %H:%M" if with_time == "1" else "%d/%m/%Y"
print(dt.strftime(fmt))
PY
    return 0
  fi
  printf '%s' "$iso"
}

stat_perms() {
  local file="$1"
  if stat -c '%a' "$file" >/dev/null 2>&1; then
    stat -c '%a' "$file"
  else
    stat -f '%A' "$file"
  fi
}

public_ip() {
  local url ip
  command -v curl >/dev/null 2>&1 || return 1
  for url in "https://api.ipify.org" "https://ifconfig.me/ip" "https://icanhazip.com"; do
    ip="$(curl -fsSL --max-time 5 "$url" 2>/dev/null | tr -d '[:space:]')"
    if [ -n "$ip" ]; then
      printf '%s' "$ip"
      return 0
    fi
  done
  return 1
}

resolve_domain() {
  local domain="$1"
  if command -v getent >/dev/null 2>&1; then
    getent hosts "$domain" 2>/dev/null | awk '{print $1; exit}'
    return 0
  fi
  if command -v dig >/dev/null 2>&1; then
    dig +short "$domain" A 2>/dev/null | head -n1
    return 0
  fi
  if command -v host >/dev/null 2>&1; then
    host "$domain" 2>/dev/null | awk '/has address/ {print $4; exit}'
    return 0
  fi
  return 1
}

port_in_use() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "[.:]${port}\$"
    return $?
  fi
  if command -v netstat >/dev/null 2>&1; then
    netstat -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "[.:]${port}\$"
    return $?
  fi
  return 2
}

size_to_bytes() {
  local value="$1" number unit
  number="${value%[KkMmGgTt]}"
  unit="${value:${#number}}"
  case "$unit" in
    "") printf '%s' "$number" ;;
    K|k) printf '%s' "$(( number * 1024 ))" ;;
    M|m) printf '%s' "$(( number * 1024 * 1024 ))" ;;
    G|g) printf '%s' "$(( number * 1024 * 1024 * 1024 ))" ;;
    T|t) printf '%s' "$(( number * 1024 * 1024 * 1024 * 1024 ))" ;;
    *) return 1 ;;
  esac
}

cpu_to_nanocpus() {
  awk -v value="$1" 'BEGIN { printf "%.0f", value * 1000000000 }'
}

compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

container_name() {
  printf 'ledgerly-%s-1' "$1"
}

container_status() {
  local status
  status="$(docker inspect --format '{{.State.Status}}' "$(container_name "$1")" 2>/dev/null | tr -d '[:space:]')"
  printf '%s' "${status:-absent}"
}

service_running() {
  [ "$(container_status "$1")" = "running" ]
}

require_installed() {
  if [ ! -f "$ENV_FILE" ]; then
    fail "There is no installation on this server (deploy/.env is missing)."
    printf '       → Run this first: make setup\n'
    exit 1
  fi
}

print_already_installed() {
  local when
  when="$(format_date "$(state_get TIMESTAMP 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)" 0)"
  fail "Ledgerly is already installed on this machine (${when})."
  printf '       → To change the domain or secrets: make configure\n'
  printf '       → To diagnose an issue:            make doctor\n'
  printf '       → To update the version:           make update\n'
}

require_not_installed() {
  if [ "${LEDGERLY_ALLOW_RESETUP:-0}" = "1" ]; then
    warn "LEDGERLY_ALLOW_RESETUP=1: skipping the existing installation check."
    printf '       No data will be deleted, but deploy/.env will be overwritten.\n'
    return 0
  fi

  local status
  status="$(state_get STATUS 2>/dev/null || printf '')"

  if [ "$status" = "completed" ]; then
    print_already_installed
    exit 1
  fi

  if [ "$status" != "in_progress" ] && [ -f "$ENV_FILE" ]; then
    if env_file_complete "$ENV_FILE" && service_running postgres; then
      local founder_count
      founder_count="$(compose exec -T postgres psql -U "$(env_get DB_USER)" -d "$(env_get DB_NAME)" -tAc \
        "SELECT count(*) FROM workspace_members WHERE is_founder" 2>/dev/null | tr -d '[:space:]' || printf '0')"
      if [ "$founder_count" = "1" ]; then
        state_set "completed"
        print_already_installed
        exit 1
      fi
    fi
  fi
}
