# Popz Bowling Stats — Public PWA

Production URL: **https://popzbowling.com**

Current app version: **public-v39.002**

An offline-first bowling scoring and statistics app hosted on Cloudflare Pages, with optional Google Sync for automatic multi-device history.

## Separation from Michael's personal app
This repository is the public/friends version only. It is completely separate from Michael's personal bowling app (`bowling-stats-offline`) and has its own code, IndexedDB database, deployment, and update path. Changes here must not be applied to the personal app unless explicitly requested.

## Privacy and storage
- Bowling data is always stored locally in IndexedDB so scoring continues offline.
- No account is required. Without Google Sync, bowling history remains on that device only.
- public-v23 adds optional Google sign-in + Firestore sync. Signed-in users store completed series and the small set of cross-device settings under their Firebase UID so the same history appears after signing into another device with the same Google account. An in-progress series stays local until Finish Series.
- Firestore rules restrict `/users/{uid}` and every nested sync document to that authenticated UID; all other reads/writes are denied.
- public-v23 continues privacy-minimal anonymous product-usage events in the separate Cloudflare D1 telemetry database. Events identify only the random device ID, event type, app version, timestamp, installed/browser mode, and coarse platform. Scores, names, league names, centers, balls, oil patterns, averages, leaves, frames, and backup contents are never accepted by the telemetry endpoint.
- Anonymous usage & diagnostics are On by default and can be turned Off in Settings; adoption telemetry and runtime-diagnostic queues are stored separately from bowling backups.
- The installed PWA works offline after its files have been cached.
- Users protect their history with **Export Backup** and restore it with **Import JSON**.

## Install
Open **https://popzbowling.com** in a modern browser.
- Android/Chrome: tap the visible **Install App** button. If Chrome has not exposed its install prompt yet, refresh once and tap it again; the app also provides fallback instructions.
- iPhone/iPad: open the site in Safari, tap **Install App**, then follow **Share → Add to Home Screen → Add**.
- The Install App button hides when the app is already running in standalone installed mode.

