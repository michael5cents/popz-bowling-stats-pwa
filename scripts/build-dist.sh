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
  terms.html
  privacy.html
  refund-policy.html
  entry.js
  app.js
  runtime-monitor.js
  style.css
  service-worker.js
  manifest.webmanifest
  qa-tablet.webmanifest
  latest-version.json
  robots.txt
  sitemap.xml

  scoring.mjs
  transition-analytics.mjs
  stats-evaluation.mjs
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
  billing-client.mjs
  entitlements.mjs
  trial-policy.mjs
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
  payment/success/index.html
  payment/cancel/index.html
)

for rel in "${runtime_files[@]}"; do
  copy_required "$rel"
done

# Owner iPad uses an immutable QA pathname rather than a query-only shortcut.
# Generate from the canonical public shell to keep all app assets in sync.
mkdir -p "$DIST/qa-ipad"
python3 - "$DIST/index.html" "$DIST/qa-ipad/index.html" <<'PYQA'
from pathlib import Path
import sys
html=Path(sys.argv[1]).read_text()
assert '<head>' in html
html=html.replace('<head>','<head><base href="/"><meta name="robots" content="noindex,nofollow">',1)
# iOS Chrome may inspect the original HTML before entry.js swaps manifests.
# Set the QA install identity statically as well, so the icon never points to '/'.
assert 'id="popzAppManifest" href="./manifest.webmanifest"' in html
html=html.replace('id="popzAppManifest" href="./manifest.webmanifest"','id="popzAppManifest" href="/qa-tablet.webmanifest"',1)
html=html.replace('<meta name="apple-mobile-web-app-title" content="Popz Bowling">','<meta name="apple-mobile-web-app-title" content="Popz QA">',1)
html=html.replace('<title>Popz Bowling Stats</title>','<title>Popz Bowling QA - iPad</title>',1)
Path(sys.argv[2]).write_text(html)
PYQA

# Exact-name optional runtime files. These are not present in the current
# release, but remain explicitly allowlisted if restored later.
copy_optional live-share.css
copy_optional _redirects
copy_optional favicon.ico

# Precisely allowlist the public product marketing page. Excludes all docs and operator secrets.
site_files=(
  index.html
  styles.css
  script.js
  watch.html
  watch.css
  watch.js
  assets/00-install-gate-phone.png
  assets/04-scoring-progress-phone.png
  assets/06b-series-complete-phone.png
  assets/07-stats-phone.png
  assets/08-history-phone.png
  assets/12-pro-team-scoring.png
  assets/14-pro-google-sync.png
  assets/15-pro-lane-pair-tracking.png
  assets/16-pro-ball-line-results.png
  assets/17-pro-lane-transition-analysis.png
  assets/18-pro-performance-evaluations.png
  assets/Popz-Bowling-League-Night-Safari-Compatible.mp4
  assets/Popz-Bowling-League-Night-Poster.jpg
  assets/app-icon.png
  assets/bowling-lanes-anna-shvets-pexels-5952998.jpg
)
for rel in "${site_files[@]}"; do
  src="$ROOT/marketing/professional-site/$rel"
  dst="$DIST/features/$rel"
  if [[ ! -f "$src" ]]; then
    echo "ERROR: missing marketing runtime asset $rel" >&2
    exit 1
  fi
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
done

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
  firestore.commercial.rules
  firebase.commercial.emulator.json
  emulator-tests
  mac-founder-admin
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
