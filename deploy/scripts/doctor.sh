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

  local migration_log
  migration_log="$(mktemp)"
  if compose run --rm migrator node dist/database/migrate.js --mode=verify >"$migration_log" 2>&1; then
    emit_ok "Connection successful · migration verification passed"
  else
    emit_fail "Migration verification failed"
    remedy "make migrate; inspect the migrator output for schema or pending migration details"
    [ "$QUIET" -eq 1 ] || sed 's/^/         /' "$migration_log"
  fi
  rm -f "$migration_log"

  local max_connections required_connections
  max_connections="$(compose exec -T postgres psql -U "$db_user" -d "$db_name" -tAc 'SHOW max_connections' 2>/dev/null | tr -d '[:space:]' || printf '0')"
  local typeorm_pool auth_pool migrator_pool
  typeorm_pool="$(env_get DB_TYPEORM_POOL_MAX)"
  auth_pool="$(env_get DB_AUTH_POOL_MAX)"
  migrator_pool="$(env_get DB_MIGRATOR_POOL_MAX)"
  if ! [[ "$max_connections" =~ ^[0-9]+$ && "$typeorm_pool" =~ ^[0-9]+$ &&
    "$auth_pool" =~ ^[0-9]+$ && "$migrator_pool" =~ ^[0-9]+$ ]]; then
    emit_fail "Database connection budget values are not valid integers"
    remedy "Check DB_*_POOL_MAX and PostgreSQL max_connections in deploy/.env"
    return
  fi
  required_connections="$(( typeorm_pool + auth_pool + 2 * migrator_pool + 1 ))"
  if [ "$max_connections" -ge "$required_connections" ] 2>/dev/null; then
    emit_ok "Connection budget ${required_connections}/${max_connections}"
  else
    emit_fail "Connection budget ${required_connections} exceeds PostgreSQL max_connections=${max_connections:-unknown}"
    remedy "Reduce the configured pools or raise PostgreSQL max_connections after measuring the VPS"
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
  status_code="$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 5 "https://${domain}/api/health/ready" 2>/dev/null)" || true
  status_code="${status_code:-000}"
  if [ "$status_code" = "200" ]; then
    emit_ok "https://${domain}/api/health/ready → 200"
  else
    emit_fail "https://${domain}/api/health/ready → ${status_code}"
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
  grep -E "^${key}=" "$file" | tail -n1 | cut -d= -f2-
}

validate_backup_pair() {
  local manifest="$1" dump="$2" expected_dump expected_bytes actual_bytes expected_hash actual_hash key
  expected_dump="$(manifest_value dump_file "$manifest")"
  [ "$expected_dump" = "$(basename "$dump")" ] || return 1

  for key in format created_at database postgres_version bytes sha256 typeorm_migration_count better_auth_migration_status; do
    grep -Eq "^${key}=" "$manifest" || return 1
  done

  expected_bytes="$(manifest_value bytes "$manifest")"
  [[ "$expected_bytes" =~ ^[0-9]+$ ]] || return 1
  actual_bytes="$(wc -c <"$dump" | tr -d '[:space:]')"
  [ "$expected_bytes" = "$actual_bytes" ] || return 1

  expected_hash="$(manifest_value sha256 "$manifest")"
  [[ "$expected_hash" =~ ^[[:xdigit:]]{64}$ ]] || return 1
  actual_hash="$(checksum_file "$dump")"
  [ "$expected_hash" = "$actual_hash" ] || return 1

  if [ "${BACKUP_ARCHIVE_CHECK_ENABLED:-0}" = "1" ]; then
    compose exec -T postgres pg_restore --list - <"$dump" >/dev/null 2>&1 || return 1
  fi
}