## Current public-v33 behavior
- Default handicap for new series: **90% of 220**.
- Bowling-center filtering also limits the lane list and lane breakdown to that center.
- **Finish Series** first shows statistics for only the just-completed series, then offers **Continue to Overall Stats** for cumulative stats.
- If the entering average is blank, the app uses the stored running average for the same league or Practice when available; **Entering / Current Average** remains editable during bowling and immediately updates handicap.
- League average rules are configurable per league in **Settings → League Average Rule**. A league can keep carrying its book average, or use the book average only until a chosen number of actual games is completed; after that threshold, the app uses the whole-number actual pinfall average with the fraction dropped.
- PWA manifest, icons, service worker, and offline cache are versioned for public-v33.
- **Google Sync** is a Pro-designated feature and is visibly labeled **PRO PREVIEW** while preview access is enabled. First sign-in merges existing local completed history with the user's private Firestore history, then subsequent devices use the same merge/tombstone rules automatically. Bowler name, saved team-bowler profiles, and per-league average rules sync; device-specific Stats filters do not.
- **Quick Scoring remains the default in public-v33.** Users enter only how many pins fell on each roll; scoring, strikes, spares, opens, 10th-frame logic, handicap, history, and normal statistics continue to work without a standing-pin step. After a non-strike first ball, Quick mode offers a one-tap **Mark Split** flag so overall Split Conversion % remains accurate without identifying exact pins. The Split flag can also be corrected later in the frame editor. **Detailed Scoring** is available in Settings for users who want the exact standing-pin pattern, single-pin/10-pin detail, and per-leave conversion analytics.
- **Advanced Shot Tracking** is a Pro-designated feature and remains **off by default**. A bowler must explicitly enable it in **Settings -> Advanced Shot Tracking** before the Ball + Stand Board + Target Board controls appear or new frame-level setup snapshots are recorded. Normal game-level Ball and Lane tracking remains available while it is off. The preference is device-local, so enabling it on one device does not silently enable it on another. Previously recorded setup history remains visible and is never erased by turning the preference off.
- **Team / Multi-Bowler scoring was introduced in public-v31 and remains a Popz Bowling Pro feature in public-v33.** One device can score 2–12 bowlers in bowling order. Each bowler gets an independent linked series with separate entering average, handicap, scores, History, Stats, backup data, and cloud records. The scorer can tap a bowler tab to switch manually between frames, and the app advances automatically after each completed frame. During **PRO PREVIEW** it is unlocked for testing.
- Signed-in users sync when the app opens/returns online or foreground, after important completed-history/settings changes, and on a 60-second background check while open. Manual **Sync now** is also available.
- Export / Import / Share Backup remains available as recovery and manual-transfer fallback.
- Anonymous telemetry tracks first seen/app opens plus the activation funnel: Bowl viewed, series setup shown, series started, first roll recorded, game completed, and series completed. It also tracks Stats/History/Help/Settings views, backup export/share/import usage, Google sign-in use, and manual cloud-sync use. It does not receive the Google identity, bowling content, or cloud documents. Events queue locally while offline and flush when connectivity returns.
- **public-v32 hardens telemetry against QA contamination.** WebDriver and HeadlessChrome sessions are suppressed automatically, `?qa=1` (or `?telemetry=off`) explicitly suppresses telemetry for production QA, and entering QA mode clears any queued test telemetry before it can flush later. The dashboard now says **profiles seen** instead of implying those profiles actually bowled; an app open alone qualifies as "seen." Historical rows are cleaned only when a profile is positively identified as QA.
- **public-v33 makes bowling-milestone telemetry recoverable after dead spots or app restarts.** New v33+ series store only a privacy-minimal telemetry eligibility/origin marker plus milestone timestamps alongside the local series. Series start, first roll, game completion, and series completion use deterministic event IDs and are reconciled from saved state at startup, foreground/connectivity return, and while the app remains open. Queued events are removed only after a complete server acknowledgement, and acknowledged milestone IDs are retained locally to prevent duplicate counts. Team / Multi-Bowler sessions still count once per team milestone, synced/imported series never replay telemetry on another device, and telemetry-off/QA series are not later backfilled. Pre-v33 bowling history is intentionally not reconstructed into the telemetry baseline.
- public-v27 adds `settings_viewed` on entry to Settings (not on background redraws). It uses the existing opt-out and offline queue and sends no settings values. Dashboard Event totals lists it after the first received event; past visits cannot be backfilled.
- Feedback opens an email addressed to `feedback@popzbowling.com` with subject **Popz Bowling Stats** and includes the app version/device information.
- Built-in **Help** tab provides a complete user guide with Print / Save Guide support.
- Storage protection: requests persistent browser storage and automatically downloads a JSON safety backup after every finished series.
- **Share / Transfer Backup** sends the full JSON backup through the device share sheet when file sharing is supported, with automatic download fallback. **Import JSON now merges histories**: device-only series are retained, missing series are added, and a matching series ID uses the newer copy. An in-progress local series is never overwritten by import.
- Completed series can be expanded in **History** to enter or correct the official **Entering Average** later; handicap and league running-average stats recalculate immediately.
- Update awareness is dual-signal in public-v24. The app checks uncached production `latest-version.json` at startup, again after 2 and 10 seconds, when returning to the foreground, when connectivity returns, and every 10 minutes while open. It also forces a service-worker update check; newly activated workers broadcast `POPZ_UPDATE_READY` to open clients. Either signal can raise the persistent **Update available — close and reopen** banner, and a service-worker signal stays authoritative even if an edge briefly serves a stale version file.

