#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

main() {
  require_installed

  local status
  status="$(state_get STATUS 2>/dev/null || printf '')"
  if [ "$status" != "completed" ]; then
    fail "La instalación no está completa todavía."
    printf '       → Termina con: make setup\n'
    exit 1
  fi

  step "Actualizando Ledgerly"

  if [ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]; then
    fail "Hay cambios locales sin confirmar en ${REPO_ROOT}."
    printf '       → git status; guarda o descarta esos cambios antes de actualizar.\n'
    exit 1
  fi

  if ! git -C "$REPO_ROOT" pull --ff-only; then
    fail "git pull --ff-only ha fallado (probablemente el histórico local y el remoto han divergido)."
    printf '       → git -C %s log --oneline -5 y resuélvelo a mano antes de repetir make update.\n' "$REPO_ROOT"
    exit 1
  fi
  ok "Código actualizado"

  bash "$SCRIPT_DIR/backup.sh"

  step "Reconstruyendo y migrando"
  compose build
  ok "Imágenes reconstruidas"

  compose up -d --wait postgres
  compose run --rm migrator
  ok "Migraciones aplicadas"

  compose up -d --wait
  ok "Servicios arriba"

  docker image prune -f >/dev/null
  ok "Imágenes antiguas limpiadas"

  printf '\n'
  bash "$SCRIPT_DIR/doctor.sh"
}

main
