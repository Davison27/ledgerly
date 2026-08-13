#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/scripts/lib.sh
source "$SCRIPT_DIR/lib.sh"

FAILURES=0

assert_valid() {
  local fn="$1" value="$2"
  if "$fn" "$value" 2>/dev/null; then
    printf '  [ OK ] %s(%q) valid\n' "$fn" "$value"
  else
    printf '  [FAIL] %s(%q) should be valid\n' "$fn" "$value"
    FAILURES=$((FAILURES + 1))
  fi
}

assert_invalid() {
  local fn="$1" value="$2"
  if "$fn" "$value" 2>/dev/null; then
    printf '  [FAIL] %s(%q) should be invalid\n' "$fn" "$value"
    FAILURES=$((FAILURES + 1))
  else
    printf '  [ OK ] %s(%q) invalid\n' "$fn" "$value"
  fi
}

section "deploy/scripts self-test"

step "is_domain"
assert_valid   is_domain "ledgerly.example.com"
assert_valid   is_domain "sub.domain.example.org"
assert_invalid is_domain "https://ledgerly.example.com"
assert_invalid is_domain "http://ledgerly.example.com"
assert_invalid is_domain "ledgerly.example.com/"
assert_invalid is_domain "203.0.113.10"
assert_invalid is_domain "localhost"
assert_invalid is_domain ""

step "is_email"
assert_valid   is_email "david@example.com"
assert_invalid is_email "david@"
assert_invalid is_email "david"
assert_invalid is_email "@example.com"
assert_invalid is_email "david example.com"

step "is_google_client_id"
assert_valid   is_google_client_id "483920174-a1b2c3.apps.googleusercontent.com"
assert_invalid is_google_client_id "483920174-a1b2c3"
assert_invalid is_google_client_id ".apps.googleusercontent.com"
assert_invalid is_google_client_id "483920174-a1b2c3.apps.googleusercontent.com.evil.com"

step "is_client_secret"
assert_valid   is_client_secret "GOCSPX-abcdefghij"
assert_valid   is_client_secret "abcdefghij1234"
assert_invalid is_client_secret ""
assert_invalid is_client_secret "short"
assert_invalid is_client_secret "with space12"

step "gen_password"
pw1="$(gen_password)"
pw2="$(gen_password)"
if [ "${#pw1}" -eq 32 ]; then
  printf '  [ OK ] length 32 (%d)\n' "${#pw1}"
else
  printf '  [FAIL] length %d, expected 32\n' "${#pw1}"
  FAILURES=$((FAILURES + 1))
fi
if [ "$pw1" != "$pw2" ]; then
  printf '  [ OK ] two calls return different values\n'
else
  printf '  [FAIL] two calls returned the same value\n'
  FAILURES=$((FAILURES + 1))
fi

step "deploy/.env.example covers the environment contract"
if [ -f "$ENV_EXAMPLE" ]; then
  example_missing="$(env_missing_keys "$ENV_EXAMPLE")"
  if [ -z "$example_missing" ]; then
    printf '  [ OK ] %s contains all %d contract keys\n' "$ENV_EXAMPLE" "${#ENV_CONTRACT_KEYS[@]}"
  else
    printf '  [FAIL] %s is missing: %s\n' "$ENV_EXAMPLE" "$example_missing"
    FAILURES=$((FAILURES + 1))
  fi
else
  printf '  [FAIL] %s does not exist\n' "$ENV_EXAMPLE"
  FAILURES=$((FAILURES + 1))
fi

if [ "$FAILURES" -eq 0 ]; then
  printf '\n  All validators passed.\n'
  exit 0
fi

printf '\n  %d checks failed.\n' "$FAILURES"
exit 1
