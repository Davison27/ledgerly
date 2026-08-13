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
  category "Environment"
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    local docker_version compose_version
    docker_version="$(docker version --format '{{.Server.Version}}' 2>/dev/null || printf '?')"
    compose_version="$(docker compose version --short 2>/dev/null || printf '?')"
    emit_ok "Docker ${docker_version} · Compose v${compose_version}"
  else
    emit_fail "Docker or the Compose plugin is not available"
    remedy "sudo usermod -aG docker \$USER && newgrp docker"
  fi
}

check_configuration() {
  category "Configuration"

  if [ ! -f "$ENV_FILE" ]; then
    emit_fail "deploy/.env does not exist"
    remedy "make setup"
    return
  fi

  local perms missing
  perms="$(stat_perms "$ENV_FILE")"
  missing="$(env_missing_keys "$ENV_FILE")"

  if [ "$perms" != "600" ]; then
    emit_fail "deploy/.env permissions are ${perms}; they should be 600"
    remedy "chmod 600 deploy/.env"
  fi

  if [ -n "$missing" ]; then
    emit_fail "Missing keys in deploy/.env: ${missing}"
    remedy "Run make configure, or compare it with deploy/.env.example"
    return
  fi

  if [ "$perms" = "600" ]; then
    emit_ok "deploy/.env exists, permissions 600, ${#ENV_CONTRACT_KEYS[@]} keys"
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
    emit_ok "Consistent: production, secure cookies, trusted proxy"
  else
    emit_fail "Inconsistent deploy/.env values: ${problems[*]}"
    remedy "Run make configure to fix them, or edit them manually and run \"make restart\""
  fi
}

check_services() {
  category "Services"
  local svc status health restarts uptime
  for svc in postgres back front caddy; do
    status="$(container_status "$svc")"
    if [ "$status" = "absent" ]; then
      emit_fail "$(printf '%-8s' "$svc") not found"
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
      emit_fail "$(printf '%-8s %s (%s restarts in 5 min)' "$svc" "$status" "$restarts")"
      remedy "Run make logs SERVICE=${svc}; port 80 is often occupied by another system web server (systemctl stop nginx)"
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
    printf '%s days' "$days"
  else
    printf '<1 day'
  fi
}

check_database() {
  category "Database"

  if ! env_file_complete "$ENV_FILE" 2>/dev/null; then
    emit_fail "Cannot check the database: deploy/.env is missing keys"
    return
  fi

  local db_user db_name
  db_user="$(env_get DB_USER)"
  db_name="$(env_get DB_NAME)"

  if ! compose exec -T postgres pg_isready -U "$db_user" -d "$db_name" >/dev/null 2>&1; then
    emit_fail "Postgres is not responding (pg_isready)"
    remedy "docker compose -f deploy/docker-compose.yml --env-file deploy/.env logs postgres"
    return
  fi

  local probe
  probe="$(compose exec -T postgres psql -U "$db_user" -d "$db_name" -tAc 'SELECT 1' 2>/dev/null | tr -d '[:space:]' || printf '')"
  if [ "$probe" != "1" ]; then
    emit_fail "Could not connect to the database with deploy/.env credentials"
    remedy "Check DB_PASSWORD in deploy/.env; if you changed it manually, run make configure"
    return
  fi

  local migration_output pending applied
  migration_output="$(compose run --rm migrator ./node_modules/.bin/typeorm migration:show -d dist/database/data-source.js 2>/dev/null || printf '')"
  pending="$(printf '%s\n' "$migration_output" | grep -c '^\[ \]' || true)"
  applied="$(printf '%s\n' "$migration_output" | grep -c '^\[X\]' || true)"

  if [ "$pending" -eq 0 ]; then
    emit_ok "Connection successful · ${applied} migrations applied, 0 pending"
  else
    emit_fail "Connection successful · ${pending} migrations pending"
    remedy "make migrate"
  fi

  local founders
  founders="$(compose exec -T postgres psql -U "$db_user" -d "$db_name" -tAc \
    "SELECT count(*) FROM workspace_members WHERE is_founder" 2>/dev/null | tr -d '[:space:]' || printf '0')"
  if [ "$founders" = "1" ]; then
    emit_ok "Initial administrator created"
  else
    emit_warn "Initial administrator setup has not been completed yet"
    remedy "Open https://$(env_get LEDGERLY_DOMAIN) and complete it with $(env_get BOOTSTRAP_ADMIN_EMAIL)"
  fi
}

check_network() {
  category "Network and certificate"

  if ! env_file_complete "$ENV_FILE" 2>/dev/null; then
    emit_fail "Cannot check the network: LEDGERLY_DOMAIN is missing from deploy/.env"
    return
  fi

  local domain resolved my_ip
  domain="$(env_get LEDGERLY_DOMAIN)"
  resolved="$(resolve_domain "$domain" || true)"
  my_ip="$(public_ip || true)"

  if [ -z "$resolved" ]; then
    emit_fail "DNS: ${domain} does not resolve"
    remedy "Check the A/AAAA record with your DNS provider"
  elif [ -n "$my_ip" ] && [ "$resolved" != "$my_ip" ]; then
    emit_warn "DNS: ${domain} → ${resolved}, does not match this machine's detected IP (${my_ip})"
    remedy "This may be normal with Cloudflare or another proxy in front; otherwise, correct the A/AAAA record"
  else
    emit_ok "DNS: ${domain} → ${resolved} (this machine)"
  fi

  local port rc
  for port in 80 443; do
    if port_in_use "$port"; then
      rc=0
    else
      rc=$?
    fi
    if [ "$rc" -eq 0 ]; then
      emit_ok "Port ${port} is listening"
    elif [ "$rc" -eq 1 ]; then
      emit_fail "Port ${port} is not listening"
      remedy "make logs SERVICE=caddy"
    else
      emit_warn "Could not check port ${port} (neither ss nor netstat is available)"
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
          emit_warn "The certificate expires in ${days_left} days"
          remedy "Caddy renews automatically with 30 days remaining; if it does not, check that port 80 is externally accessible"
        else
          emit_ok "Certificate valid, expires in ${days_left} days"
        fi
      else
        emit_warn "Could not read the certificate expiry date"
      fi
    else
      emit_warn "Could not read the certificate expiry date"
    fi
  else
    emit_warn "openssl is not installed on this host: cannot check the certificate expiry date"
  fi
}

check_resources() {
  category "Resources"
  local free_kb free_gb images_summary
  free_kb="$(df -Pk "$REPO_ROOT" | awk 'NR==2 {print $4}' || printf '0')"
  free_gb=$(( free_kb / 1024 / 1024 ))
  images_summary="$(docker system df 2>/dev/null | awk '/^Images/ {print $4" "$5; exit}' || printf '')"

  if [ "$free_gb" -lt 2 ]; then
    emit_fail "Disk: only ${free_gb} GB free"
    remedy "docker system df; docker image prune -f"
  else
    emit_ok "Disk ${free_gb} GB free · Docker images ${images_summary:-?}"
  fi
}

main() {
  if [ "$QUIET" -eq 0 ]; then
    printf '\n  %sLedgerly — diagnostics%s' "$C_BOLD" "$C_RESET"
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

  local err_word="error" warn_word="warning"
  [ "$FAIL_COUNT" -ne 1 ] && err_word="errors"
  [ "$WARN_COUNT" -ne 1 ] && warn_word="warnings"
  printf '\n  %d %s, %d %s.\n' "$FAIL_COUNT" "$err_word" "$WARN_COUNT" "$warn_word"

  [ "$FAIL_COUNT" -eq 0 ]
}

main
