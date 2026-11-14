# Popz Bowling Stats — Android Google Play Pilot
Date: November 14, 2026
Status: Development prototype; **not** a Play Store release

## Scope and decision
- Public Bowling only: `popz-bowling-stats-pwa`; never modify the separate Personal Bowling application.
- The November 14 conversation authorized **beginning Android development now**, superseding the October 5 roadmap's "PWA paid trial first" *for the start of Android prototyping only*. No decision was made to enable billing or release an app yet.
- Keep the existing public `https://popzbowling.com` PWA, its current beta users, IndexedDB and Firebase data, tablet layout, and Pro Preview unaffected. No production deploy in this pilot.
- The native client must bundle a scoring-capable local application; Google Play updates the Android package. Website/Cloudflare outages may disrupt optional online functions but must not prevent local scoring and History.

## Verified source baseline and staging
- Authoritative source: MacBook `~/popz-bowling-stats-pwa`, `main` at `06067e79eb4b` when branched. The office Mac fallback, GitHub origin and Gitea `main` matched that commit. A pre-existing uncommitted `tools/launch-qa-phone.sh` edit on main is deliberately left alone.
- Development worktree: `~/popz-bowling-play-android` on `feature/play-store-android`.
- Existing public live build: `public-v39.013`, deployed November 1, 2026. The Personal Bowling project was never touched.
- Native framework: Capacitor 8.6.2, bundled web assets from the existing strict allowlisted `dist/` build, no remote `server.url`.
- Proposed Android application ID: `com.popz.bowlingstats`. **Provisional:** confirm it before uploading/creating a Play Console app. Initial `versionCode=1`, `versionName=1.0` are debug placeholders.
- Android `minSdk=24`, `compileSdk=36`, `targetSdk=36`; Gradle 8.14.3 and local Temurin 21.
- Used the existing Popz Bowling icon for Android launcher/adaptive icon assets; final store artwork and splash QA are still required.

## Work completed
- The original 44-file Node suite passed: 78 tests, zero failures. The modified Android branch also passed all 78 tests.
- Native platform detection now treats Capacitor as an installed app so Automatic uses Compact Phone for smaller screens and Full Layout for tablets; regression tests cover both without changing PWA behavior.
- Native mode bypasses PWA service-worker and web-version update polling; Google Play will distribute the native package.
- Debug APK compiled successfully at `android/app/build/outputs/apk/debug/app-debug.apk`.
- On November 14, ADB installed the debug package alongside existing apps on Samsung Galaxy Z Fold3; the Bowl/Start a Series form, Pro Preview, and bottom navigation were visible. This is only a native launch smoke test, **not** a complete functional or offline validation.
- No paid purchase flow, Play Console app, signed release AAB, or production publishing has occurred.

## Unresolved requirements before closed testing or Play publication
1. **Local data / migration:** Chromium-installed PWA storage and Capacitor native app storage have different origins. **Do not assume bowling history migrates automatically.** Verify manual Export/Transfer JSON and import inside the native app, non-destructive merge and Google Sync rehydration, with representative user-owned backup copies before encouraging migration.
2. **Offline proof:** With all Popz web/backend endpoints unavailable, complete three games, finish the series, view History/Stats, kill/relaunch the native app, and verify the data remains. Validate backup/recovery without relying on Cloudflare.
3. **Google sign-in:** The existing Firebase `signInWithPopup` is web-oriented and should not be assumed to work in the Android WebView. Implement and test native-compatible Google Auth/Firestore Sync before advertising those features.
4. **Online APIs:** Telemetry and Share Live Scores presently call same-origin `/api/*` endpoints; a native `https://localhost` origin requires a configurable HTTPS API base, authorized CORS/security, and offline retry without blocking scoring. Cloud services must remain optional. Do not silently route real customer data to developer/test endpoints.
5. **Android device integration:** Verify back behavior, safe-area navigation, keyboard, Share/Transfer Backup, Import JSON, runtime permissions and screen orientations on actual phones, the Fold3, and tablet form factors. Preserve current Full Layout on tablets.
6. **Billing:** Free core must stay genuinely useful. A possible Lifetime Pro in-app digital purchase on Google Play needs Play Billing/verified server-controlled entitlements; Stripe remains a separate web checkout where permitted. No price, trial length, or AI Coach subscription model has been finalized. Existing qualifying Founder Pro access remains lifetime.
7. **Store compliance:** Developer-account verification, final fixed package ID, Play App Signing, secure upload key and signed AAB, Privacy Policy, Terms, Data Safety disclosure (including privacy-minimal beta telemetry), account/data deletion path, store listing/media, content rating, and required tester tracks.
8. **Release safety:** Test existing PWA intact on iOS/Android/tablet, confirm no data loss, run security scan and Play pre-launch tests. Get user review/approval before changing live releases or enabling paid feature gates.

## Google Play account step
- Visit https://play.google.com/console/ to create or open the developer account; account registration typically has a one-time $25 fee.
- For newly created **personal** developer accounts subject to Google's gate, closed testing generally requires at least 12 testers continuously opted in for 14 days before applying for production access. Account-specific Console guidance is authoritative.
- Android App Bundle (AAB), not this debug APK, is the eventual upload artifact. No signing keys should enter Git, Wiki, Collective, or chat.

## Documentation and source-control policy
Keep the October 5 PWA-first schedule as historical context; this staged native prototype implements the newer November 14 decision without modifying paid-PWA release milestones or assuming that billing is approved. Update Collective/Obsidian/Wiki when the pilot scope or runtime behavior is officially merged.
