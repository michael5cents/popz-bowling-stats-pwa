# Popz Bowling Stats — Public PWA

Production URL: **https://popzbowling.com**

Release under validation: **public-v39.013**. Production verification is pending; the previous release is public-v39.012.

An offline-first bowling scoring and statistics app hosted on Cloudflare Pages, with optional Google Sync for automatic multi-device history.

## Separation from Michael's personal app
This repository is the public/friends version only. It is completely separate from Michael's personal bowling app (`bowling-stats-offline`) and has its own code, IndexedDB database, deployment, and update path. Changes here must not be applied to the personal app unless explicitly requested.

## Privacy and storage
- Bowling data is always stored locally in IndexedDB so scoring continues offline.
- No account is required. Without Google Sync, bowling history remains on that device only.
- public-v23 adds optional Google sign-in + Firestore sync. Signed-in users store completed series and the small set of cross-device settings under their Firebase UID so the same history appears after signing into another device with the same Google account. An in-progress series stays local until Finish Series.
- Firestore rules restrict `/users/{uid}` and every nested sync document to that authenticated UID; all other reads/writes are denied.
- public-v23 continues privacy-minimal anonymous product-usage events in the separate Cloudflare D1 telemetry database. Events identify only the random device ID, event type, app version, timestamp, installed/browser mode, and coarse platform. Scores, names, league names, centers, balls, oil patterns, averages, leaves, frames, and backup contents are never accepted by the telemetry endpoint.
- During the public beta, anonymous usage telemetry and privacy-safe runtime diagnostics are required and cannot be disabled by normal users. They remain separate from bowling backups and never accept scores, bowler names, leagues, centers, balls, oil patterns, leaves, frames, backups, or Google identity.
- The installed PWA works offline after its files have been cached.
- Optional Google Sync is the primary cross-device protection path for signed-in users. **Export Backup / Share Backup / Import JSON** remain manual recovery and transfer fallbacks.

## Install
Open **https://popzbowling.com** in a modern browser.
- Android/Chrome: tap the visible **Install App** button. If Chrome has not exposed its install prompt yet, refresh once and tap it again; the app also provides fallback instructions.
- iPhone/iPad: open the site in Safari, tap **Install App**, then follow **Share → Add to Home Screen → Add**.
- The Install App button hides when the app is already running in standalone installed mode.

