#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

main() {
  require_installed

  local dump_file="${1:-}"
  if [ -z "$dump_file" ]; then
    dump_file="$(find "$BACKUPS_DIR" -maxdepth 1 -name 'ledgerly-*.dump' -type f 2>/dev/null | sort -r | head -n1 || printf '')"
  fi

  if [ -z "$dump_file" ] || [ ! -f "$dump_file" ]; then
    fail "No se encontró ninguna copia de seguridad."
    printf '       Indica la ruta: bash deploy/scripts/restore.sh deploy/backups/ledgerly-XXXX.dump\n'
    exit 1
  fi

  step "Restaurar una copia de seguridad"
  warn "Vas a restaurar ${dump_file}."
  printf '       Esto SOBRESCRIBE todos los datos actuales de Ledgerly. No hay\n'
  printf '       vuelta atrás salvo que tengas otra copia.\n\n'

  local confirmation
  read -r -p '  Escribe RESTAURAR para confirmar > ' confirmation
  if [ "$confirmation" != "RESTAURAR" ]; then
    warn "Cancelado, no se ha tocado nada."
    exit 1
  fi

  local db_user db_name
  db_user="$(env_get DB_USER)"
  db_name="$(env_get DB_NAME)"

  step "Restaurando ${dump_file}"
  compose stop back
  if ! compose exec -T postgres pg_restore --clean --if-exists -U "$db_user" -d "$db_name" <"$dump_file"; then
    fail "pg_restore ha fallado a mitad de la restauración."
    printf '       → revisa los datos con cuidado antes de seguir: docker compose -f deploy/docker-compose.yml --env-file deploy/.env logs postgres\n'
    printf '       → back sigue parado; arráncalo con: docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d back\n'
    exit 1
  fi
  ok "Datos restaurados"

  compose up -d --wait back
  ok "back arrancado de nuevo"

  printf '\n'
  bash "$SCRIPT_DIR/doctor.sh"
}

main "$@"
