#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

check_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    fail "Docker no está instalado"
    printf '         → https://docs.docker.com/engine/install/\n'
    return 1
  fi
  if ! docker info >/dev/null 2>&1; then
    fail "Docker está instalado pero no responde"
    printf '         → sudo usermod -aG docker %s && newgrp docker\n' "$(id -un)"
    return 1
  fi
  local version
  version="$(docker version --format '{{.Server.Version}}' 2>/dev/null || printf '?')"
  ok "Docker ${version}"
}

check_compose() {
  if ! docker compose version >/dev/null 2>&1; then
    fail "El plugin docker compose no está disponible"
    printf '         → https://docs.docker.com/compose/install/linux/\n'
    return 1
  fi
  local version
  version="$(docker compose version --short 2>/dev/null || printf '?')"
  ok "Docker Compose v${version}"
}

check_git() {
  if ! command -v git >/dev/null 2>&1; then
    fail "git no está instalado"
    printf '         → sudo apt-get install -y git\n'
    return 1
  fi
  local version
  version="$(git --version | awk '{print $3}')"
  ok "git ${version}"
}

check_ports() {
  local port busy=() unknown=0 rc
  for port in 80 443; do
    if port_in_use "$port"; then
      rc=0
    else
      rc=$?
    fi
    if [ "$rc" -eq 0 ]; then
      busy+=("$port")
    elif [ "$rc" -eq 2 ]; then
      unknown=1
    fi
  done
  if [ "${#busy[@]}" -gt 0 ]; then
    fail "Puertos ocupados: ${busy[*]}"
    printf '         → Libera el puerto o para el servicio que lo usa; este instalador nunca mata procesos.\n'
    return 1
  fi
  if [ "$unknown" -eq 1 ]; then
    warn "No se pudo comprobar el estado de los puertos 80/443 (ni ss ni netstat disponibles)"
    return 0
  fi
  ok "Puertos 80 y 443 libres"
}

check_resources() {
  local free_kb free_gb mem_gb="?"
  free_kb="$(df -Pk "$REPO_ROOT" | awk 'NR==2 {print $4}' || printf '0')"
  free_gb=$(( free_kb / 1024 / 1024 ))

  if [ -r /proc/meminfo ]; then
    local mem_kb
    mem_kb="$(awk '/MemTotal/ {print $2}' /proc/meminfo || printf '0')"
    mem_gb=$(( mem_kb / 1024 / 1024 ))
  fi

  if [ "$free_gb" -lt 2 ]; then
    fail "Solo quedan ${free_gb} GB libres en disco (mínimo 2 GB)"
    printf '         → Libera espacio: docker system df y docker image prune\n'
    return 1
  fi

  if [ "$mem_gb" != "?" ] && [ "$mem_gb" -lt 2 ]; then
    local has_swap=0
    if [ -r /proc/swaps ] && [ "$(wc -l < /proc/swaps)" -gt 1 ]; then
      has_swap=1
    fi
    if [ "$has_swap" -eq 0 ]; then
      warn "Memoria ${mem_gb} GB sin swap: construir el front puede quedarse sin memoria"
      printf '         → fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile\n'
    fi
  fi

  if [ "$free_gb" -lt 5 ]; then
    warn "Espacio libre ${free_gb} GB (recomendado ≥5 GB) · memoria ${mem_gb} GB"
  else
    ok "Espacio libre ${free_gb} GB · memoria ${mem_gb} GB"
  fi
}

run_preflight() {
  local failed=0
  check_docker || failed=1
  check_compose || failed=1
  check_git || failed=1
  check_ports || failed=1
  check_resources || failed=1
  return "$failed"
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  run_preflight
  exit $?
fi