## Current public-v39.013 behavior
- Default handicap for new series: **90% of 220**.
- Bowling-center filtering also limits the lane list and lane breakdown to that center.
- **Finish Series** first shows statistics for only the just-completed series, then offers **Continue to Overall Stats** for cumulative stats.
- If the entering average is blank, the app uses the stored running average for the same league or Practice when available; **Entering / Current Average** remains editable during bowling and immediately updates handicap.
- League average rules are configurable per league in **Settings → League Average Rule**. A league can keep carrying its book average, or use the book average only until a chosen number of actual games is completed; after that threshold, the app uses the whole-number actual pinfall average with the fraction dropped.
- PWA manifest, icons, service worker, and offline cache are versioned for **public-v39.013**.
- **Google Sync** is a Pro-designated feature and is visibly labeled **PRO PREVIEW** while preview access is enabled. First sign-in merges existing local completed history with the user's private Firestore history, then subsequent devices use the same merge/tombstone rules automatically. Bowler name, saved team-bowler profiles, and per-league average rules sync; device-specific Stats filters do not.
- **Quick Scoring remains the default in public-v39.013.** Users enter only how many pins fell on each roll; scoring, strikes, spares, opens, 10th-frame logic, handicap, history, and normal statistics continue to work without a standing-pin step. After a non-strike first ball, Quick mode offers a one-tap **Mark Split** flag so overall Split Conversion % remains accurate without identifying exact pins. The Split flag can also be corrected later in the frame editor. **Detailed Scoring** is available in Settings for users who want the exact standing-pin pattern, single-pin/10-pin detail, and per-leave conversion analytics.
- **Advanced Shot Tracking** is a Pro-designated feature and remains **off by default**. A bowler must explicitly enable it in **Settings -> Advanced Shot Tracking** before the Ball + Stand Board + Target Board controls appear or new frame-level setup snapshots are recorded. Normal game-level Ball and Lane tracking remains available while it is off. The preference is device-local, so enabling it on one device does not silently enable it on another. Previously recorded setup history remains visible and is never erased by turning the preference off.
- **Team / Multi-Bowler scoring was introduced in public-v31 and remains a Popz Bowling Pro feature in public-v39.013.** One device can score 2–12 bowlers in bowling order. Each bowler gets an independent linked series with separate entering average, handicap, scores, History, Stats, backup data, and cloud records. The scorer can tap a bowler tab to switch manually between frames, and the app advances automatically after each completed frame. During **PRO PREVIEW** it is unlocked for testing.
- Signed-in users sync when the app opens/returns online or foreground, after important completed-history/settings changes, and on a 60-second background check while open. Manual **Sync now** is also available.
- Export / Import / Share Backup remains available as recovery and manual-transfer fallback.
- Anonymous telemetry tracks first seen/app opens plus the activation funnel: Bowl viewed, series setup shown, series started, first roll recorded, game completed, and series completed. It also tracks Stats/History/Help/Settings views, backup export/share/import usage, Google sign-in use, and manual cloud-sync use. It does not receive the Google identity, bowling content, or cloud documents. Events queue locally while offline and flush when connectivity returns.
- **QA protection:** WebDriver and HeadlessChrome sessions are suppressed automatically. `?qa=1` is the explicit internal production-QA path and clears/suppresses QA telemetry; `?telemetry=off` is no longer a user-accessible opt-out during beta. The dashboard says **profiles seen** because an app open alone qualifies as seen and does not mean a series was bowled.
- **Durable bowling milestones:** Series start, first roll, game completion, and series completion use deterministic event IDs and are reconciled from saved local state after dead spots or app restarts. Queued events are removed only after a complete server acknowledgement. public-v39.004 starts telemetry marker version 2, so pre-reset version-1 markers and old queued events cannot replay into the fresh baseline. Team / Multi-Bowler sessions still count once per team milestone, and synced/imported series do not replay telemetry on another device.
- `settings_viewed` is recorded on entry to Settings (not on background redraws) and sends no settings values. Since the public-v39.004 clean-baseline reset, beta usage events follow the required telemetry policy and durable v2 queue; public-v39.010 retains that behavior.
- Feedback opens an email addressed to `feedback@popzbowling.com` with subject **Popz Bowling Stats** and includes the app version/device information.
- Built-in **Help** tab provides a complete user guide with Print / Save Guide support.
- Storage protection: requests persistent browser storage and automatically downloads a JSON safety backup after every finished series.
- **Share / Transfer Backup** sends the full JSON backup through the device share sheet when file sharing is supported, with automatic download fallback. **Import JSON now merges histories**: device-only series are retained, missing series are added, and a matching series ID uses the newer copy. An in-progress local series is never overwritten by import.
- **Stats/History cleanup in public-v39.008:** the top Stats summary remains visible, while detailed Stats panels start collapsed with per-device Show/Hide state. League/category rows inside Stats also start collapsed. History is grouped by league/category and those groups now start collapsed, so long histories are easier to scan before opening a specific series. Completed series can still be expanded to enter or correct the official **Entering Average**; handicap and league running-average stats recalculate immediately.
- **Runtime telemetry hardening in public-v39.009:** failed injected or third-party scripts no longer count as Bowling runtime failures. `resource_error` is limited to the app-owned critical resources `entry.js`, `app.js`, and `style.css`; real uncaught JavaScript errors and unhandled promise rejections remain reported normally.
- **Telemetry delivery repair in public-v39.010:** queued usage milestones are cleared only after the server confirms that the submitted events were stored. Delayed and offline milestones can retry without treating receipt alone as durable storage.
- Update awareness is dual-signal in public-v24. The app checks uncached production `latest-version.json` at startup, again after 2 and 10 seconds, when returning to the foreground, when connectivity returns, and every 10 minutes while open. It also forces a service-worker update check; newly activated workers broadcast `POPZ_UPDATE_READY` to open clients. Either signal can raise the persistent **Update available — close and reopen** banner, and a service-worker signal stays authoritative even if an edge briefly serves a stale version file.