## Hosting and deployment
- **public-v34 adds Share Live Scores (Pro / Pro Preview)** while retaining public-v33 telemetry. It is strictly for one selected bowler's current live series—not the Stats screen, History, past series, or backups. Start sharing from Bowl, send the read-only link, and stop anytime, including after finishing. Team sharing stays with the chosen bowler. Live snapshots use their own D1 database, never telemetry; the private app is untouched. See [LIVE-SHARING.md](LIVE-SHARING.md) for usage, privacy, expiry and deployment details.
- **public-v35 adds runtime-health monitoring without depending on the main app module.** `runtime-monitor.js` loads before `app.js`, records privacy-safe `boot_started` / `app_ready` milestones plus sanitized script/stylesheet load errors, uncaught errors, and unhandled promise rejections. Reports use a separate D1 database (`popz-bowling-runtime`) and endpoint (`/api/runtime`), are suppressed for WebDriver/HeadlessChrome/`?qa=1`, and follow the same Anonymous usage & diagnostics On/Off setting. If the main app does not become ready within 8 seconds, the user sees a recovery message while their saved bowling data remains untouched. `/api/health` checks telemetry/live-share/runtime database bindings and reports only coarse recent-error/startup-failure flags for external availability monitoring.
- Production: Cloudflare Pages project `popzbowling`.
- Primary custom domain: `popzbowling.com`.
- Cloudflare Pages default domain: `popzbowling.pages.dev`.
- Source of truth: GitHub `michael5cents/popz-bowling-stats-pwa`.
- Secondary backup: Gitea `michael5cents/popz-bowling-stats-pwa` on the private LAN.
- Cloudflare deployment is currently performed with Wrangler rather than Git integration.
- Pages Functions endpoint `/api/telemetry` writes adoption events to D1 database `popz-bowling-telemetry` through binding `TELEMETRY_DB`. `/api/runtime` writes privacy-safe startup/error diagnostics to separate D1 `popz-bowling-runtime` through `RUNTIME_DB`. `/api/health` probes telemetry, live-sharing, and runtime dependencies without returning bowling or identity data; `scripts/telemetry-report.sh` remains available for aggregate usage counts.
- Google Sync backend: Firebase project `popz-bowling-stats`, Google Authentication, and Firestore `(default)` in `nam5`. Firebase configuration/rules are kept in `.firebaserc`, `firebase.json`, `firestore.rules`, and `firestore.indexes.json`.
- Private aggregate dashboard: `https://popzbowling.com/telemetry-dashboard`. It is protected by HTTP Basic Auth (`michael` + Cloudflare secret `TELEMETRY_DASHBOARD_PASSWORD`), is `noindex`, uses `no-store`, renders adoption metrics plus runtime-health cards/latest sanitized errors—never raw device/runtime IDs or bowling data—and automatically refreshes every 60 seconds.
- External production alerts are delivered through Michael's existing Telegram bot from the always-on PopzVPS. `monitoring/telegram-health-monitor.mjs` checks the live version, homepage, runtime monitor, app bundle, service worker, and `/api/health` every five minutes via user cron. New failures alert immediately, the same unresolved failure repeats after a 15-minute cooldown, and recovery sends a separate message. Telegram credentials stay outside Git in a mode-600 PopzVPS environment file. The previous hourly ChatGPT Popz Bowling Health task is disabled to avoid duplicate alerts.
- Dashboard access runbook: `TELEMETRY-ACCESS.md`. Normal terminal access is one command: `./scripts/telemetry-dashboard-fetch.sh > /tmp/popz-telemetry-dashboard.html`. The password itself is never committed; the script reads it from macOS Keychain service `popzbowling-telemetry-dashboard`, account `michael`. If Keychain is missing the credential, run `./scripts/telemetry-dashboard-init.sh` once.

Release rule: every public release must update `APP_VERSION`, `SW_VERSION`, service-worker/cache asset versions, and `latest-version.json` to the same version. Both `latest-version.json` and `service-worker.js` are served with `Cache-Control: no-store`; service-worker registration uses `updateViaCache: 'none'` so installed copies always check the current worker.

Example production deploy from this repository:
```bash
COMMIT=$(git rev-parse HEAD)
npx --yes wrangler@latest pages deploy . --project-name=popzbowling --branch=main --commit-hash="$COMMIT" --commit-message="$(git log -1 --pretty=%s)"
```

## Development
```bash
./start-local.sh
```
Then open `http://localhost:8080`.

- **Delete League / Category** removes every saved series under any selected league/category name. Deletion markers travel with backups/imports so older device backups do not resurrect deleted history; an active receiving-device series remains protected.

- **History is grouped by League / Category first, then by Date** so all series from the same league stay together while each bowling date remains easy to scan.

