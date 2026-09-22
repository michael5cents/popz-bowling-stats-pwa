#!/bin/zsh
set -euo pipefail

URL='https://popzbowling.com/telemetry-dashboard'
DASH_USER='michael'
SERVICE='popzbowling-telemetry-dashboard'

PASS=$(/usr/bin/security find-generic-password -a "$DASH_USER" -s "$SERVICE" -w 2>/dev/null || true)
if [[ -z "$PASS" ]]; then
  echo "Telemetry dashboard credential is not in macOS Keychain." >&2
  echo "Run: ./scripts/telemetry-dashboard-init.sh" >&2
  exit 2
fi

{
  printf 'url = "%s"\n' "$URL"
  printf 'user = "%s:%s"\n' "$DASH_USER" "$PASS"
  printf 'fail\n'
  printf 'silent\n'
  printf 'show-error\n'
} | /usr/bin/curl --config - "$@"
