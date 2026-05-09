#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ -f .env ]]; then
  echo ".env already exists; refusing to overwrite" >&2
  exit 1
fi

HOST_URL="${HOST_URL:-https://sign.lexyalgo.com}"
MASTER_KEY="$(openssl rand -base64 36 | tr -d '\n')"
P12_PASS="$(openssl rand -base64 24 | tr -d '\n')"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

openssl req -x509 -newkey rsa:2048 -keyout "$TMP_DIR/lexysign.key" -out "$TMP_DIR/lexysign.crt" \
  -days 365 -nodes -subj "/CN=LexySign Test Signing Certificate/O=LexyAlgo/C=US" >/dev/null 2>&1
openssl pkcs12 -export -out "$TMP_DIR/lexysign.p12" -inkey "$TMP_DIR/lexysign.key" -in "$TMP_DIR/lexysign.crt" \
  -passout "pass:${P12_PASS}" >/dev/null 2>&1
PFX_BASE64="$(base64 -w0 "$TMP_DIR/lexysign.p12")"

sed \
  -e "s#https://sign.lexyalgo.com#${HOST_URL}#g" \
  -e "s#REPLACE_WITH_RANDOM_MASTER_KEY#${MASTER_KEY}#" \
  -e "s#REPLACE_WITH_BASE64_P12#${PFX_BASE64}#" \
  -e "s#REPLACE_WITH_P12_PASSWORD#${P12_PASS}#" \
  .env.example > .env

chmod 600 .env
cat <<EOF
Created deploy/lexysign/.env for ${HOST_URL}
- MASTER_KEY generated
- throwaway self-signed P12 generated for smoke testing
- SMTP still disabled; configure before real users
EOF