## public-v39.013 — Compact Phone scoring and Stats
- **Stable scoring keypad:** phone pin buttons keep fixed positions for 1–10; impossible pin counts are disabled rather than making the remaining buttons move. A separate **Miss / Undo / Split** row keeps the common actions together. Split retains the existing Quick Scoring eligibility and visibly indicates when marked.
- **Clear game actions:** Next Bowler, Start Next Game, and Finish Series prompts use the full keypad width when appropriate. **Game details & actions** groups Ball, Lane, entering average/handicap details, New Game, Delete Current Game, and manual Finish Series. Team rotation scrolls the active bowler tab into view.
- **Stats first:** the phone Stats summary appears before a collapsed **Filters** control. The selected-filter summary stays visible while the filters are closed; opening or closing the panel does not change the filters.
- **More usable phone space:** a smaller header, larger form text and touch targets, and notices near the top keep scoring controls clearer. Short landscape phone screens place the scorecard and keypad side by side.
- **Full Layout is preserved:** the presentation changes are scoped to Compact Phone. Tablet/desktop Full Layout, scoring rules, saved data, Google Sync, and live-sharing behavior retain their existing scope.

Michael reviewed the candidate in the existing Pixel 7 emulator and approved publication. **public-v39.013 is deployed and verified** at popzbowling.com as of November 1, 2026, 15:41:49 CST. Source/deploy commit: `3cbcf961dc46f53ed51e3c25e1f4a2a4f81c48e0`. Validation, update/install checks, and production evidence are in [the v39.013 release record](docs/releases/2026-11-01-public-v39.013-compact-phone.md). Existing users keep the installed app and their saved data; an update notice asks them to close and reopen, without reinstalling.

## public-v39.012 — Reliability and data protection
- **Google Sync:** cloud-bound copies omit undefined object properties, including nested optional fields, without changing the local record. New single-bowler series omit unused team linkage fields. The new Undo action history remains device-local.
- **Team Undo:** a persisted, device-local action history follows the latest recorded roll in single-bowler and team scoring, including automatic rotation and manual bowler selection, supports repeated Undo after reload, and restores the correct bowler. Frame edits, game changes, series changes, and a successful backup import establish a boundary so Undo cannot alter earlier or unrelated data. Pre-update team rolls without recorded action order remain correctable through the frame editor.
- **Backup import:** the complete backup structure is validated before merging or saving. Invalid session, game, frame, or settings data rejects the import as a whole, leaving the existing history and settings intact. Valid legacy backups still use the established non-destructive merge rules.
- **Offline app shell:** only app-shell navigation may refresh the cached startup page. Dashboard/login pages and API responses stay outside the app cache and cannot replace the offline scoring entry point. Precached fetch responses are fully consumed before CacheStorage writes so fresh offline installation completes reliably.
- **Health reporting:** failed runtime-diagnostic queries are reported as an unhealthy or unavailable dependency instead of being interpreted as zero errors and a healthy result.
- **Update consistency:** the client, manifest, service worker, cache names, version file, and versioned app assets advance together to public-v39.012.
- **Missing entering averages:** a blank or missing saved entering average is skipped when finding the carry-book seed; it is not converted into a zero average. A later valid entering average can supply the book seed.

Verification and deployment status are tracked in [the v39.012 release record](docs/releases/2026-11-01-public-v39.012-reliability.md). Production was verified November 1, 2026 at 14:52:32 CST on public-v39.012; release/source `d651a037a8279e2df0be817fc25cfdc084b15f54`.

## public-v39.011 — Whole-number bowling averages and handicap
- Bowling averages are displayed as whole numbers with the fractional portion **dropped**, never rounded. This includes Stats, league book/latest/next-week averages, ball/center/lane/oil breakdowns, History entering averages, single/team series summaries, roster auto-average hints, score-screen handicap text, and the public live spectator final summary.
- **Handicap uses the whole-number entering average before applying the handicap percentage.** Example: 180.8 at 90% of 220 uses 180, giving 36 pins/game rather than 35. This is enforced by the shared scoring engine for single/team sessions, live sharing, and historical decimal inputs imported from earlier releases.
- Entering-average inputs display whole numbers and new/edited series store a whole-number entering average. Underlying pinfall and mathematical aggregate averages remain precise for analytics; strike/spare/leave percentages and other rates retain decimal precision. No historical scores, games, or cloud records are rewritten during upgrade.
- All public client/service-worker asset versions advance to v39.011 for installed/offline PWA updates. New regression tests cover fractional handicap edge cases, public display surfaces, and spectator results. The personal Bowling app is unchanged.

