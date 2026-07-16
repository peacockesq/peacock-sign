#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERIFY="$ROOT_DIR/verify-edge-contract.sh"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

expect_failure() {
  local case_name="$1"
  local expected="$2"
  shift 2
  local log_file="$TMP_DIR/${case_name}.log"
  if "$@" >"$log_file" 2>&1; then
    echo "edge contract test failed: $case_name unexpectedly passed" >&2
    return 1
  fi
  if ! grep -Fq "$expected" "$log_file"; then
    echo "edge contract test failed: $case_name returned the wrong error" >&2
    sed -n '1,80p' "$log_file" >&2
    return 1
  fi
  echo "edge contract negative passed: $case_name"
}

"$VERIFY"

for missing_host in \
  calc.lexyalgo.com \
  assetdivider.lexyalgo.com \
  asset-divider.lexyalgo.com
do
  fixture="$TMP_DIR/Caddyfile-${missing_host}"
  cp "$ROOT_DIR/Caddyfile" "$fixture"
  python3 - "$fixture" "$missing_host" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
missing = sys.argv[2]
expected = [
    "calc.lexyalgo.com",
    "assetdivider.lexyalgo.com",
    "asset-divider.lexyalgo.com",
]
text = path.read_text()
old = ", ".join(expected) + " {"
new = ", ".join(host for host in expected if host != missing) + " {"
if old not in text:
    raise SystemExit("test fixture could not find the Asset Divider host label")
path.write_text(text.replace(old, new, 1))
PY
  expect_failure \
    "missing-${missing_host//./-}" \
    "expected one exact three-host Asset Divider route" \
    "$VERIFY" "$fixture" \
    "$ROOT_DIR/docker-compose.yml" \
    "$ROOT_DIR/docker-compose.runtime.yml"
done

wrong_upstream="$TMP_DIR/Caddyfile-wrong-upstream"
cp "$ROOT_DIR/Caddyfile" "$wrong_upstream"
python3 - "$wrong_upstream" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text()
old = "  reverse_proxy asset-divider:3000\n"
if old not in text:
    raise SystemExit("test fixture could not find the Asset Divider upstream")
path.write_text(text.replace(old, "  reverse_proxy asset-divider:3001\n", 1))
PY
expect_failure \
  wrong-upstream \
  "must proxy exactly to asset-divider:3000" \
  "$VERIFY" "$wrong_upstream" \
  "$ROOT_DIR/docker-compose.yml" \
  "$ROOT_DIR/docker-compose.runtime.yml"

for compose_name in docker-compose.yml docker-compose.runtime.yml
do
  fixture="$TMP_DIR/$compose_name"

  cp "$ROOT_DIR/$compose_name" "$fixture"
  python3 - "$fixture" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text()
old = "      - lexysign\n      - coolify\n\nnetworks:"
if old not in text:
    raise SystemExit("test fixture could not find the Caddy coolify attachment")
path.write_text(text.replace(old, "      - lexysign\n\nnetworks:", 1))
PY
  expect_failure \
    "${compose_name%.yml}-detached" \
    "caddy is not attached to coolify" \
    "$VERIFY" "$ROOT_DIR/Caddyfile" "$fixture"

  cp "$ROOT_DIR/$compose_name" "$fixture"
  python3 - "$fixture" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text()
old = "  coolify:\n    name: coolify\n    external: true\n"
if old not in text:
    raise SystemExit("test fixture could not find the coolify definition")
path.write_text(text.replace(old, "", 1))
PY
  expect_failure \
    "${compose_name%.yml}-missing-network" \
    "does not define coolify" \
    "$VERIFY" "$ROOT_DIR/Caddyfile" "$fixture"

  cp "$ROOT_DIR/$compose_name" "$fixture"
  python3 - "$fixture" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text()
old = "    external: true\n"
if old not in text:
    raise SystemExit("test fixture could not find external: true")
path.write_text(text.replace(old, "    external: false\n", 1))
PY
  expect_failure \
    "${compose_name%.yml}-non-external" \
    "coolify must be external and named coolify" \
    "$VERIFY" "$ROOT_DIR/Caddyfile" "$fixture"

  cp "$ROOT_DIR/$compose_name" "$fixture"
  python3 - "$fixture" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text()
old = "    name: coolify\n"
if old not in text:
    raise SystemExit("test fixture could not find name: coolify")
path.write_text(text.replace(old, "    name: wrong-network\n", 1))
PY
  expect_failure \
    "${compose_name%.yml}-wrong-network-name" \
    "coolify must be external and named coolify" \
    "$VERIFY" "$ROOT_DIR/Caddyfile" "$fixture"
done

echo "edge contract test matrix passed"
