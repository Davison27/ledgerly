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

progress_done() { printf '%s\n' "${1:-hecho}"; }
progress_fail() { printf '%s\n' "${1:-falló}"; }

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
    fail "${label} ha fallado. El estado queda en in_progress: repite \"make setup\" para reintentar desde aquí."
    exit 1
  fi
}

print_intro() {
  section "Ledgerly — instalación"
  cat <<'EOF'
  Voy a dejar Ledgerly funcionando en este servidor, con HTTPS y
  renovación automática del certificado.

  Necesitas dos cosas a mano:
    · un dominio con un registro DNS apuntando a esta máquina
    · una cuenta de Google Cloud para crear las credenciales de acceso

  Hasta que confirmes el resumen no se toca nada: puedes cortar con
  Ctrl-C sin consecuencias.
EOF
}

print_resume_notice() {
  local when
  when="$(format_es_date "$(state_get TIMESTAMP)" 1)"
  warn "Hay una instalación a medias del ${when}."
  printf '       Retomo desde donde se quedó; entre corchetes verás lo ya\n'
  printf '       contestado y con Enter lo mantienes.\n'
}

domain_error_message() {
  local value="$1"
  case "$value" in
    http://*|https://*)
      printf 'Escríbelo sin protocolo: %s' "${value#*://}"
      ;;
    */)
      printf 'Escríbelo sin la barra final: %s' "${value%/}"
      ;;
    localhost)
      printf 'localhost no sirve para un dominio público'
      ;;
    "")
      printf 'Hace falta un dominio'
      ;;
    *)
      if [[ "$value" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        printf 'Hace falta un dominio, no una IP'
      else
        printf 'No parece un dominio válido: %s' "$value"
      fi
      ;;
  esac
}

ask_domain() {
  local default_domain="$1" my_ip="$2" domain resolved
  while true; do
    domain="$(ask_default 'Dominio' "$default_domain")"
    if ! is_domain "$domain"; then
      fail "$(domain_error_message "$domain")" >&2
      continue
    fi

    resolved="$(resolve_domain "$domain" || true)"

    if [ -z "$resolved" ]; then
      warn "No he podido resolver ${domain} todavía. Puede tardar en propagarse." >&2
      confirm "¿Continuar de todas formas?" && break
      continue
    fi

    if [ -n "$my_ip" ] && [ "$resolved" = "$my_ip" ]; then
      ok "${domain} resuelve a ${resolved} (esta máquina)" >&2
      break
    fi

    warn "${domain} resuelve a ${resolved}, no a la IP detectada de esta máquina${my_ip:+ (${my_ip})}" >&2
    printf '       Puede ser normal si tienes Cloudflare u otro proxy delante.\n' >&2
    confirm "¿Continuar de todas formas?" && break
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
  local google_client_id="$5" google_client_secret="$6"
  env_set LEDGERLY_DOMAIN "$domain"
  env_set ACME_EMAIL "$admin_email"
  env_set TZ "$timezone"
  env_set NODE_ENV "production"
  env_set PORT "3000"
  env_set FRONTEND_URL "https://${domain}"
  env_set BACKEND_PUBLIC_URL "https://${domain}"
  env_set COOKIE_SECURE "true"
  env_set TRUST_PROXY "true"
  env_set DB_HOST "postgres"
  env_set DB_PORT "5432"
  env_set DB_NAME "ledgerly"
  env_set DB_USER "ledgerly"
  env_set DB_PASSWORD "$db_password"
  env_set GOOGLE_CLIENT_ID "$google_client_id"
  env_set GOOGLE_CLIENT_SECRET "$google_client_secret"
  env_set BOOTSTRAP_ADMIN_EMAIL "$admin_email"
  chmod 600 "$ENV_FILE"
}

main() {
  require_not_installed

  local resuming=0
  local resume_status
  resume_status="$(state_get STATUS 2>/dev/null || printf '')"
  [ "$resume_status" = "in_progress" ] && resuming=1

  print_intro

  step "[1/6] Comprobaciones previas"
  if ! run_preflight; then
    printf '\n'
    fail "Hay comprobaciones previas sin resolver. Corrígelas y vuelve a ejecutar \"make setup\"."
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

  step "[2/6] Dominio"
  local this_ip
  this_ip="$(public_ip || true)"
  printf '  Es la dirección pública por la que se entrará a Ledgerly. Debe\n'
  printf '  existir ya un registro A (o AAAA) apuntando a la IP de este\n'
  if [ -n "$this_ip" ]; then
    printf '  servidor: %s. Escríbelo sin https:// y sin barra final.\n' "$this_ip"
  else
    printf '  servidor. Escríbelo sin https:// y sin barra final.\n'
  fi
  printf '\n'
  local domain
  domain="$(ask_domain "$default_domain" "$this_ip")"

  step "[3/6] Credenciales de Google"
  cat <<'EOF'
  A Ledgerly solo se entra con cuenta de Google, así que hace falta
  un cliente OAuth propio. Abre https://console.cloud.google.com y:

    1. Crea o elige un proyecto.
    2. Google Auth Platform → Branding: nombre "Ledgerly" y tu correo.
    3. Audience: External. Si el proyecto sigue en modo Testing,
       añádete como Test user o tu propio acceso fallará.
    4. Data access: solo openid, userinfo.email y userinfo.profile.
       No añadas Calendar, Drive ni Gmail.
    5. Clients → Create client → Web application.

  Copia EXACTAMENTE estos dos valores en ese cliente:

      Authorized JavaScript origins
EOF
  printf '        https://%s\n\n' "$domain"
  printf '      Authorized redirect URIs\n'
  printf '        https://%s/api/auth/google/callback\n\n' "$domain"
  cat <<'EOF'
  Con https, sin barra final y con el dominio idéntico. Si no coincide
  carácter a carácter, Google contestará "redirect_uri_mismatch" al
  intentar entrar.
EOF
  printf '\n'
  local _unused
  read -r -p '  Pulsa Enter cuando lo tengas guardado en Google Cloud...' _unused
  printf '\n'

  local google_client_id
  while true; do
    google_client_id="$(ask_default 'Client ID' "$default_client_id")"
    is_google_client_id "$google_client_id" && break
    fail "Tiene que terminar en .apps.googleusercontent.com"
  done

  local google_client_secret secret_label="Client secret (no se mostrará mientras escribes)"
  while true; do
    google_client_secret="$(ask_secret "$secret_label" "$default_client_secret")"
    if is_client_secret "$google_client_secret"; then
      case "$google_client_secret" in
        GOCSPX-*) ;;
        *) warn "No empieza por GOCSPX-; sigo porque Google puede cambiar el prefijo." ;;
      esac
      break
    fi
    fail "Tiene que tener al menos 10 caracteres y sin espacios."
  done
  ok "Credenciales guardadas"

  step "[4/6] Administrador inicial"
  cat <<'EOF'
  Correo de la cuenta de Google que administrará el espacio. Es el
  único correo que podrá reclamar esta instalación; el resto del
  equipo entrará después por invitación. Se usará también para los
  avisos de Let's Encrypt sobre el certificado.
