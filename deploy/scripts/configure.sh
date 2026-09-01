#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

domain_error_message() {
  local value="$1"
  case "$value" in
    http://*|https://*) printf 'Enter it without the protocol: %s' "${value#*://}" ;;
    */) printf 'Enter it without the trailing slash: %s' "${value%/}" ;;
    localhost) printf 'localhost cannot be used as a public domain' ;;
    "") printf 'A domain is required' ;;
    *) printf 'This does not look like a valid domain: %s' "$value" ;;
  esac
}

print_google_uris() {
  local domain="$1"
  printf '\n      Authorized JavaScript origins\n        https://%s\n' "$domain"
  printf '\n      Authorized redirect URIs\n        https://%s/api/auth/callback/google\n\n' "$domain"
}

configure_domain() {
  local current new_domain
  current="$(env_get LEDGERLY_DOMAIN)"

  step "Change domain"
  printf '  Current domain: %s\n\n' "$current"
  printf '  When changing the domain:\n'
  printf '    · update the authorized origin and redirect URI in Google Cloud\n'
  printf '      (shown below with the new domain)\n'
  printf '    · active sessions are lost because cookies belong to the\n'
  printf '      previous domain\n'
  printf '    · the new certificate takes a few seconds to issue\n'
  printf '  No image rebuild is required.\n'

  while true; do
    new_domain="$(ask_default 'New domain' "$current")"
    is_domain "$new_domain" && break
    fail "$(domain_error_message "$new_domain")"
  done

  printf '\n  Update Google Cloud (console.cloud.google.com → Clients):\n'
  print_google_uris "$new_domain"

  confirm "Apply the domain change?" || { warn "Cancelled, nothing was changed."; return 0; }

  env_set LEDGERLY_DOMAIN "$new_domain"
  env_set FRONTEND_URL "https://${new_domain}"
  env_set BACKEND_PUBLIC_URL "https://${new_domain}"
  ok "deploy/.env updated"

  compose up -d --wait back caddy
  ok "back and caddy recreated with the new domain"
}

configure_google() {
  local domain client_id client_secret
  domain="$(env_get LEDGERLY_DOMAIN)"

  step "Change Google credentials"
  printf '  Existing sessions remain valid (the session is ours, not a Google\n'
  printf '  token); only new sign-ins change.\n'
  printf '\n  The Google client must authorize:\n'
  print_google_uris "$domain"

  while true; do
    client_id="$(ask_default 'Client ID' "$(env_get GOOGLE_CLIENT_ID)")"
    is_google_client_id "$client_id" && break
    fail "It must end with .apps.googleusercontent.com"
  done

  while true; do
    client_secret="$(ask_secret 'Client secret (hidden while you type)')"
    if is_client_secret "$client_secret"; then
      case "$client_secret" in
        GOCSPX-*) ;;
        *) warn "It does not start with GOCSPX-; continuing because Google may change the prefix." ;;
      esac
      break
    fi
    fail "It must contain at least 10 characters and no spaces."
  done

  confirm "Apply the new credentials?" || { warn "Cancelled, nothing was changed."; return 0; }

  env_set GOOGLE_CLIENT_ID "$client_id"
  env_set GOOGLE_CLIENT_SECRET "$client_secret"
  ok "deploy/.env updated"

  compose up -d --wait back
  ok "back recreated with the new credentials"
}

configure_admin_email() {
  local current new_email
  current="$(env_get BOOTSTRAP_ADMIN_EMAIL)"

  step "Change initial administrator email"
  printf '  Current email: %s\n\n' "$current"
  printf '  If the founder already exists, this does not transfer the account: it only\n'
  printf '  changes which email can claim registration if setup is not complete yet.\n'
  printf '  Transferring the founder requires deleting their row in workspace_members\n'
  printf '  (see docs/architecture/auth.md).\n'

  while true; do
    new_email="$(ask_default 'Email' "$current")"
    is_email "$new_email" && break
    fail "This does not look like a valid email: ${new_email}"
  done

  confirm "Apply the email change?" || { warn "Cancelled, nothing was changed."; return 0; }

  env_set BOOTSTRAP_ADMIN_EMAIL "$new_email"
  ok "deploy/.env updated"

  compose up -d --wait back
  ok "back recreated with the new email"
}

configure_db_password() {
  step "Rotate Postgres password"
  printf '  Operation order: change the password inside Postgres, then update\n'
  printf '  deploy/.env, then recreate back and test migrator with the new\n'
  printf '  credentials. If something fails midway, the database password has\n'
  printf '  already changed: repeat this option to make it consistent.\n'

  confirm "Rotate the Postgres password now?" || { warn "Cancelled, nothing was changed."; return 0; }

  local new_password db_user db_name
  new_password="$(gen_password)"
  db_user="$(env_get DB_USER)"
  db_name="$(env_get DB_NAME)"

  compose exec -T postgres psql -U "$db_user" -d "$db_name" \
    -c "ALTER USER \"${db_user}\" WITH PASSWORD '${new_password}'" >/dev/null
  ok "Password changed in Postgres"

  env_set DB_PASSWORD "$new_password"
  ok "deploy/.env updated"

  compose up -d --wait back
  if compose run --rm migrator >/dev/null 2>&1; then
    ok "back recreated and migrator verified with the new credentials"
  else
    fail "The new database password could not be verified by the migrator"
    printf '       → Run make MODE=production logs SERVICE=back and inspect the migrator output.\n'
    return 1
  fi
}

print_menu() {
  section "Ledgerly — configuration · $(env_get LEDGERLY_DOMAIN 2>/dev/null || printf '?')"
  printf '  1) Change domain\n'
  printf '  2) Change Google credentials\n'
  printf '  3) Change initial administrator email\n'
  printf '  4) Rotate Postgres password\n'
  printf '  0) Exit without making changes\n\n'
}

main() {
  require_installed
  print_menu

  local choice
  read -r -p '  Option > ' choice

  case "$choice" in
    1) configure_domain ;;
    2) configure_google ;;
    3) configure_admin_email ;;
    4) configure_db_password ;;
    0) exit 0 ;;
    *) fail "Invalid option"; exit 1 ;;
  esac

  printf '\n'
  bash "$SCRIPT_DIR/doctor.sh"
}

main
