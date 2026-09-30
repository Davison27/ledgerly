#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_DIR="$REPO_ROOT/deploy"
COMPOSE_FILE="$COMPOSE_DIR/docker-compose.coolify.yml"
NORMALIZED_COMPOSE=""
VALIDATION_ENV=""
RENDERED_COMPOSE=""

cleanup() {
  rm -f -- "$NORMALIZED_COMPOSE" "$VALIDATION_ENV" "$RENDERED_COMPOSE"
}

trap cleanup EXIT

NORMALIZED_COMPOSE="$(python3 - "$COMPOSE_FILE" <<'PY'
import os
import re
import sys
import tempfile

source = sys.argv[1]
with open(source, "rb") as compose_file:
    content = compose_file.read()
content, replacements = re.subn(
    rb"(?m)^[ \t]*exclude_from_hc: true[ \t]*\r?\n", b"", content
)
if replacements != 1:
    raise SystemExit("Expected exactly one provider-only Compose field to normalize")
descriptor, normalized = tempfile.mkstemp(
    prefix=".docker-compose.coolify.validation.", suffix=".yml", dir=os.path.dirname(source)
)
with os.fdopen(descriptor, "wb") as compose_file:
    compose_file.write(content)
print(normalized)
PY
)"

VALIDATION_ENV="$(mktemp "${TMPDIR:-/tmp}/ledgerly-coolify-validation-env.XXXXXX")"
RENDERED_COMPOSE="$(mktemp "${TMPDIR:-/tmp}/ledgerly-coolify-rendered.XXXXXX")"

cat > "$VALIDATION_ENV" <<'EOF'
FRONTEND_URL=https://validation.example.invalid
BACKEND_PUBLIC_URL=https://validation.example.invalid
STORED_FILE_ACTIVE_KEY_VERSION=validation
STORED_FILE_KEYS={"validation":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="}
DB_HOST=validation-db
DB_NAME=validation
DB_USER=validation
DB_PASSWORD=validation-only
BETTER_AUTH_SECRET=validation-only
BOOTSTRAP_ADMIN_EMAIL=validation@example.invalid
EOF

compose_variables="$(python3 - "$COMPOSE_FILE" <<'PY'
import re
import sys

with open(sys.argv[1], encoding="utf-8") as compose_file:
    content = compose_file.read()
for variable in sorted(set(re.findall(r"\$\{([A-Za-z_][A-Za-z0-9_]*)", content))):
    print(variable)
PY
)"
while IFS= read -r variable; do
  unset "$variable"
done <<< "$compose_variables"

docker compose --file "$NORMALIZED_COMPOSE" --env-file "$VALIDATION_ENV" config --format json > "$RENDERED_COMPOSE"

python3 - "$RENDERED_COMPOSE" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as rendered_file:
    model = json.load(rendered_file)

services = model.get("services")
networks = model.get("networks")
if not isinstance(services, dict) or not isinstance(networks, dict):
    raise SystemExit("Rendered Compose model is missing services or networks")

for service_name, service in services.items():
    if service.get("ports"):
        raise SystemExit(f"Service {service_name} publishes a host port")

for network_name in ("data", "scanner"):
    network = networks.get(network_name)
    if not isinstance(network, dict) or network.get("internal") is not True:
        raise SystemExit(f"Network {network_name} must remain internal")

network_aliases = {}
project_name = model.get("name")
for logical_name, network in networks.items():
    network_aliases[logical_name] = logical_name
    if isinstance(network, dict) and network.get("name"):
        network_aliases[network["name"]] = logical_name
    if project_name:
        network_aliases[f"{project_name}_{logical_name}"] = logical_name

expected_memberships = {
    "back": {"proxy", "data", "scanner"},
    "migrator": {"data"},
    "front": {"proxy"},
    "caddy": {"proxy"},
}
for service_name, expected in expected_memberships.items():
    service = services.get(service_name)
    if not isinstance(service, dict):
        raise SystemExit(f"Required service {service_name} is missing")
    declared = service.get("networks", {})
    if isinstance(declared, dict):
        references = declared.keys()
    elif isinstance(declared, list):
        references = declared
    else:
        raise SystemExit(f"Service {service_name} has an invalid network declaration")
    actual = {network_aliases.get(reference, reference) for reference in references}
    if actual != expected:
        raise SystemExit(f"Service {service_name} network memberships do not match the contract")

print("Coolify Compose repository contract passed.")
print("Review Coolify's effective generated Compose and runtime network memberships separately before deployment.")
PY