EOF
  printf '\n'
  local admin_email
  while true; do
    admin_email="$(ask_default 'Correo' "$default_admin_email")"
    is_email "$admin_email" && break
    fail "No parece un correo válido: ${admin_email}"
  done
  printf '\n'
  local timezone
  timezone="$(ask_default 'Zona horaria' "${default_tz:-$(detect_timezone)}")"

  local db_password
  if [ "$resuming" -eq 1 ]; then
    db_password="$(env_get DB_PASSWORD || gen_password)"
  else
    db_password="$(gen_password)"
  fi

  step "[5/6] Resumen"
  summary_row "Dominio" "$domain"
  summary_row "URL final" "https://${domain}"
  summary_row "Administrador inicial" "$admin_email"
  summary_row "Cliente de Google" "$google_client_id"
  summary_row "Client secret" "guardado (no se mostrará nunca)"
  summary_row "Contraseña de Postgres" "generada, 32 caracteres aleatorios"
  summary_row "Datos" "volumen docker ledgerly_pgdata"
  summary_row "Configuración" "deploy/.env, solo lectura para tu usuario"
  cat <<'EOF'

  Ahora construiré las imágenes (5-10 minutos la primera vez),
  levantaré los servicios y aplicaré las migraciones.
EOF
  printf '\n'
  if ! confirm "¿Continúo?"; then
    printf '\n'
    warn "Cancelado. No se ha escrito nada."
    exit 0
  fi

  step "[6/6] Instalando"

  progress_start "Escribiendo deploy/.env"
  write_env_file "$domain" "$admin_email" "$timezone" "$db_password" \
    "$google_client_id" "$google_client_secret"
  state_set "in_progress"
  progress_done

  run_step_quiet "Construyendo la imagen del backend" compose build back
  run_step_quiet "Construyendo la imagen del frontend" compose build front

  progress_start "Levantando Postgres"
  if compose up -d --wait postgres >/dev/null 2>&1; then
    progress_done "sano"
  else
    progress_fail
    fail "Postgres no ha arrancado sano. El estado queda en in_progress: repite \"make setup\"."
    exit 1
  fi

  progress_start "Aplicando migraciones"
  local migration_log applied
  migration_log="$(mktemp)"
  if compose run --rm migrator >"$migration_log" 2>&1; then
    applied="$(grep -c 'has been executed successfully' "$migration_log" || true)"
    rm -f "$migration_log"
    progress_done "${applied} hecho"
  else
    progress_fail
    printf '\n'
    cat "$migration_log"
    rm -f "$migration_log"
    fail "Las migraciones han fallado. El estado queda en in_progress: repite \"make setup\"."
    exit 1
  fi

  progress_start "Levantando backend, frontend y proxy"
  if compose up -d --wait back front caddy >/dev/null 2>&1; then
    progress_done "sano"
  else
    progress_fail
    fail "Algún servicio no ha arrancado sano. \"make doctor\" detalla qué falta; el estado queda en in_progress."
    exit 1
  fi

  progress_start "Pidiendo el certificado a Let's Encrypt"
  local cert_ready=0 _retry
  for _retry in $(seq 1 45); do
    if compose logs caddy 2>/dev/null | grep -qi "certificate obtained successfully"; then
      cert_ready=1
      break
    fi
    sleep 2
  done
  if [ "$cert_ready" -eq 1 ]; then
    progress_done "emitido"
  else
    progress_fail "sin confirmar"
    warn "No he visto el aviso de certificado emitido en los logs de Caddy todavía."
    printf '       → docker compose -f deploy/docker-compose.yml --env-file deploy/.env logs caddy\n'
  fi

  progress_start "https://${domain}/api/health"
  local health_ok=0 status="" _retry
  for _retry in $(seq 1 30); do
    status="$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 5 "https://${domain}/api/health" 2>/dev/null || true)"
    if [ "$status" = "200" ]; then
      health_ok=1
      break
    fi
    sleep 2
  done
  if [ "$health_ok" -eq 1 ]; then
    progress_done "$status"
  else
    progress_fail "${status:-sin respuesta}"
    printf '\n'
    fail "La instalación no ha terminado de arrancar."
    printf '       → \"make doctor\" detalla qué falta. El estado queda en in_progress: repite \"make setup\" para continuar.\n'
    exit 1
  fi

  state_set "completed"

  section "Ledgerly está en marcha"
  printf '\n'
  printf '    Abre       https://%s\n' "$domain"
  printf '    Entra con  %s\n' "$admin_email"
  cat <<'EOF'

  La primera pantalla te pedirá ese correo para crear la cuenta de
  administración, y después los datos de la empresa.

  Siguientes pasos
    make doctor      comprueba que todo sigue sano
    make backup      copia de seguridad de la base de datos
    make update      traer una versión nueva sin perder datos
    make configure   cambiar dominio, credenciales o administrador

    Copia diaria (crontab -e):
      0 3 * * * cd /opt/ledgerly && make backup >> /var/log/ledgerly.log 2>&1

  make setup no volverá a ejecutarse en esta máquina.
EOF
}

main "$@"