## Hosting and deployment
- **Share Live Scores (introduced in public-v34; Pro / Pro Preview)** is strictly for one selected bowler's current live series—not the Stats screen, History, past series, or backups. Team sharing stays with the chosen bowler. Live snapshots use their own D1 database and remain isolated from adoption/runtime telemetry. See [LIVE-SHARING.md](LIVE-SHARING.md) for usage, privacy, expiry and deployment details.
- **Runtime-health monitoring:** `runtime-monitor.js` loads before `app.js`, records privacy-safe `boot_started` / `app_ready` milestones plus sanitized failures of app-owned critical resources (`entry.js`, `app.js`, and `style.css`), uncaught errors, and unhandled promise rejections. Injected/third-party script failures are ignored so they cannot falsely degrade Bowling runtime health. Reports use a separate D1 database (`popz-bowling-runtime`) and endpoint (`/api/runtime`). During beta they are required for normal users and suppressed only for `?qa=1`, WebDriver, or HeadlessChrome. If the main app does not become ready within 8 seconds, the user sees a recovery message while saved bowling data remains untouched.
- Production: Cloudflare Pages project `popzbowling`.
- Primary custom domain: `popzbowling.com`.
- Cloudflare Pages default domain: `popzbowling.pages.dev`.
- Source of truth: GitHub `michael5cents/popz-bowling-stats-pwa`.
- Secondary backup: Gitea `michael5cents/popz-bowling-stats-pwa` on the private LAN.
- Cloudflare deployment is currently performed with Wrangler rather than Git integration.
- Pages Functions endpoint `/api/telemetry` writes adoption events to D1 database `popz-bowling-telemetry` through binding `TELEMETRY_DB`. `/api/runtime` writes privacy-safe startup/error diagnostics to separate D1 `popz-bowling-runtime` through `RUNTIME_DB`. `/api/health` probes telemetry, live-sharing, and runtime dependencies without returning bowling or identity data; `scripts/telemetry-report.sh` remains available for aggregate usage counts.
- Google Sync backend: Firebase project `popz-bowling-stats`, Google Authentication, and Firestore `(default)` in `nam5`. Firebase configuration/rules are kept in `.firebaserc`, `firebase.json`, `firestore.rules`, and `firestore.indexes.json`.
- Private aggregate dashboard: `https://popzbowling.com/telemetry-dashboard`. Browser access uses a normal HTTPS password page and a Secure/HttpOnly/SameSite session cookie; the existing HTTP Basic Auth path remains supported for the Keychain-backed maintenance fetch script. The dashboard is `noindex`, uses `no-store`, renders adoption metrics plus runtime-health cards/current 24-hour sanitized errors—never raw device/runtime IDs or bowling data—and refreshes only when Michael explicitly loads/refreshes it. Automatic 60-second reloads were removed to protect the D1 free-tier read quota.
- External production alerts are delivered through Michael's existing Telegram bot from the always-on PopzVPS. `monitoring/telegram-health-monitor.mjs` checks the live version, homepage, runtime monitor, app bundle, service worker, and `/api/health` every five minutes via user cron. A failed check is repeated after a short default 3-second delay before Telegram is considered. New persistent failures alert immediately; unresolved availability/dependency failures may repeat after 15 minutes, runtime-diagnostic-only incidents after 60 minutes, and recovery sends a separate message. Telegram credentials stay outside Git in a mode-600 PopzVPS environment file. The previous hourly ChatGPT Popz Bowling Health task is disabled to avoid duplicate alerts.
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
public-v26 introduced **Pro Preview**. The header and Settings show the effective plan (`Free`, `Pro Preview`, or `Pro`), and premium features use the same entitlement system. The current Pro family includes Google Sync, Advanced Shot Tracking, Team / Multi-Bowler scoring, and Share Live Scores. Pro Preview remains enabled, so current testers lose nothing. Pricing and checkout are still undecided. See `PRO-PLAN.md`.

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

