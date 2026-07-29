#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

QUIET=0
[ "${1:-}" = "--quiet" ] && QUIET=1

FAIL_COUNT=0
WARN_COUNT=0

emit_ok()   { [ "$QUIET" -eq 1 ] || ok "$1"; }
emit_warn() { warn "$1"; WARN_COUNT=$((WARN_COUNT + 1)); }
emit_fail() { fail "$1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }
remedy()    { printf '         → %s\n' "$1"; }
category()  { [ "$QUIET" -eq 1 ] || printf '\n  %s\n' "$1"; }

check_environment() {
  category "Entorno"
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    local docker_version compose_version
    docker_version="$(docker version --format '{{.Server.Version}}' 2>/dev/null || printf '?')"
    compose_version="$(docker compose version --short 2>/dev/null || printf '?')"
    emit_ok "Docker ${docker_version} · Compose v${compose_version}"
  else
    emit_fail "Docker o el plugin compose no están disponibles"
    remedy "sudo usermod -aG docker \$USER && newgrp docker"
  fi
}

check_configuration() {
  category "Configuración"

  if [ ! -f "$ENV_FILE" ]; then
    emit_fail "deploy/.env no existe"
    remedy "make setup"
    return
  fi

  local perms missing
  perms="$(stat_perms "$ENV_FILE")"
  missing="$(env_missing_keys "$ENV_FILE")"

  if [ "$perms" != "600" ]; then
    emit_fail "deploy/.env tiene permisos ${perms}, deberían ser 600"
    remedy "chmod 600 deploy/.env"
  fi

  if [ -n "$missing" ]; then
    emit_fail "Faltan claves en deploy/.env: ${missing}"
    remedy "make configure, o compara con deploy/.env.example"
    return
  fi

  if [ "$perms" = "600" ]; then
    emit_ok "deploy/.env presente, permisos 600, ${#ENV_CONTRACT_KEYS[@]} claves"
  fi

  local domain expected problems=()
  domain="$(env_get LEDGERLY_DOMAIN)"
  expected="https://${domain}"
  [ "$(env_get NODE_ENV)" = "production" ] || problems+=("NODE_ENV=production")
  [ "$(env_get COOKIE_SECURE)" = "true" ] || problems+=("COOKIE_SECURE=true")
  [ "$(env_get TRUST_PROXY)" = "true" ] || problems+=("TRUST_PROXY=true")
  [ "$(env_get DB_HOST)" = "postgres" ] || problems+=("DB_HOST=postgres")
  [ "$(env_get FRONTEND_URL)" = "$expected" ] || problems+=("FRONTEND_URL=${expected}")
  [ "$(env_get BACKEND_PUBLIC_URL)" = "$expected" ] || problems+=("BACKEND_PUBLIC_URL=${expected}")

  if [ "${#problems[@]}" -eq 0 ]; then
    emit_ok "Coherente: producción, cookies seguras, proxy de confianza"
  else
    emit_fail "Incoherencias en deploy/.env: ${problems[*]}"
    remedy "make configure para corregirlas, o edítalas a mano y \"make restart\""
  fi
}

check_services() {
  category "Servicios"
  local svc status health restarts uptime
  for svc in postgres back front caddy; do
    status="$(container_status "$svc")"
    if [ "$status" = "absent" ]; then
      emit_fail "$(printf '%-8s' "$svc") no encontrado"
      remedy "docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d"
      continue
    fi

    health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$(container_name "$svc")" 2>/dev/null | tr -d '[:space:]')"
    health="${health:-none}"
    restarts="$(docker inspect --format '{{.RestartCount}}' "$(container_name "$svc")" 2>/dev/null | tr -d '[:space:]')"
    restarts="${restarts:-0}"
    uptime="$(container_uptime "$svc")"

    if [ "$status" = "running" ] && { [ "$health" = "healthy" ] || [ "$health" = "none" ]; }; then
      if [ "$health" = "healthy" ]; then
        emit_ok "$(printf '%-8s running (healthy)   up %s' "$svc" "$uptime")"
      else
        emit_ok "$(printf '%-8s running              up %s' "$svc" "$uptime")"
      fi
    else
      emit_fail "$(printf '%-8s %s (%s reinicios en 5 min)' "$svc" "$status" "$restarts")"
      remedy "make logs SERVICE=${svc}; suele ser el puerto 80 ocupado por otro servidor web del sistema (systemctl stop nginx)"
    fi
  done
}

container_uptime() {
  local svc="$1" started started_epoch now_epoch days
  started="$(docker inspect --format '{{.State.StartedAt}}' "$(container_name "$svc")" 2>/dev/null || printf '')"
  [ -n "$started" ] || { printf '?'; return 0; }
  started_epoch="$(date -d "$started" +%s 2>/dev/null || printf '0')"
  [ "$started_epoch" != "0" ] || { printf '?'; return 0; }
  now_epoch="$(date +%s)"
  days=$(( (now_epoch - started_epoch) / 86400 ))
  if [ "$days" -ge 1 ]; then
    printf '%s días' "$days"
  else
    printf '<1 día'
  fi
}

check_database() {
  category "Base de datos"

  if ! env_file_complete "$ENV_FILE" 2>/dev/null; then
    emit_fail "No se puede comprobar la base de datos: faltan claves en deploy/.env"
    return
  fi

  local db_user db_name
  db_user="$(env_get DB_USER)"
  db_name="$(env_get DB_NAME)"

  if ! compose exec -T postgres pg_isready -U "$db_user" -d "$db_name" >/dev/null 2>&1; then
    emit_fail "Postgres no responde (pg_isready)"
    remedy "docker compose -f deploy/docker-compose.yml --env-file deploy/.env logs postgres"
    return
  fi

  local probe
  probe="$(compose exec -T postgres psql -U "$db_user" -d "$db_name" -tAc 'SELECT 1' 2>/dev/null | tr -d '[:space:]' || printf '')"
  if [ "$probe" != "1" ]; then
    emit_fail "No se pudo conectar a la base de datos con las credenciales de deploy/.env"
    remedy "Revisa DB_PASSWORD en deploy/.env; si lo cambiaste a mano, usa make configure"
    return
  fi

  local migration_output pending applied
  migration_output="$(compose run --rm migrator ./node_modules/.bin/typeorm migration:show -d dist/database/data-source.js 2>/dev/null || printf '')"
  pending="$(printf '%s\n' "$migration_output" | grep -c '^\[ \]' || true)"
  applied="$(printf '%s\n' "$migration_output" | grep -c '^\[X\]' || true)"

  if [ "$pending" -eq 0 ]; then
    emit_ok "Conexión correcta · ${applied} migraciones aplicadas, 0 pendientes"
  else
    emit_fail "Conexión correcta · ${pending} migraciones pendientes"
    remedy "make migrate"
  fi

  local founders
  founders="$(compose exec -T postgres psql -U "$db_user" -d "$db_name" -tAc \
    "SELECT count(*) FROM workspace_members WHERE is_founder" 2>/dev/null | tr -d '[:space:]' || printf '0')"
  if [ "$founders" = "1" ]; then
    emit_ok "Administrador inicial creado"
  else
    emit_warn "Todavía no se ha completado el alta del administrador inicial"
    remedy "Abre https://$(env_get LEDGERLY_DOMAIN) y complétala con $(env_get BOOTSTRAP_ADMIN_EMAIL)"
  fi
}

check_network() {
  category "Red y certificado"

  if ! env_file_complete "$ENV_FILE" 2>/dev/null; then
    emit_fail "No se puede comprobar la red: falta LEDGERLY_DOMAIN en deploy/.env"
    return
  fi

  local domain resolved my_ip
  domain="$(env_get LEDGERLY_DOMAIN)"
  resolved="$(resolve_domain "$domain" || true)"
  my_ip="$(public_ip || true)"

  if [ -z "$resolved" ]; then
    emit_fail "DNS: ${domain} no resuelve"
    remedy "Comprueba el registro A/AAAA en tu proveedor de DNS"
  elif [ -n "$my_ip" ] && [ "$resolved" != "$my_ip" ]; then
    emit_warn "DNS: ${domain} → ${resolved}, no coincide con la IP detectada de esta máquina (${my_ip})"
    remedy "Puede ser normal con Cloudflare u otro proxy delante; si no, corrige el registro A/AAAA"
  else
    emit_ok "DNS: ${domain} → ${resolved} (esta máquina)"
  fi

  local port rc
  for port in 80 443; do
    if port_in_use "$port"; then
      rc=0
    else
      rc=$?
    fi
    if [ "$rc" -eq 0 ]; then
      emit_ok "Puerto ${port} atendido"
    elif [ "$rc" -eq 1 ]; then
      emit_fail "Puerto ${port} no está escuchando"
      remedy "make logs SERVICE=caddy"
    else
      emit_warn "No se pudo comprobar el puerto ${port} (ni ss ni netstat disponibles)"
    fi
  done

  local status_code
  status_code="$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 5 "https://${domain}/api/health" 2>/dev/null)" || true
  status_code="${status_code:-000}"
  if [ "$status_code" = "200" ]; then
    emit_ok "https://${domain}/api/health → 200"
  else
    emit_fail "https://${domain}/api/health → ${status_code}"
    remedy "docker compose -f deploy/docker-compose.yml --env-file deploy/.env logs caddy back"
  fi

  if command -v openssl >/dev/null 2>&1; then
    local end_date expiry_epoch now_epoch days_left
    end_date="$(printf '' | openssl s_client -connect "${domain}:443" -servername "${domain}" 2>/dev/null \
      | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || printf '')"
    if [ -n "$end_date" ]; then
      expiry_epoch="$(date -d "$end_date" +%s 2>/dev/null || printf '0')"
      now_epoch="$(date +%s)"
      if [ "$expiry_epoch" != "0" ]; then
        days_left=$(( (expiry_epoch - now_epoch) / 86400 ))
        if [ "$days_left" -lt 15 ]; then
          emit_warn "El certificado caduca en ${days_left} días"
          remedy "Caddy renueva solo a los 30 días de vida restante; si no lo hace, revisa que el puerto 80 sea accesible desde fuera"
        else
          emit_ok "Certificado válido, caduca en ${days_left} días"
        fi
      else
        emit_warn "No se pudo leer la caducidad del certificado"
      fi
    else
      emit_warn "No se pudo leer la caducidad del certificado"
    fi
  else
    emit_warn "openssl no está en este host: no se puede comprobar la caducidad del certificado"
  fi
}

check_resources() {
  category "Recursos"
  local free_kb free_gb images_summary
  free_kb="$(df -Pk "$REPO_ROOT" | awk 'NR==2 {print $4}' || printf '0')"
  free_gb=$(( free_kb / 1024 / 1024 ))
  images_summary="$(docker system df 2>/dev/null | awk '/^Images/ {print $4" "$5; exit}' || printf '')"

  if [ "$free_gb" -lt 2 ]; then
    emit_fail "Disco: solo ${free_gb} GB libres"
    remedy "docker system df; docker image prune -f"
  else
    emit_ok "Disco ${free_gb} GB libres · imágenes docker ${images_summary:-?}"
  fi
}

main() {
  if [ "$QUIET" -eq 0 ]; then
    printf '\n  %sLedgerly — diagnóstico%s' "$C_BOLD" "$C_RESET"
    if [ -f "$ENV_FILE" ]; then
      printf ' · %s' "$(env_get LEDGERLY_DOMAIN 2>/dev/null || printf '?')"
    fi
    printf '\n'
  fi

  check_environment
  check_configuration
  check_services
  check_database
  check_network
  check_resources

  local err_word="error" warn_word="aviso"
  [ "$FAIL_COUNT" -ne 1 ] && err_word="errores"
  [ "$WARN_COUNT" -ne 1 ] && warn_word="avisos"
  printf '\n  %d %s, %d %s.\n' "$FAIL_COUNT" "$err_word" "$WARN_COUNT" "$warn_word"

  [ "$FAIL_COUNT" -eq 0 ]
}

main
