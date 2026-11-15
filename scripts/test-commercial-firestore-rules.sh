#!/bin/sh
# Offline/local-only rule evaluation. NEVER addresses live Firestore.
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
DEPS="${POPZ_RULES_TEST_DEPS:-$HOME/.cache/popz-firestore-rules-qa}"
JAVA_HOME="/usr/local/opt/openjdk"
NODE_HOME="$HOME/.nvm/versions/node/v24.15.0"
export JAVA_HOME
export POPZ_RULES_TEST_DEPS="$DEPS"
export PATH="$JAVA_HOME/bin:$NODE_HOME/bin:$PATH"
test -x "$DEPS/node_modules/.bin/firebase"
test -f "$ROOT/firestore.commercial.rules"
test -f "$ROOT/firebase.commercial.emulator.json"
cd "$ROOT"
exec "$DEPS/node_modules/.bin/firebase" emulators:exec \
 --only firestore \
 --config firebase.commercial.emulator.json \
 --project demo-popz-bowling-commercial-qa \
 "node emulator-tests/test-commercial-rules.mjs"