## public-v39.003 — runtime-alert hardening
- The install-only browser entry now uses a tiny `entry.js` bootstrap. Normal browser visits no longer request `app.js` or any bowling `.mjs` modules, so a transient application-module fetch failure cannot break the install gate or produce a false-looking app startup failure there.
- Installed/standalone launches still load the full bowling app. The service worker caches `entry.js` plus the full application graph so installed offline use remains intact.
- `activeSession()` now safely tolerates the brief pre-state startup window, preventing the observed Android startup TypeError when a callback fires before IndexedDB state initialization finishes.
- Runtime monitoring remains strict: the reviewed iOS script-load incident and Android startup TypeError were real client events, not a site-wide outage. Both are documented before their incident rows are cleaned from the current health window after this fix is deployed.
- Regression QA requires the browser install gate to open with no bowling IndexedDB, no adoption telemetry, no `app.js` request, no `.mjs` request, and no 8-second watchdog warning; installed phone/tablet and live/offline scoring regressions remain covered separately.
- PopzVPS health monitor was updated for the new bootstrap architecture: homepage checks now require `runtime-monitor.js` + `entry.js`, then separately verify that `entry.js` points to the current versioned `app.js` and that the full installed-app asset still reports the expected `APP_VERSION`.
- The temporary v39.003 dashboard display rule that inferred a missing Series Started count from Series Completed is superseded by public-v39.004. The dashboard now shows only raw accepted events and never manufactures funnel counts.

## public-v39.004 — clean telemetry baseline + QA phone simulator
- Production adoption telemetry and runtime-diagnostic D1 tables are reset to a fresh beta baseline. Counts from the earlier test period are intentionally discarded.
- The telemetry dashboard now shows **actual accepted events only**. It no longer infers or backfills Series Started from Series Completed.
- `/api/telemetry` rejects downstream funnel milestones when the required earlier stage is missing: app open → Bowl viewed → setup shown → series started → first roll → game completed → series completed.
- The dashboard adds **Invalid funnel events** as a database consistency check. The expected value is 0.
- The fresh baseline accepts only telemetry from public-v39.004 or newer. Older installed copies can receive an acknowledgement but their queued adoption/runtime rows are not stored.
- Local adoption and runtime queues move to v2. New series use `_telemetry.version=2`; pre-reset version-1 series cannot replay old milestones into the new baseline.
- During the public beta, usage telemetry and privacy-safe runtime diagnostics are mandatory for normal users. Settings shows **Beta telemetry: On** without an Off control.
- Internal QA remains excluded with `?qa=1`, WebDriver, or HeadlessChrome. The old `?telemetry=off` URL flag no longer disables beta telemetry.
- Hidden `?qa=1&phone=1` mode bypasses the install-only gate for internal testing, forces Compact Phone layout, and suppresses adoption/runtime telemetry.
- The MacBook Desktop **Popz Bowling QA Phone** launcher opens that hidden QA phone mode against live `popzbowling.com` using its own Chrome profile, so manual testing always targets the latest production deployment without contaminating telemetry.

### Telegram monitor rollout-race guard
- The PopzVPS health monitor now reruns the full production check after a short delay before sending any alert. This prevents a deployment propagation race, such as the version file briefly showing the previous release while the homepage and assets are already on the new release, from generating a false Telegram alarm. Only an issue that survives the fresh retry can alert.

## public-v39.005 — Compact Phone lane-field fit
- Compact Phone gives **Ball Used This Game** and **Lane Number(s)** equal-width columns instead of squeezing Lane into the smaller side of the row.
- The lane placeholder is shortened from **Example: 17 or 17-18** to **17 or 17-18** so the full hint remains visible on real phone widths.
- Regression coverage now locks the equal-width phone grid and lane placeholder, and browser QA measures the rendered placeholder text against the actual input width at 390×844 (narrower than the locked 412×915 Pixel 7 QA simulator).
- No telemetry baseline behavior changes; the fresh telemetry baseline remains public-v39.004 and newer.

