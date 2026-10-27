#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

NODE_AUDIT_IMAGE="node:22.23.4-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914"

require_installed
ensure_clamav_defaults

if ! env_file_complete "$ENV_FILE"; then
  fail "deploy/.env is incomplete. Run make MODE=production setup or configure first."
  exit 1
fi

if [ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]; then
  fail "There are uncommitted local changes in ${REPO_ROOT}."
  printf '       → Commit or stash them before running the release audit.\n'
  exit 1
fi

audit_directory="$(mktemp -d)"
cleanup() { rm -rf "$audit_directory"; }
trap cleanup EXIT

mkdir -p "$audit_directory/apps/back" "$audit_directory/apps/front"
cp "$REPO_ROOT/package.json" "$REPO_ROOT/pnpm-lock.yaml" "$REPO_ROOT/pnpm-workspace.yaml" "$REPO_ROOT/.npmrc" "$REPO_ROOT/.pnpmfile.cjs" "$audit_directory/"
cp "$REPO_ROOT/apps/back/package.json" "$audit_directory/apps/back/"
cp "$REPO_ROOT/apps/front/package.json" "$audit_directory/apps/front/"
chmod 755 "$audit_directory" "$audit_directory/apps" "$audit_directory/apps/back" "$audit_directory/apps/front"
chmod 644 "$audit_directory/package.json" "$audit_directory/pnpm-lock.yaml" \
  "$audit_directory/pnpm-workspace.yaml" "$audit_directory/.npmrc" "$audit_directory/.pnpmfile.cjs" \
  "$audit_directory/apps/back/package.json" "$audit_directory/apps/front/package.json"

step "Auditing production dependencies"
dependency_log="$audit_directory/dependency-audit.log"
if ! docker run --rm \
  --network bridge \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=256m \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --user node \
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  -e COREPACK_HOME=/tmp/corepack \
  -e HOME=/tmp/home \
  -v "$audit_directory:/workspace:ro" \
  -w /workspace \
  "$NODE_AUDIT_IMAGE" \
  sh -c 'corepack pnpm audit --recursive --prod --audit-level=high' >"$dependency_log" 2>&1; then
  fail "The production dependency audit found an unmitigated high or critical issue, or could not complete."
  tail -n 40 "$dependency_log"
  exit 1
fi
ok "No unmitigated high or critical production dependency findings"

if ! docker scout version >/dev/null 2>&1; then
  fail "Docker Scout CLI is required to audit production images before rollout."
  printf '       → Install Docker Scout on the VPS, then run make MODE=production release-audit again.\n'
  exit 1
fi

step "Building audited production images"
compose build --pull back front >/dev/null
ok "Backend and frontend images built from pinned base images"

step "Checking the production backend runtime inventory"
backend_image="ledgerly-back:local"
runtime_version_log="$audit_directory/backend-node-version.log"
if ! runtime_node_version="$(docker run --rm --network none --entrypoint node "$backend_image" --version 2>"$runtime_version_log")"; then
  fail "Could not read the Node.js version from the built backend image."
  tail -n 20 "$runtime_version_log"
  exit 1
fi
if [ "$runtime_node_version" != "v22.23.4" ]; then
  fail "The built backend image uses ${runtime_node_version}; expected v22.23.4."
  exit 1
fi
ok "Backend image runs Node.js ${runtime_node_version}"

runtime_inventory_log="$audit_directory/backend-runtime-inventory.log"
if ! docker run --rm \
  --network none \
  --read-only \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --user node \
  -v "$REPO_ROOT/deploy/scripts/verify-ledgerly-runtime.mjs:/tmp/verify-ledgerly-runtime.mjs:ro" \
  --entrypoint node \
  "$backend_image" \
  /tmp/verify-ledgerly-runtime.mjs /app >"$runtime_inventory_log" 2>&1; then
  fail "The built backend image contains forbidden test tooling or an unexpected Multer resolution."
  tail -n 30 "$runtime_inventory_log"
  exit 1
fi
cat "$runtime_inventory_log"
ok "Backend runtime inventory matches the approved production dependencies"

step "Preparing pinned runtime images"
compose pull --quiet postgres clamav caddy >/dev/null
ok "Postgres, ClamAV, and Caddy images pulled at their Compose digests"

mapfile -t images < <(compose config --images | awk 'NF' | sort -u)
if [ "${#images[@]}" -eq 0 ]; then
  fail "No production images were found in the Compose configuration."
  exit 1
fi

step "Auditing production images"
for image in "${images[@]}"; do
  image_log="$audit_directory/image-audit.log"
  if ! docker scout cves --only-severity high,critical --exit-code "local://$image" >"$image_log" 2>&1; then
    fail "Image audit failed for ${image}."
    tail -n 40 "$image_log"
    exit 1
  fi
  ok "${image}: no unmitigated high or critical findings"
done

ok "Release audit passed; no migrations or application services were started"
