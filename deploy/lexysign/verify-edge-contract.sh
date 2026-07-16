#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 - "$ROOT_DIR/Caddyfile" "$ROOT_DIR/docker-compose.runtime.yml" <<'PY'
import re
import sys
from pathlib import Path

caddy = Path(sys.argv[1]).read_text()
compose = Path(sys.argv[2]).read_text()

calc_block = re.search(
    r"(?ms)^[^#\n]*\bcalc\.lexyalgo\.com\b[^\n]*\{\s*(.*?)^\}",
    caddy,
)
if not calc_block:
    raise SystemExit("edge contract failed: calc.lexyalgo.com is absent from Caddy routes")
if not re.search(r"(?m)^\s*reverse_proxy\s+asset-divider:3000\s*$", calc_block.group(1)):
    raise SystemExit(
        "edge contract failed: calc.lexyalgo.com does not proxy to asset-divider:3000"
    )

caddy_service = re.search(r"(?ms)^  caddy:\s*$\n(.*?)(?=^  [a-zA-Z0-9_-]+:\s*$|^networks:\s*$)", compose)
if not caddy_service or not re.search(r"(?m)^\s{6}- coolify\s*$", caddy_service.group(1)):
    raise SystemExit("edge contract failed: caddy is not attached to the coolify network")

network_section = re.search(r"(?ms)^networks:\s*$\n(.*?)(?=^[a-zA-Z0-9_-]+:\s*$|\Z)", compose)
coolify_block = None if not network_section else re.search(
    r"(?ms)^  coolify:\s*$\n(.*?)(?=^  [a-zA-Z0-9_-]+:\s*$|\Z)",
    network_section.group(1),
)
if not coolify_block or not re.search(r"(?m)^\s{4}name:\s*coolify\s*$", coolify_block.group(1)) or not re.search(
    r"(?m)^\s{4}external:\s*true\s*$", coolify_block.group(1)
):
    raise SystemExit("edge contract failed: coolify must be the external network named coolify")

print("edge contract passed: calc.lexyalgo.com -> asset-divider:3000 on external coolify")
PY
