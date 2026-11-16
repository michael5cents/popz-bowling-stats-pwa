#!/bin/bash
set -euo pipefail
umask 077

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$HOME/Desktop/Popz Bowling Founder Admin.app"
STAGE="$HOME/Desktop/.PopzBowlingFounderAdmin-stage-$$.app"
PREV="$HOME/Desktop/.PopzBowlingFounderAdmin-previous-$$.app"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$STAGE/Contents/MacOS" "$STAGE/Contents/Resources"
cp "$ROOT/mac-founder-admin/Info.plist" "$STAGE/Contents/Info.plist"
cp "$ROOT/scripts/founder-admin.mjs" "$STAGE/Contents/Resources/founder-admin.mjs"
cp "$ROOT/scripts/founder-admin-core.mjs" "$STAGE/Contents/Resources/founder-admin-core.mjs"
cp "$ROOT/icon-512.png" "$STAGE/Contents/Resources/icon-512.png"

# Finder/Dock icon made locally from existing Popz Bowling artwork.
ICONSET="$STAGE/Contents/Resources/AppIcon.iconset"
mkdir -p "$ICONSET"
for item in "16:icon_16x16" "32:icon_16x16@2x" "32:icon_32x32" \
            "64:icon_32x32@2x" "128:icon_128x128" "256:icon_128x128@2x" \
            "256:icon_256x256" "512:icon_256x256@2x" "512:icon_512x512" \
            "1024:icon_512x512@2x"; do
  IFS=: read -r pixels name <<< "$item"
  /usr/bin/sips -z "$pixels" "$pixels" "$ROOT/icon-512.png" \
    --out "$ICONSET/$name.png" >/dev/null
done
/usr/bin/iconutil -c icns -o "$STAGE/Contents/Resources/AppIcon.icns" "$ICONSET"
rm -rf "$ICONSET"

/usr/bin/swiftc -O -framework Cocoa "$ROOT/mac-founder-admin/main.swift" \
    -o "$STAGE/Contents/MacOS/PopzFounderAdmin"
chmod 755 "$STAGE/Contents/MacOS/PopzFounderAdmin"
chmod 600 "$STAGE/Contents/Resources/"*.mjs
/usr/bin/plutil -lint "$STAGE/Contents/Info.plist"
/usr/bin/codesign --force --deep --sign - "$STAGE" >/dev/null

if [[ -e "$DEST" ]]; then mv "$DEST" "$PREV"; fi
mv "$STAGE" "$DEST"
if [[ -d "$PREV" ]]; then rm -rf "$PREV"; fi

echo "INSTALL_SUCCESS: $DEST"
echo "BUNDLE_ID: $(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$DEST/Contents/Info.plist")"
echo "SIGNED: $(/usr/bin/codesign -v "$DEST" >/dev/null 2>&1 && echo yes || echo no)"