## Commercialization note
public-v26 is the first visible **Pro Preview** release. The header and Settings show the effective plan (`Free`, `Pro Preview`, or `Pro`), and premium features use the same entitlement system. Google Sync and Advanced Shot Tracking are gated there, and public-v31 adds Team / Multi-Bowler scoring to that Pro family. Pro Preview remains enabled, so current testers lose nothing. Pricing and checkout are still undecided. See `PRO-PLAN.md`.

## public-v36 — Share Live Scores clarity + runtime diagnostics operator fix
- User-facing **Share My Scores** wording is renamed to **Share Live Scores**. The Bowl panel, Help, spectator page, User Guide, and Pro documentation state that it follows only the selected bowler's current live series; it cannot browse/share the Stats screen, History, past series, backups, or other bowlers. The final summary remains available because it is calculated only from that same live session.
- The 2026-10-01 runtime incident was recovered directly from `popz-bowling-runtime`: at 02:05:16 CDT an iOS browser reported `resource_error / stylesheet_load` for `live-share.css`. The live-share panel CSS is now part of the main versioned stylesheet instead of being dynamically injected, eliminating that separate critical stylesheet load path.
- The service worker now falls back to `index.html` only for navigation requests. Failed CSS/script/module fetches return an error rather than accidentally receiving the app shell as the wrong content type.
- `scripts/runtime-errors.sh [hours] [limit]` provides a repeatable operator command that reads the exact sanitized runtime-error rows directly from the configured `RUNTIME_DB` D1 database using its bound database ID.

## public-v37 — clearer protection status + compact live sharing
- The Stats hero no longer presents **Export Backup** as the primary data-protection action. Signed-in users see their Google Sync state there; a healthy account shows **✓ Google Sync — Up to date**, syncing/error states are explicit, and a sync error can be retried from the hero. Signed-out users see **Protect My Data**, which takes them directly to the Google Sync section in Settings.
- Manual JSON export remains available in Settings and History as an extra recovery/transfer tool. Settings now describes it as an **Extra manual backup / recovery copy** so it is not confused with Google Sync.
- **Share Live Scores** is collapsed to a compact Bowl-screen control by default. Tapping it opens the explanation and Start Sharing controls; **Not Now** collapses it without sharing. After sharing starts, the compact control can be hidden again and visibly shows **LIVE** while the spectator link is active.

## public-v37.1 — persistent bottom navigation
- Hardened the five-button bottom navigation for mobile/PWA Settings screens: fixed positioning is forced into its own compositor layer above Settings content, safe-area space is reserved at the bottom of the document, and every tab selection resets the new view to the top. This prevents users from having to scroll through the long Settings page to recover the Stats/Bowl/History/Help/Settings controls.

## public-v37.002 — Settings navigation patch
- Minor-fix versioning now uses the `public-v37.xxx` patch format rather than consuming a new major app version.
- The bottom five-button navigation is now part of the fixed app-shell layout. Header and bottom navigation remain outside the scrollable content area; only `mainContent` scrolls. This avoids mobile Safari/PWA fixed-footer behavior on the long Settings screen.
- Switching views resets the internal content scroller to the top. Print mode explicitly restores normal page flow so the Help guide still prints correctly.
- Regression coverage verifies the nav is inside `appShell`, Settings scrolls inside `mainContent`, the browser window position does not change, and the nav remains visible at both the top and bottom of Settings on a 390x844 mobile viewport.

## public-v37.003 — live sharing offered before first score
- **Share Live Scores stays hidden during series setup.** After the bowler presses **Start Series**, the sharing panel opens automatically before scoring begins.
- The bowler can choose **Start Sharing → Share Link** to open the device share sheet and select Telegram, Google Messages, email, another compatible messaging app, and the recipient. **Not Now** collapses the panel and moves focus to scoring without sharing.
- In Team / Multi-Bowler mode, the same pre-score prompt opens after the linked team series is created; the selected bowler remains the live-share target even as turns rotate.
- An already-active/final live share remains manageable after Finish Series so the owner can still stop/revoke its spectator link.

## public-v37.004 — persistent collapsed Share Live Scores bar
- Share Live Scores is **not shown during the initial Start a Series setup**.
- After **Start Series**, a small **collapsed** Share Live Scores bar appears and remains visible throughout scoring. It never auto-opens.
- If the bowler ignores it, it simply stays collapsed. Tapping **Open** reveals the explanation and sharing controls; closing it returns to the compact bar.
- The same behavior applies to Single Bowler and Team / Multi-Bowler sessions. An active/final share remains manageable after the series so its spectator link can still be shared or revoked.

