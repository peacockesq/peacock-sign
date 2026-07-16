#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCANNER="$ROOT_DIR/scan-changed-files-for-secrets.sh"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

cd "$TMP_DIR"
git init --quiet
git config user.name "Secret Scan Test"
git config user.email "secret-scan-test@example.invalid"
printf '%s\n' 'baseline' > fixture.txt
git add fixture.txt
git commit --quiet -m baseline
BASE_SHA="$(git rev-parse HEAD)"

printf '%s\n' 'safe change' > fixture.txt
git add fixture.txt
git commit --quiet -m safe
SAFE_SHA="$(git rev-parse HEAD)"
"$SCANNER" "$BASE_SHA" "$SAFE_SHA"

printf 'synthetic=%s%s\n' 'AKIA' '0000000000000000' > fixture.txt
git add fixture.txt
git commit --quiet -m canary
CANARY_SHA="$(git rev-parse HEAD)"
if "$SCANNER" "$SAFE_SHA" "$CANARY_SHA" >"$TMP_DIR/canary.log" 2>&1; then
  echo "secret scan test failed: synthetic canary was not detected" >&2
  exit 1
fi
if ! grep -Fq 'potential secret pattern detected in changed file: fixture.txt' "$TMP_DIR/canary.log"; then
  echo "secret scan test failed: canary returned the wrong error" >&2
  sed -n '1,80p' "$TMP_DIR/canary.log" >&2
  exit 1
fi
echo "secret scan canary passed: synthetic marker was detected without logging its value"

if "$SCANNER" "missing-base-revision" "$CANARY_SHA" >"$TMP_DIR/missing-base.log" 2>&1; then
  echo "secret scan test failed: unavailable base revision was accepted" >&2
  exit 1
fi
if ! grep -Fq 'base revision is unavailable' "$TMP_DIR/missing-base.log"; then
  echo "secret scan test failed: missing base returned the wrong error" >&2
  sed -n '1,80p' "$TMP_DIR/missing-base.log" >&2
  exit 1
fi
echo "secret scan fail-closed test passed: unavailable base revision was rejected"
