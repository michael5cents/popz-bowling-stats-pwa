#!/bin/zsh
set -euo pipefail

DASH_USER='michael'
SERVICE='popzbowling-telemetry-dashboard'

echo "This stores the existing Popz Bowling telemetry dashboard password in macOS Keychain."
echo "The password is not written to Git, Obsidian, Collective, or the Wiki."
read -s "PASS?Telemetry dashboard password: "
echo
if [[ -z "$PASS" ]]; then
  echo "No password entered." >&2
  exit 2
fi

/usr/bin/security add-generic-password -U -a "$DASH_USER" -s "$SERVICE" -w "$PASS" >/dev/null
unset PASS

echo "Keychain credential stored."
echo "Test with: ./scripts/telemetry-dashboard-fetch.sh | grep -m1 'Popz Bowling Telemetry'"