## public-v38 — Compact Phone layout
- Adds a dedicated **Compact Phone** Bowl experience without changing the established tablet/desktop layout.
- **Automatic** is the default: Compact Phone activates only when Popz Bowling is running as an installed PWA and the screen's short side is 500 CSS pixels or less. An installed iPad/Samsung tablet stays on the current Full Layout; a phone-sized regular browser also stays Full.
- **Settings → Layout** is device-local and offers **Automatic**, **Compact Phone**, and **Full Layout**. The preference is stored only on that device and is excluded from Google Sync and bowling backups. Compact Phone can be forced on a larger device for testing, including foldables.
- Compact setup keeps Date, League, Bowling Alley, and Number of Games prominent, with Oil Pattern, Entering Average, handicap settings, and Series Name under **More Series Options**.
- Compact scoring adds a Game/Frame/Score/Series header, larger five-column scoring buttons, always-accessible Ball/Lane fields, horizontally scrollable score frames and team bowler controls, **More Scoring Details** for secondary/Advanced Shot Tracking controls, and a clear bottom **Finish Series** action.
- Existing Share Live Scores behavior is preserved: absent during initial setup, then shown as a collapsed bar after Start Series and throughout scoring.
- Tablet protection is regression-tested against the previous production layout at 820×1180; key setup/scoring geometry and computed styles remain identical.

## public-v39 — install-only website entry
- The normal production visit to **https://popzbowling.com** is now an installation gate rather than the bowling application. Browser visitors see the branded **Install Popz Bowling** screen; Stats/Bowl/History/Settings do not initialize or display.
- The full bowling app initializes only when the production site is running in installed/standalone PWA mode. This also keeps browser-only visits from opening the bowling IndexedDB, starting Google Sync, or starting normal adoption telemetry.
- Android/Chromium uses the browser's native beforeinstallprompt flow when available. iPhone/iPad keeps the visitor on the install screen and shows Safari **Share -> Add to Home Screen -> Add** instructions after the button is tapped.
- After installation, the browser page stays on the gate and tells the user to launch Popz Bowling from the Home Screen or app launcher; it does not reveal the app in the browser.
- `/live/` spectator pages and API endpoints are not gated.
- The v39 service worker uses network-first navigation with the cached `index.html` fallback so installed PWAs continue to work offline while online launches pick up current entry/update behavior promptly.
- Regression coverage verifies production-host browser gating, no bowling IndexedDB/adoption telemetry boot on the gate, iOS instructions, Android native-prompt handling, installed-PWA access, and spectator-page bypass.

## public-v39.001 — install-gate startup watchdog fix
- Fixes a false red `Popz Bowling did not finish loading` warning introduced by the v39 install-only website entry.
- The install gate now explicitly marks the entry as successfully loaded before intentionally stopping bowling-app initialization, so the 8-second runtime watchdog stays quiet on a healthy install screen.
- The real installed-PWA startup watchdog is unchanged and still reports genuine app startup failures.
- Regression QA leaves the browser install gate open beyond 8 seconds and confirms no load-failure alert appears; Compact Phone and live/offline scoring regressions remain green.

## public-v39.002 — Bowl is the universal landing screen
- The installed Popz Bowling app now opens directly on **Bowl** on every supported layout: Compact Phone, Full Layout, phones, tablets, and larger installed devices.
- **Stats** remains one tap away in the bottom navigation for review at any time; it is no longer the startup landing panel.
- **Reopen App** also returns to Bowl instead of Stats.
- If an active series already exists, landing on Bowl immediately shows that active scoring session; otherwise the user sees Start a Series.
- This release also includes the v39.001 install-gate startup-watchdog correction so a healthy install page no longer shows the false red load-failure warning after 8 seconds.
- Regression QA verifies phone/tablet Bowl landing, Reopen -> Bowl, install-gate watchdog behavior, Compact Phone, live sharing, offline scoring, team isolation, and service-worker behavior.