check_backup_inventory() {
  category "Backups"
  if [ ! -d "$BACKUPS_DIR" ]; then
    emit_warn "No backup directory exists yet"
    remedy "make backup"
    return
  fi

  local manifests valid=0 invalid=0 manifest dump partial_count=0 orphan_dump_count=0
  local archive_unchecked=0
  if service_running postgres; then
    BACKUP_ARCHIVE_CHECK_ENABLED=1
  else
    BACKUP_ARCHIVE_CHECK_ENABLED=0
    archive_unchecked=1
  fi

  partial_count="$(find "$BACKUPS_DIR" -maxdepth 1 -type f -name '*.partial' | wc -l | tr -d '[:space:]')"
  mapfile -t manifests < <(find "$BACKUPS_DIR" -maxdepth 1 -name 'ledgerly-*.manifest' -type f | sort -r)
  for manifest in "${manifests[@]}"; do
    dump="${manifest%.manifest}.dump"
    if [ -f "$dump" ] && validate_backup_pair "$manifest" "$dump"; then
      valid=$((valid + 1))
    else
      invalid=$((invalid + 1))
    fi
  done

  local candidate candidate_manifest
  for candidate in "$BACKUPS_DIR"/ledgerly-*.dump; do
    [ -f "$candidate" ] || continue
    candidate_manifest="${candidate%.dump}.manifest"
    [ -f "$candidate_manifest" ] || orphan_dump_count=$((orphan_dump_count + 1))
  done

  if [ "$valid" -gt 0 ]; then
    if [ "$archive_unchecked" -eq 1 ]; then
      emit_warn "${valid} structurally valid backup pair(s) available; archive contents were not checked because Postgres is not running"
    else
      emit_ok "${valid} complete and verified backup pair(s) available"
    fi
  else
    emit_warn "No complete verified backup pairs are available"
    remedy "make backup"
  fi
  if [ "$invalid" -gt 0 ]; then
    emit_warn "${invalid} invalid or incomplete backup manifest pair(s) found"
    remedy "Run make backup and review deploy/backups before deleting orphaned files"
  fi
  if [ "$orphan_dump_count" -gt 0 ]; then
    emit_warn "${orphan_dump_count} backup dump(s) have no matching manifest"
    remedy "Keep only dump files created by make backup after verifying their recovery path"
  fi
  if [ "$partial_count" -gt 0 ]; then
    emit_warn "${partial_count} partial backup artifact(s) found"
    remedy "Inspect interrupted backup jobs and remove partial files only after confirming a valid pair exists"
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

  if ! env_file_complete "$ENV_FILE" 2>/dev/null; then
    return
  fi

  local service configured_memory configured_cpus configured_pids expected_memory expected_cpus
  local actual_memory actual_cpus actual_pids
  for service in postgres back front; do
    case "$service" in
      postgres)
        configured_memory="$(env_get DEPLOY_POSTGRES_MEMORY)"
        configured_cpus="$(env_get DEPLOY_POSTGRES_CPUS)"
        configured_pids="$(env_get DEPLOY_POSTGRES_PIDS_LIMIT)"
        ;;
      back)
        configured_memory="$(env_get DEPLOY_BACK_MEMORY)"
        configured_cpus="$(env_get DEPLOY_BACK_CPUS)"
        configured_pids="$(env_get DEPLOY_PIDS_LIMIT)"
        ;;
      front)
        configured_memory="$(env_get DEPLOY_FRONT_MEMORY)"
        configured_cpus="$(env_get DEPLOY_FRONT_CPUS)"
        configured_pids="$(env_get DEPLOY_FRONT_PIDS_LIMIT)"
        ;;
    esac

    expected_memory="$(size_to_bytes "$configured_memory" 2>/dev/null || printf '0')"
    expected_cpus="$(cpu_to_nanocpus "$configured_cpus" 2>/dev/null || printf '0')"
    actual_memory="$(docker inspect --format '{{.HostConfig.Memory}}' "$(container_name "$service")" 2>/dev/null | tr -d '[:space:]' || printf '0')"
    actual_cpus="$(docker inspect --format '{{.HostConfig.NanoCpus}}' "$(container_name "$service")" 2>/dev/null | tr -d '[:space:]' || printf '0')"
    actual_pids="$(docker inspect --format '{{.HostConfig.PidsLimit}}' "$(container_name "$service")" 2>/dev/null | tr -d '[:space:]' || printf '0')"

    if ! [[ "$expected_memory" =~ ^[0-9]+$ && "$expected_cpus" =~ ^[0-9]+$ && "$configured_pids" =~ ^[0-9]+$ &&
      "$actual_memory" =~ ^[0-9]+$ && "$actual_cpus" =~ ^[0-9]+$ && "$actual_pids" =~ ^[0-9]+$ ]]; then
      emit_fail "${service} has invalid resource-limit values"
      remedy "Use integer memory units, decimal CPU values, and a positive PID limit in deploy/.env"
      continue
    fi

    if [ "$actual_memory" -gt 0 ] && [ "$actual_memory" -le "$expected_memory" ] &&
      [ "$actual_cpus" -gt 0 ] && [ "$actual_cpus" -le "$expected_cpus" ] &&
      [ "$actual_pids" -gt 0 ] && [ "$actual_pids" -le "$configured_pids" ]; then
      emit_ok "${service} limits effective (memory ${configured_memory}, CPU ${configured_cpus}, PIDs ${configured_pids})"
    else
      emit_fail "${service} effective Docker limits do not match the configured safeguards"
      remedy "Recreate the stack with make restart and inspect docker inspect ${service}"
    fi
  done
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
  check_backup_inventory

  local err_word="error" warn_word="warning"
  [ "$FAIL_COUNT" -ne 1 ] && err_word="errors"
  [ "$WARN_COUNT" -ne 1 ] && warn_word="warnings"
  printf '\n  %d %s, %d %s.\n' "$FAIL_COUNT" "$err_word" "$WARN_COUNT" "$warn_word"

  [ "$FAIL_COUNT" -eq 0 ]
}

main
