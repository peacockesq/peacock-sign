#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CADDYFILE="${1:-$ROOT_DIR/Caddyfile}"
if (( $# > 0 )); then
  shift
fi
if (( $# == 0 )); then
  set -- "$ROOT_DIR/docker-compose.yml" "$ROOT_DIR/docker-compose.runtime.yml"
fi

python3 - "$CADDYFILE" "$@" <<'PY'
import sys
from pathlib import Path

required_hosts = {
    "calc.lexyalgo.com",
    "assetdivider.lexyalgo.com",
    "asset-divider.lexyalgo.com",
}

caddy_path = Path(sys.argv[1])
site_blocks = []
label = None
body = []
depth = 0
for raw_line in caddy_path.read_text().splitlines():
    line = raw_line.split("#", 1)[0].strip()
    if depth == 0:
        if line.endswith("{"):
            label = line[:-1].strip()
            body = []
            depth = line.count("{") - line.count("}")
        continue
    body.append(line)
    depth += line.count("{") - line.count("}")
    if depth == 0:
        site_blocks.append((label, body))
        label = None
        body = []

asset_blocks = []
for site_label, site_body in site_blocks:
    hosts = {host.strip() for host in site_label.split(",")}
    if hosts == required_hosts:
        asset_blocks.append(site_body)

if len(asset_blocks) != 1:
    configured_hosts = {
        host.strip()
        for site_label, _ in site_blocks
        for host in site_label.split(",")
    }
    missing = sorted(required_hosts - configured_hosts)
    detail = f"; missing: {', '.join(missing)}" if missing else ""
    raise SystemExit(
        "edge contract failed: expected one exact three-host Asset Divider route" + detail
    )

proxy_directives = [
    line.split()
    for line in asset_blocks[0]
    if line.startswith("reverse_proxy")
]
if proxy_directives != [["reverse_proxy", "asset-divider:3000"]]:
    raise SystemExit(
        "edge contract failed: all Asset Divider hosts must proxy exactly to asset-divider:3000"
    )

for compose_arg in sys.argv[2:]:
    compose_path = Path(compose_arg)
    lines = compose_path.read_text().splitlines()

    caddy_start = None
    for index, raw_line in enumerate(lines):
        if len(raw_line) - len(raw_line.lstrip()) == 2 and raw_line.strip() == "caddy:":
            caddy_start = index
            break
    if caddy_start is None:
        raise SystemExit(f"edge contract failed: {compose_path.name} has no caddy service")

    caddy_end = len(lines)
    for index in range(caddy_start + 1, len(lines)):
        raw_line = lines[index]
        if not raw_line.strip():
            continue
        indent = len(raw_line) - len(raw_line.lstrip())
        if indent <= 2:
            caddy_end = index
            break

    caddy_networks = []
    network_list_start = None
    for index in range(caddy_start + 1, caddy_end):
        raw_line = lines[index]
        if len(raw_line) - len(raw_line.lstrip()) == 4 and raw_line.strip() == "networks:":
            network_list_start = index
            break
    if network_list_start is not None:
        for index in range(network_list_start + 1, caddy_end):
            raw_line = lines[index]
            if not raw_line.strip():
                continue
            indent = len(raw_line) - len(raw_line.lstrip())
            if indent <= 4:
                break
            if indent == 6 and raw_line.strip().startswith("- "):
                caddy_networks.append(raw_line.strip()[2:].strip())
    if "coolify" not in caddy_networks:
        raise SystemExit(
            f"edge contract failed: {compose_path.name} caddy is not attached to coolify"
        )

    networks_start = None
    for index, raw_line in enumerate(lines):
        if raw_line.strip() == "networks:" and not raw_line.startswith((" ", "\t")):
            networks_start = index
            break
    if networks_start is None:
        raise SystemExit(f"edge contract failed: {compose_path.name} has no networks section")

    networks_end = len(lines)
    for index in range(networks_start + 1, len(lines)):
        raw_line = lines[index]
        if raw_line.strip() and not raw_line.startswith((" ", "\t")):
            networks_end = index
            break

    coolify_start = None
    for index in range(networks_start + 1, networks_end):
        raw_line = lines[index]
        if len(raw_line) - len(raw_line.lstrip()) == 2 and raw_line.strip() == "coolify:":
            coolify_start = index
            break
    if coolify_start is None:
        raise SystemExit(
            f"edge contract failed: {compose_path.name} does not define coolify"
        )

    coolify_attributes = {}
    for index in range(coolify_start + 1, networks_end):
        raw_line = lines[index]
        if not raw_line.strip():
            continue
        indent = len(raw_line) - len(raw_line.lstrip())
        if indent <= 2:
            break
        if indent == 4 and ":" in raw_line:
            key, value = raw_line.strip().split(":", 1)
            coolify_attributes[key] = value.strip().strip('"\'')
    if coolify_attributes.get("name") != "coolify" or coolify_attributes.get("external") != "true":
        raise SystemExit(
            f"edge contract failed: {compose_path.name} coolify must be external and named coolify"
        )

    print(f"edge contract compose passed: {compose_path.name} uses external coolify")

print(
    "edge contract passed: calc + Asset Divider aliases -> asset-divider:3000 "
    "on every supported external coolify compose path"
)
PY