## public-v39.006 — readable Install App instructions
- The in-app Install App message no longer uses a tiny pill for long setup instructions. Toasts now wrap inside the phone viewport with a normal rounded-card shape.
- Install notices use a dedicated wide card up to the available phone width and stay visible for 12 seconds instead of 2.4 seconds.
- Android install guidance is formatted as four numbered steps for easier reading on a phone.
- Normal short status toasts keep their existing short 2.4-second timing; the longer duration applies only to install guidance.

## public-v39.007 — locked Galaxy Tab S7 QA simulator
- Adds hidden internal `?qa=1&tablet=1` mode. It bypasses the install-only production gate only for QA, forces the normal **Full Layout**, disables the Layout selector, and is covered by the existing `qa=1` adoption/runtime telemetry suppression.
- The MacBook desktop launcher **Test Popz Bowling - Galaxy Tab S7.command** opens live production in a dedicated fixed Electron shell modeled on the 11-inch Galaxy Tab S7 in landscape.
- Emulator geometry is **1280 × 800 CSS px at DPR 2**, corresponding to the Tab S7 native **2560 × 1600** panel. It uses a Galaxy Tab S7 Android user agent plus touch emulation.
- The tablet window is non-resizable, non-maximizable, non-fullscreenable, and browser zoom is locked at 100%.
- Local tablet QA verifies Full Layout, install-gate bypass, disabled layout override, and zero telemetry/runtime requests.

## public-v39.008 — cleaner Stats and History
- Keeps the top Stats summary visible so average, high game/series, games, strike/spare, split, single-pin, and 10-pin results remain immediately readable.
- Detailed Stats sections now use persistent **Show / Hide** controls: Stats by League / Category, League Running Average, Performance Breakdowns, First-Ball Leave Stats, and Recent Series start collapsed on a fresh device. Each panel remembers its open/closed state locally on that device and does not enter Google Sync or bowling backups.
- League/category detail rows inside Stats start collapsed instead of expanding every league at once.
- Recent Series league/category groups also start collapsed.
- History continues to group series by league/category and date, but league/category groups now start collapsed so long histories open as a compact index rather than a wall of series.
- All underlying statistics, filtering, series data, entering-average editing, scoring, Google Sync, backups, live sharing, and telemetry behavior are unchanged.
- Regression coverage verifies the five collapsible Stats panels, local persistence key, collapsed league/category defaults, and mobile-friendly Show/Hide styling.

## 2026-10-03 — startup-failure alert noise hardening
- Production health no longer marks the whole app degraded for one unmatched `boot_started` event. A single abandoned/interrupted launch is retained as diagnostic evidence but does not page Telegram.
- Startup-failure degradation now requires **2 or more** unmatched mature boots within a **15-minute** health window, so unrelated abandoned launches spread across an hour do not combine into a false incident.
- Real client runtime/resource errors still degrade health immediately on the first recent error, so this change only filters the lone-boot false-positive pattern seen on October 3.
- `/api/health` now exposes `recentStartupFailureCount`, `startupFailureAlertThreshold`, and `startupFailureWindowMinutes` for diagnosis while keeping `recentStartupFailures` as the alerting boolean.
- This is a backend monitoring change only; the public client remains **public-v39.007**.

## 2026-10-03 — telemetry accuracy correction
- Runtime diagnostics and adoption/scoring telemetry are separate databases and are now labeled separately in the private dashboard. Browser visits to the public install page are shown as **Website / install-page boots** and no longer look like installed bowling-app launches.
- Startup-failure health degradation counts only `install_mode=installed` boots. An abandoned browser/install-page visit cannot trigger an installed-app startup alert.
- The Oct. 2 fresh baseline timestamp is `2026-10-02T14:45:00Z`. Current versions (public-v39.004+) remain eligible normally. Older installed PWAs from public-v31 onward may submit only events that actually occurred after that timestamp; old browser traffic and pre-reset timestamps remain excluded.
- Legacy installed scoring uses the older compatible milestone chain when necessary so real scoring from a stale installed PWA is not silently discarded just because that client did not emit every newer funnel stage.
- The private pre-reset SQL backup is retained and proves earlier real scoring existed, but it is not merged into current live adoption totals because that historical period also contained QA contamination.
- This is backend/admin instrumentation only; the public client remains **public-v39.007**.
