#!/bin/bash
set -euo pipefail
umask 077
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$HOME/Desktop/Popz Bowling Payment Reviews.app"
FOLDER="$HOME/Desktop/Popz Bowling Public Beta"
STAGE="$HOME/Desktop/.PopzBowlingPaymentReviews-stage-$$.app"
PREV="$HOME/Desktop/.PopzBowlingPaymentReviews-previous-$$.app"
trap 'rm -rf "$STAGE"' EXIT

test -s "$ROOT/mac-billing-review/main.swift"
test -s "$ROOT/scripts/billing-review-owner.mjs"
test -s "$ROOT/icon-512.png"
test -d "$FOLDER"
mkdir -p "$STAGE/Contents/MacOS" "$STAGE/Contents/Resources"
cp "$ROOT/mac-billing-review/Info.plist" "$STAGE/Contents/Info.plist"
cp "$ROOT/scripts/billing-review-owner.mjs" "$STAGE/Contents/Resources/billing-review-owner.mjs"
cp "$ROOT/icon-512.png" "$STAGE/Contents/Resources/icon-512.png"
chmod 600 "$STAGE/Contents/Resources/billing-review-owner.mjs"

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

/usr/bin/swiftc -O -framework Cocoa "$ROOT/mac-billing-review/main.swift" \
     -o "$STAGE/Contents/MacOS/PopzPaymentReviews"
chmod 755 "$STAGE/Contents/MacOS/PopzPaymentReviews"
/usr/bin/plutil -lint "$STAGE/Contents/Info.plist"
/usr/bin/codesign --force --deep --sign - "$STAGE" >/dev/null
/usr/bin/codesign -v "$STAGE"

if [[ -e "$DEST" ]]; then mv "$DEST" "$PREV"; fi
mv "$STAGE" "$DEST"
if [[ -d "$PREV" ]]; then rm -rf "$PREV"; fi
SHORTCUT="$FOLDER/Popz Bowling Payment Reviews.app"
if [[ -L "$SHORTCUT" ]]; then
  rm "$SHORTCUT"
elif [[ -e "$SHORTCUT" ]]; then
  echo "ERROR: Destination already exists and is not a symlink: $SHORTCUT" >&2
  exit 2
fi
ln -s '../Popz Bowling Payment Reviews.app' "$SHORTCUT"
test -x "$SHORTCUT/Contents/MacOS/PopzPaymentReviews"
echo "INSTALL_SUCCESS: $DEST"
echo "SHORTCUT: $SHORTCUT"
echo "BUNDLE_ID: $(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$DEST/Contents/Info.plist")"
echo "SIGNED: $(/usr/bin/codesign -v "$DEST" >/dev/null 2>&1 && echo yes || echo no)"
