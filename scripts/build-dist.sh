#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$ROOT/dist"

rm -rf "$DIST"
mkdir -p "$DIST"

copy_required() {
  local rel="$1"
  if [[ ! -f "$ROOT/$rel" ]]; then
    echo "ERROR: missing required runtime file: $rel" >&2
    exit 1
  fi
  mkdir -p "$(dirname "$DIST/$rel")"
  cp "$ROOT/$rel" "$DIST/$rel"
}

copy_optional() {
  local rel="$1"
  if [[ -f "$ROOT/$rel" ]]; then
    mkdir -p "$(dirname "$DIST/$rel")"
    cp "$ROOT/$rel" "$DIST/$rel"
  fi
}

# Explicit browser/PWA runtime allowlist. Do not replace this with broad globs.
runtime_files=(
  index.html
  entry.js
  app.js
  runtime-monitor.js
  style.css
  service-worker.js
  manifest.webmanifest
  latest-version.json

  scoring.mjs
  history.mjs
  transfer.mjs
  backup-validation.mjs
  roll-undo.mjs
  update.mjs
  telemetry.mjs
  telemetry-client.mjs
  telemetry-milestones.mjs
  cloud-sync-core.mjs
  cloud-sync.mjs
  entitlements.mjs
  multiplayer.mjs
  layout-mode.mjs
  live-share.mjs
  live-share-client.mjs
  live-share-ui.mjs

  icon-192.png
  icon-512.png
  apple-touch-icon.png

  _headers

  live/index.html
  live/viewer.css
  live/viewer.mjs
)

for rel in "${runtime_files[@]}"; do
  copy_required "$rel"
done

# Exact-name optional runtime files. These are not present in the current
# release, but remain explicitly allowlisted if restored later.
copy_optional live-share.css
copy_optional _redirects
copy_optional favicon.ico

# Hard safety assertions: source, operator, config, test, and migration files
# must never be part of the Pages static output.
forbidden=(
  README.md
  TELEMETRY-ACCESS.md
  PRO-PLAN.md
  LIVE-SHARING.md
  COMMERCIALIZATION-ROADMAP.md
  USER-GUIDE.md
  wrangler.toml
  .firebaserc
  firebase.json
  firestore.rules
  firestore.indexes.json
  scripts
  monitoring
  migrations
  live-migrations
  runtime-migrations
  docs
  tests
  tools
  functions
  dashboard.mjs
  runtime.mjs
  live-share-server.mjs
)

for rel in "${forbidden[@]}"; do
  if [[ -e "$DIST/$rel" ]]; then
    echo "ERROR: forbidden source/operator path leaked into dist/: $rel" >&2
    exit 1
  fi
done

echo "Allowlisted Pages bundle built successfully:"
find "$DIST" -type f -print | sed "s#^$ROOT/##" | sort
