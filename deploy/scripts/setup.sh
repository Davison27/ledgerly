#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"
# shellcheck source=deploy/scripts/preflight.sh
source "$SCRIPT_DIR/preflight.sh"

PROGRESS_WIDTH=58

progress_start() {
  local label="$1" dots_len dots=""
  dots_len=$(( PROGRESS_WIDTH - ${#label} ))
  [ "$dots_len" -gt 0 ] && dots="$(printf '%*s' "$dots_len" '' | tr ' ' '.')"
  printf '  → %s %s ' "$label" "$dots"
}

progress_done() { printf '%s\n' "${1:-done}"; }
progress_fail() { printf '%s\n' "${1:-failed}"; }

SUMMARY_LABEL_WIDTH=24

summary_row() {
  local label="$1" value="$2" pad_len pad=""
  pad_len=$(( SUMMARY_LABEL_WIDTH - ${#label} ))
  [ "$pad_len" -gt 0 ] && pad="$(printf '%*s' "$pad_len" '')"
  printf '    %s%s %s\n' "$label" "$pad" "$value"
}

run_step_quiet() {
  local label="$1"
  shift
  local logfile
  logfile="$(mktemp)"
  progress_start "$label"
  if "$@" >"$logfile" 2>&1; then
    progress_done
    rm -f "$logfile"
  else
    progress_fail
    printf '\n'
    cat "$logfile"
    rm -f "$logfile"
    fail "${label} failed. The state remains in_progress: run \"make setup\" again to retry from here."
    exit 1
  fi
}

print_intro() {
  section "Ledgerly — installation"
  cat <<'EOF'
  This will set up Ledgerly on this server, with HTTPS and automatic
  certificate renewal.

  You need two things ready:
    · a domain with a DNS record pointing to this machine
    · a Google Cloud account to create sign-in credentials

  Nothing changes until you confirm the summary: you can press Ctrl-C
  safely.
EOF
}

print_resume_notice() {
  local when
  when="$(format_date "$(state_get TIMESTAMP)" 1)"
  warn "An incomplete installation from ${when} was found."
  printf '       Resuming where it stopped; values already entered appear in brackets\n'
  printf '       and pressing Enter keeps them.\n'
}

domain_error_message() {
  local value="$1"
  case "$value" in
    http://*|https://*)
      printf 'Enter it without the protocol: %s' "${value#*://}"
      ;;
    */)
      printf 'Enter it without the trailing slash: %s' "${value%/}"
      ;;
    localhost)
      printf 'localhost cannot be used as a public domain'
      ;;
    "")
      printf 'A domain is required'
      ;;
    *)
      if [[ "$value" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        printf 'A domain is required, not an IP address'
      else
        printf 'This does not look like a valid domain: %s' "$value"
      fi
      ;;
  esac
}

ask_domain() {
  local default_domain="$1" my_ip="$2" domain resolved
  while true; do
    domain="$(ask_default 'Domain' "$default_domain")"
    if ! is_domain "$domain"; then
      fail "$(domain_error_message "$domain")" >&2
      continue
    fi

    resolved="$(resolve_domain "$domain" || true)"

    if [ -z "$resolved" ]; then
      warn "${domain} could not be resolved yet. DNS propagation may take time." >&2
      confirm "Continue anyway?" && break
      continue
    fi

    if [ -n "$my_ip" ] && [ "$resolved" = "$my_ip" ]; then
      ok "${domain} resolves to ${resolved} (this machine)" >&2
      break
    fi

    warn "${domain} resolves to ${resolved}, not this machine's detected IP${my_ip:+ (${my_ip})}" >&2
    printf '       This may be expected when Cloudflare or another proxy is in front.\n' >&2
    confirm "Continue anyway?" && break
  done
  printf '%s' "$domain"
}

detect_timezone() {
  if command -v timedatectl >/dev/null 2>&1; then
    local tz
    tz="$(timedatectl show -p Timezone --value 2>/dev/null || true)"
    [ -n "$tz" ] && { printf '%s' "$tz"; return 0; }
  fi
  if [ -r /etc/timezone ]; then
    printf '%s' "$(cat /etc/timezone)"
    return 0
  fi
  if [ -L /etc/localtime ]; then
    local link
    link="$(readlink /etc/localtime)"
    printf '%s' "${link#*zoneinfo/}"
    return 0
  fi
  printf 'UTC'
}

write_env_file() {
  local domain="$1" admin_email="$2" timezone="$3" db_password="$4"
  local google_client_id="$5" google_client_secret="$6" auth_secret="$7"
  local stored_file_active_version="$8" stored_file_keyring="$9"
  env_set LEDGERLY_DOMAIN "$domain"
  env_set ACME_EMAIL "$admin_email"
  env_set TZ "$timezone"
  env_set NODE_ENV "production"
  env_set PORT "3000"
  env_set FRONTEND_URL "https://${domain}"
  env_set BACKEND_PUBLIC_URL "https://${domain}"
  env_set COOKIE_SECURE "true"
  env_set TRUST_PROXY "true"
  env_set STORED_FILE_ACTIVE_KEY_VERSION "$stored_file_active_version"
  env_set STORED_FILE_KEYS "$stored_file_keyring"
  env_set DB_HOST "postgres"
  env_set DB_PORT "5432"
  env_set DB_NAME "ledgerly"
  env_set DB_USER "ledgerly"
  env_set DB_PASSWORD "$db_password"
  env_set DB_TYPEORM_POOL_MAX "8"
  env_set DB_AUTH_POOL_MAX "4"
  env_set DB_MIGRATOR_POOL_MAX "2"
  env_set DB_IDLE_TIMEOUT_MS "30000"
  env_set DB_CONNECTION_TIMEOUT_MS "5000"
  env_set DB_STATEMENT_TIMEOUT_MS "30000"
  env_set DB_QUERY_TIMEOUT_MS "30000"
  env_set DB_CONNECTION_BUDGET "17"
  env_set MAX_LIST_ITEMS "500"
  env_set MAX_PROJECT_EQUIPMENT_PER_PROJECT "100"
  env_set MAX_CALENDAR_RANGE_DAYS "366"
  env_set MAX_CALENDAR_RESULTS "1000"
  env_set BETTER_AUTH_SECRET "$auth_secret"
  env_set GOOGLE_CLIENT_ID "$google_client_id"
  env_set GOOGLE_CLIENT_SECRET "$google_client_secret"
  env_set BOOTSTRAP_ADMIN_EMAIL "$admin_email"
  env_set PDF_OCR_ENABLED "true"
  env_set PDF_OCR_LANGUAGE "spa"
  env_set PDF_MAX_PAGES "100"
  env_set PDF_OCR_MAX_PAGES "12"
  env_set PDF_OCR_TIMEOUT_SECONDS "90"
  env_set PDF_UPLOAD_MAX_ACTIVE "4"
  env_set PDF_UPLOAD_MAX_QUEUED "16"
  env_set PDF_UPLOAD_QUEUE_TIMEOUT_MS "15000"
  env_set PDF_READER_MAX_ACTIVE "2"
  env_set PDF_READER_MAX_QUEUED "8"
  env_set PDF_READER_QUEUE_TIMEOUT_MS "30000"
  env_set PDF_RETRY_AFTER_SECONDS "15"
  env_set PDF_MAX_EXTRACTED_TEXT_BYTES "2097152"
  env_set PDF_MAX_ATTACHMENTS "20"
  env_set PDF_MAX_ATTACHMENT_BYTES "5242880"
  env_set PDF_MAX_TOTAL_ATTACHMENT_BYTES "20971520"
  env_set PDF_MAX_OCR_OUTPUT_BYTES "20971520"
  env_set DEPLOY_BACK_CPUS "1.0"
  env_set DEPLOY_BACK_MEMORY "768m"
  env_set DEPLOY_FRONT_CPUS "0.5"
  env_set DEPLOY_FRONT_MEMORY "128m"
  env_set DEPLOY_POSTGRES_CPUS "1.0"
  env_set DEPLOY_POSTGRES_MEMORY "512m"
  env_set DEPLOY_POSTGRES_SHM_SIZE "128m"
  env_set DEPLOY_TMPFS_SIZE "256m"
  env_set DEPLOY_FRONT_TMPFS_SIZE "64m"
  env_set DEPLOY_PIDS_LIMIT "256"
  env_set DEPLOY_POSTGRES_PIDS_LIMIT "256"
  env_set DEPLOY_FRONT_PIDS_LIMIT "128"
  env_set DEPLOY_MIGRATOR_PIDS_LIMIT "128"
  chmod 600 "$ENV_FILE"
}

main() {
  require_not_installed

  local resuming=0
  local resume_status
  resume_status="$(state_get STATUS 2>/dev/null || printf '')"
  [ "$resume_status" = "in_progress" ] && resuming=1

  print_intro

  step "[1/6] Preflight checks"
  if ! run_preflight; then
    printf '\n'
    fail "Some preflight checks are unresolved. Fix them and run \"make setup\" again."
    exit 1
  fi

  [ "$resuming" -eq 1 ] && { printf '\n'; print_resume_notice; }

  local default_domain="" default_admin_email="" default_client_id=""
  local default_client_secret="" default_tz=""
  if [ "$resuming" -eq 1 ]; then
    default_domain="$(env_get LEDGERLY_DOMAIN || printf '')"
    default_admin_email="$(env_get BOOTSTRAP_ADMIN_EMAIL || printf '')"
    default_client_id="$(env_get GOOGLE_CLIENT_ID || printf '')"
    default_client_secret="$(env_get GOOGLE_CLIENT_SECRET || printf '')"
    default_tz="$(env_get TZ || printf '')"
  fi

  step "[2/6] Domain"
  local this_ip
  this_ip="$(public_ip || true)"
  printf '  This is the public address used to access Ledgerly. An A (or AAAA)\n'
  printf '  record pointing to this server IP must already exist.\n'
  if [ -n "$this_ip" ]; then
    printf '  Detected server IP: %s. Enter it without https:// or a trailing slash.\n' "$this_ip"
  else
    printf '  Enter it without https:// or a trailing slash.\n'
  fi
  printf '\n'
  local domain
  domain="$(ask_domain "$default_domain" "$this_ip")"

  step "[3/6] Google credentials"
  cat <<'EOF'
  Ledgerly uses Google sign-in only, so you need your own OAuth client.
  Open https://console.cloud.google.com and:

    1. Create or select a project.
    2. Google Auth Platform → Branding: set the name to "Ledgerly" and add your email.
    3. Audience: External. If the project remains in Testing mode,
       add yourself as a test user or your own sign-in will fail.
    4. Data access: only openid, userinfo.email, and userinfo.profile.
       Do not add Calendar, Drive, or Gmail.
    5. Clients → Create client → Web application.

  Copy these two values EXACTLY into that client:

      Authorized JavaScript origins
EOF
  printf '        https://%s\n\n' "$domain"
  printf '      Authorized redirect URIs\n'
  printf '        https://%s/api/auth/callback/google\n\n' "$domain"
  cat <<'EOF'
  Use https, no trailing slash, and the exact same domain. If any character
  differs, Google will return "redirect_uri_mismatch" when you try to sign in.
EOF
  printf '\n'
  local _unused
  read -r -p '  Press Enter once you have saved it in Google Cloud...' _unused
  printf '\n'

  local google_client_id
  while true; do
    google_client_id="$(ask_default 'Client ID' "$default_client_id")"
    is_google_client_id "$google_client_id" && break
    fail "It must end with .apps.googleusercontent.com"
  done

  local google_client_secret secret_label="Client secret (hidden while you type)"
  while true; do
    google_client_secret="$(ask_secret "$secret_label" "$default_client_secret")"
    if is_client_secret "$google_client_secret"; then
      case "$google_client_secret" in
        GOCSPX-*) ;;
        *) warn "It does not start with GOCSPX-; continuing because Google may change the prefix." ;;
      esac
      break
    fi
    fail "It must contain at least 10 characters and no spaces."
  done
  ok "Credentials saved"

  step "[4/6] Initial administrator"
  cat <<'EOF'
  The Google account email that will administer the workspace. It is the
  only email allowed to claim this installation; the rest of the team will
  join later by invitation. It will also receive Let's Encrypt certificate
  notices.
EOF
  printf '\n'
  local admin_email
  while true; do
    admin_email="$(ask_default 'Email' "$default_admin_email")"
    is_email "$admin_email" && break
    fail "This does not look like a valid email: ${admin_email}"
  done
  printf '\n'
  local timezone
  timezone="$(ask_default 'Time zone' "${default_tz:-$(detect_timezone)}")"

  local db_password
  if [ "$resuming" -eq 1 ]; then
    db_password="$(env_get DB_PASSWORD || gen_password)"
  else
    db_password="$(gen_password)"
  fi

  local auth_secret
  if [ "$resuming" -eq 1 ]; then
    auth_secret="$(env_get BETTER_AUTH_SECRET || gen_password)"
  else
    auth_secret="$(gen_password)"
  fi

  local stored_file_active_version stored_file_keyring stored_file_summary
  if [ "$resuming" -eq 1 ]; then
    stored_file_active_version="$(env_get STORED_FILE_ACTIVE_KEY_VERSION || true)"
    stored_file_keyring="$(env_get STORED_FILE_KEYS || true)"
    if ! is_stored_file_keyring "$stored_file_active_version" "$stored_file_keyring"; then
      fail "Stored file encryption configuration is missing or invalid. Restore the existing values before resuming setup."
      exit 1
    fi
    stored_file_summary="existing configuration preserved"
  else
    stored_file_active_version="v1"
    local stored_file_key
    stored_file_key="$(gen_stored_file_key)"
    stored_file_keyring="{\"v1\":\"${stored_file_key}\"}"
    if ! is_stored_file_keyring "$stored_file_active_version" "$stored_file_keyring"; then
      fail "Could not generate a valid stored file encryption key."
      exit 1
    fi
    stored_file_summary="generated, 32 random bytes"
  fi

  step "[5/6] Summary"
  summary_row "Domain" "$domain"
  summary_row "Final URL" "https://${domain}"
  summary_row "Initial administrator" "$admin_email"
  summary_row "Google client" "$google_client_id"
  summary_row "Client secret" "saved (never shown)"
  summary_row "Postgres password" "generated, 32 random characters"
  summary_row "Authentication secret" "generated, 32 random characters"
  summary_row "Stored file key" "$stored_file_summary"
  summary_row "Data" "docker volume ledgerly_pgdata"
  summary_row "Configuration" "deploy/.env, readable only by your user"
  cat <<'EOF'

  Next, images will be built (5–10 minutes the first time), services
  will be started, and migrations will be applied.
EOF
  printf '\n'
  if ! confirm "Continue?"; then
    printf '\n'
    warn "Cancelled. Nothing was written."
    exit 0
  fi

  step "[6/6] Installing"

  progress_start "Writing deploy/.env"
  write_env_file "$domain" "$admin_email" "$timezone" "$db_password" \
    "$google_client_id" "$google_client_secret" "$auth_secret" "$stored_file_active_version" "$stored_file_keyring"
  state_set "in_progress"
  progress_done

  run_step_quiet "Validating the Compose configuration" compose config --quiet
  run_step_quiet "Building the backend image" compose build back
  run_step_quiet "Building the frontend image" compose build front

  progress_start "Starting Postgres"
  if compose up -d --wait postgres >/dev/null 2>&1; then
    progress_done "healthy"
  else
    progress_fail
    fail "Postgres did not start healthy. The state remains in_progress: run \"make setup\" again."
    exit 1
  fi

  progress_start "Applying migrations"
  local migration_log applied
  migration_log="$(mktemp)"
  if compose run --rm migrator node dist/database/migrate.js --mode=auto >"$migration_log" 2>&1; then
    applied="$(grep -c 'has been executed successfully' "$migration_log" || true)"
    rm -f "$migration_log"
    progress_done "${applied} applied"
  else
    progress_fail
    printf '\n'
    cat "$migration_log"
    rm -f "$migration_log"
    fail "Migrations failed. The state remains in_progress: run \"make setup\" again."
    exit 1
  fi

  progress_start "Starting backend, frontend, and proxy"
  if compose up -d --wait back front caddy >/dev/null 2>&1; then
    progress_done "healthy"
  else
    progress_fail
    fail "A service did not start healthy. \"make doctor\" shows what is missing; the state remains in_progress."
    exit 1
  fi

  progress_start "Requesting the Let's Encrypt certificate"
  local cert_ready=0 _retry
  for _retry in $(seq 1 45); do
    if compose logs caddy 2>/dev/null | grep -qi "certificate obtained successfully"; then
      cert_ready=1
      break
    fi
    sleep 2
  done
  if [ "$cert_ready" -eq 1 ]; then
    progress_done "issued"
  else
    progress_fail "unconfirmed"
    warn "The certificate-issued message has not appeared in the Caddy logs yet."
    printf '       → docker compose -f deploy/docker-compose.yml --env-file deploy/.env logs caddy\n'
  fi

  progress_start "https://${domain}/api/health/ready"
  local health_ok=0 status="" _retry
  for _retry in $(seq 1 30); do
    status="$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 5 "https://${domain}/api/health/ready" 2>/dev/null || true)"
    if [ "$status" = "200" ]; then
      health_ok=1
      break
    fi
    sleep 2
  done
  if [ "$health_ok" -eq 1 ]; then
    progress_done "$status"
  else
    progress_fail "${status:-no response}"
    printf '\n'
    fail "The installation has not finished starting."
    printf '       → \"make doctor\" shows what is missing. The state remains in_progress: run \"make setup\" again to continue.\n'
    exit 1
  fi

  state_set "completed"

  section "Ledgerly is running"
  printf '\n'
  printf '    Open       https://%s\n' "$domain"
  printf '    Sign in as %s\n' "$admin_email"
  cat <<'EOF'

  The first screen will ask for that email to create the administrator
  account, then it will collect company details.

  Next steps
    make doctor      checks that everything remains healthy
    make update      fetches a new version without data loss
    make configure   changes the domain, credentials, or administrator

  make setup cannot be run again on this machine.
EOF
}

main "$@"
