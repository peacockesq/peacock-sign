#!/usr/bin/env bash
set -euo pipefail

if (( $# != 2 )); then
  echo "usage: $0 <base-revision> <head-revision>" >&2
  exit 2
fi

BASE_REVISION="$1"
HEAD_REVISION="$2"

if ! git cat-file -e "$BASE_REVISION^{object}" 2>/dev/null; then
  echo "secret scan failed: base revision is unavailable: $BASE_REVISION" >&2
  exit 2
fi
if ! git cat-file -e "$HEAD_REVISION^{object}" 2>/dev/null; then
  echo "secret scan failed: head revision is unavailable: $HEAD_REVISION" >&2
  exit 2
fi

SECRET_PATTERN='AKIA[0-9A-Z]{16}|-----BEGIN (RSA|OPENSSH|EC|DSA)? ?PRIVATE KEY-----|sk_live_[A-Za-z0-9]{20,}|whsec_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}'
CHANGED_FILES="$(mktemp)"
trap 'rm -f "$CHANGED_FILES"' EXIT

git diff --diff-filter=ACMR --name-only -z \
  "$BASE_REVISION" "$HEAD_REVISION" >"$CHANGED_FILES"

matches=0
scanned=0
while IFS= read -r -d '' changed_file; do
  case "$changed_file" in
    package-lock.json|*/package-lock.json|*.png|*.ico)
      continue
      ;;
  esac
  if [[ ! -f "$changed_file" ]]; then
    echo "secret scan failed: changed file is unavailable: $changed_file" >&2
    exit 2
  fi
  scanned=$((scanned + 1))
  if grep -IqE "$SECRET_PATTERN" -- "$changed_file"; then
    echo "potential secret pattern detected in changed file: $changed_file" >&2
    matches=$((matches + 1))
  else
    grep_status=$?
    if (( grep_status != 1 )); then
      echo "secret scan failed while reading changed file: $changed_file" >&2
      exit 2
    fi
  fi
done <"$CHANGED_FILES"

if (( matches > 0 )); then
  echo "secret scan failed: $matches changed file(s) matched a secret pattern" >&2
  exit 1
fi

echo "secret scan passed: $scanned changed text file(s) checked"
