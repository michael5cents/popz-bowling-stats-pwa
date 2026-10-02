#!/bin/zsh
set -eu
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROFILE="$HOME/Library/Application Support/Popz Bowling QA Phone"
LOG="/tmp/popz-bowling-qa-phone.log"
URL="https://popzbowling.com/?qa=1&phone=1&fresh=$(date +%s)"
mkdir -p "$PROFILE"
nohup "$CHROME" \
  --user-data-dir="$PROFILE" \
  --app="$URL" \
  --window-size=430,932 \
  --force-device-scale-factor=1 \
  --remote-debugging-port=9333 \
  --no-first-run \
  --no-default-browser-check \
  --disable-session-crashed-bubble \
  >"$LOG" 2>&1 &
