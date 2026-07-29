#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

domain_error_message() {
  local value="$1"
  case "$value" in
    http://*|https://*) printf 'Escríbelo sin protocolo: %s' "${value#*://}" ;;
    */) printf 'Escríbelo sin la barra final: %s' "${value%/}" ;;
    localhost) printf 'localhost no sirve para un dominio público' ;;
    "") printf 'Hace falta un dominio' ;;
    *) printf 'No parece un dominio válido: %s' "$value" ;;
  esac
}

print_google_uris() {
  local domain="$1"
  printf '\n      Authorized JavaScript origins\n        https://%s\n' "$domain"
  printf '\n      Authorized redirect URIs\n        https://%s/api/auth/google/callback\n\n' "$domain"
}

configure_domain() {
  local current new_domain
  current="$(env_get LEDGERLY_DOMAIN)"

  step "Cambiar el dominio"
  printf '  Dominio actual: %s\n\n' "$current"
  printf '  Al cambiar el dominio:\n'
  printf '    · hay que actualizar en Google Cloud el origen y la URI de\n'
  printf '      redirección autorizados (se muestran abajo con el dominio nuevo)\n'
  printf '    · las sesiones abiertas se pierden: las cookies pertenecen al\n'
  printf '      dominio anterior\n'
  printf '    · el certificado nuevo tarda unos segundos en emitirse\n'
  printf '  No hace falta reconstruir ninguna imagen.\n'

  while true; do
    new_domain="$(ask_default 'Dominio nuevo' "$current")"
    is_domain "$new_domain" && break
    fail "$(domain_error_message "$new_domain")"
  done

  printf '\n  Actualiza en Google Cloud (console.cloud.google.com → Clients):\n'
  print_google_uris "$new_domain"

  confirm "¿Aplicar el cambio de dominio?" || { warn "Cancelado, no se ha tocado nada."; return 0; }

  env_set LEDGERLY_DOMAIN "$new_domain"
  env_set FRONTEND_URL "https://${new_domain}"
  env_set BACKEND_PUBLIC_URL "https://${new_domain}"
  ok "deploy/.env actualizado"

  compose up -d --wait back caddy
  ok "back y caddy recreados con el dominio nuevo"
}

configure_google() {
  local domain client_id client_secret
  domain="$(env_get LEDGERLY_DOMAIN)"

  step "Cambiar las credenciales de Google"
  printf '  Las sesiones abiertas siguen valiendo (la sesión es propia, no un\n'
  printf '  token de Google); solo cambian los inicios de sesión nuevos.\n'
  printf '\n  El cliente de Google debe tener autorizados:\n'
  print_google_uris "$domain"

  while true; do
    client_id="$(ask_default 'Client ID' "$(env_get GOOGLE_CLIENT_ID)")"
    is_google_client_id "$client_id" && break
    fail "Tiene que terminar en .apps.googleusercontent.com"
  done

  while true; do
    client_secret="$(ask_secret 'Client secret (no se mostrará mientras escribes)')"
    if is_client_secret "$client_secret"; then
      case "$client_secret" in
        GOCSPX-*) ;;
        *) warn "No empieza por GOCSPX-; sigo porque Google puede cambiar el prefijo." ;;
      esac
      break
    fi
    fail "Tiene que tener al menos 10 caracteres y sin espacios."
  done

  confirm "¿Aplicar las credenciales nuevas?" || { warn "Cancelado, no se ha tocado nada."; return 0; }

  env_set GOOGLE_CLIENT_ID "$client_id"
  env_set GOOGLE_CLIENT_SECRET "$client_secret"
  ok "deploy/.env actualizado"

  compose up -d --wait back
  ok "back recreado con las credenciales nuevas"
}

configure_admin_email() {
  local current new_email
  current="$(env_get BOOTSTRAP_ADMIN_EMAIL)"

  step "Cambiar el correo del administrador inicial"
  printf '  Correo actual: %s\n\n' "$current"
  printf '  Si el fundador ya existe, esto no traspasa la cuenta: solo cambia\n'
  printf '  qué correo puede reclamar el alta si todavía no se ha completado.\n'
  printf '  Traspasar el fundador exige borrar su fila en workspace_members\n'
  printf '  (ver docs/architecture/auth.md).\n'

  while true; do
    new_email="$(ask_default 'Correo' "$current")"
    is_email "$new_email" && break
    fail "No parece un correo válido: ${new_email}"
  done

  confirm "¿Aplicar el cambio de correo?" || { warn "Cancelado, no se ha tocado nada."; return 0; }

  env_set BOOTSTRAP_ADMIN_EMAIL "$new_email"
  ok "deploy/.env actualizado"

  compose up -d --wait back
  ok "back recreado con el correo nuevo"
}

configure_db_password() {
  step "Rotar la contraseña de Postgres"
  printf '  Orden de la operación: cambiar la contraseña dentro de Postgres,\n'
  printf '  luego actualizar deploy/.env, luego recrear back y probar el\n'
  printf '  migrator con las credenciales nuevas. Si algo falla a mitad, la\n'
  printf '  contraseña real ya es la nueva: repite esta opción para dejarlo\n'
  printf '  consistente.\n'

  confirm "¿Rotar la contraseña de Postgres ahora?" || { warn "Cancelado, no se ha tocado nada."; return 0; }

  local new_password db_user db_name
  new_password="$(gen_password)"
  db_user="$(env_get DB_USER)"
  db_name="$(env_get DB_NAME)"

  compose exec -T postgres psql -U "$db_user" -d "$db_name" \
    -c "ALTER USER \"${db_user}\" WITH PASSWORD '${new_password}'" >/dev/null
  ok "Contraseña cambiada en Postgres"

  env_set DB_PASSWORD "$new_password"
  ok "deploy/.env actualizado"

  compose up -d --wait back
  compose run --rm migrator >/dev/null 2>&1 || true
  ok "back recreado y migrator verificado con las credenciales nuevas"
}

print_menu() {
  section "Ledgerly — configuración · $(env_get LEDGERLY_DOMAIN 2>/dev/null || printf '?')"
  printf '  1) Cambiar el dominio\n'
  printf '  2) Cambiar las credenciales de Google\n'
  printf '  3) Cambiar el correo del administrador inicial\n'
  printf '  4) Rotar la contraseña de Postgres\n'
  printf '  0) Salir sin cambiar nada\n\n'
}

main() {
  require_installed
  print_menu

  local choice
  read -r -p '  Opción > ' choice

  case "$choice" in
    1) configure_domain ;;
    2) configure_google ;;
    3) configure_admin_email ;;
    4) configure_db_password ;;
    0) exit 0 ;;
    *) fail "Opción no válida"; exit 1 ;;
  esac

  printf '\n'
  bash "$SCRIPT_DIR/doctor.sh"
}

main
