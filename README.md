# Popz Bowling Stats — Public PWA

Production URL: **https://popzbowling.com**

Current app version: **public-v23**

An offline-first bowling scoring and statistics app hosted on Cloudflare Pages, with optional Google Sync for automatic multi-device history.

## Separation from Michael's personal app
This repository is the public/friends version only. It is completely separate from Michael's personal bowling app (`bowling-stats-offline`) and has its own code, IndexedDB database, deployment, and update path. Changes here must not be applied to the personal app unless explicitly requested.

## Privacy and storage
- Bowling data is always stored locally in IndexedDB so scoring continues offline.
- No account is required. Without Google Sync, bowling history remains on that device only.
- public-v23 adds optional Google sign-in + Firestore sync. Signed-in users store completed series and the small set of cross-device settings under their Firebase UID so the same history appears after signing into another device with the same Google account. An in-progress series stays local until Finish Series.
- Firestore rules restrict `/users/{uid}` and every nested sync document to that authenticated UID; all other reads/writes are denied.
- public-v23 continues privacy-minimal anonymous product-usage events in the separate Cloudflare D1 telemetry database. Events identify only the random device ID, event type, app version, timestamp, installed/browser mode, and coarse platform. Scores, names, league names, centers, balls, oil patterns, averages, leaves, frames, and backup contents are never accepted by the telemetry endpoint.
- Anonymous usage statistics are On by default and can be turned Off in Settings; the telemetry queue is stored separately from bowling backups.
- The installed PWA works offline after its files have been cached.
- Users protect their history with **Export Backup** and restore it with **Import JSON**.

## Install
Open **https://popzbowling.com** in a modern browser.
- Android/Chrome: tap the visible **Install App** button. If Chrome has not exposed its install prompt yet, refresh once and tap it again; the app also provides fallback instructions.
- iPhone/iPad: open the site in Safari, tap **Install App**, then follow **Share → Add to Home Screen → Add**.
- The Install App button hides when the app is already running in standalone installed mode.

## Current public-v23 behavior
- Default handicap for new series: **90% of 220**.
- Bowling-center filtering also limits the lane list and lane breakdown to that center.
- **Finish Series** first shows statistics for only the just-completed series, then offers **Continue to Overall Stats** for cumulative stats.
- If the entering average is blank, the app uses the stored running average for the same league or Practice when available; **Entering / Current Average** remains editable during bowling and immediately updates handicap.
- League average rules are configurable per league in **Settings → League Average Rule**. A league can keep carrying its book average, or use the book average only until a chosen number of actual games is completed; after that threshold, the app uses the whole-number actual pinfall average with the fraction dropped.
- PWA manifest, icons, service worker, and offline cache are versioned for public-v23.
- **Google Sync** is optional. First sign-in merges existing local completed history with the user's private Firestore history, then subsequent devices use the same merge/tombstone rules automatically. Bowler name and per-league average rules sync; device-specific Stats filters do not.
- Signed-in users sync when the app opens/returns online or foreground, after important completed-history/settings changes, and on a 60-second background check while open. Manual **Sync now** is also available.
- Export / Import / Share Backup remains available as recovery and manual-transfer fallback.
- Anonymous telemetry tracks first seen/app opens, install events, series started/completed, Stats/History/Help views, backup export/share/import usage, Google sign-in use, and manual cloud-sync use. It does not receive the Google identity, bowling content, or cloud documents. Events queue locally while offline and flush when connectivity returns.
- Feedback opens an email addressed to `feedback@popzbowling.com` with subject **Popz Bowling Stats** and includes the app version/device information.
- Built-in **Help** tab provides a complete user guide with Print / Save Guide support.
- Storage protection: requests persistent browser storage and automatically downloads a JSON safety backup after every finished series.
- **Share / Transfer Backup** sends the full JSON backup through the device share sheet when file sharing is supported, with automatic download fallback. **Import JSON now merges histories**: device-only series are retained, missing series are added, and a matching series ID uses the newer copy. An in-progress local series is never overwritten by import.
- Completed series can be expanded in **History** to enter or correct the official **Entering Average** later; handicap and league running-average stats recalculate immediately.
- Update awareness: the app checks the uncached production `latest-version.json` at startup, when returning to the foreground, when connectivity returns, and every 10 minutes while open. If the running version is behind, a persistent **Update available** banner instructs the user to fully close/reopen. The banner hides only after a successful version check confirms the running app matches production.

## Hosting and deployment
- Production: Cloudflare Pages project `popzbowling`.
- Primary custom domain: `popzbowling.com`.
- Cloudflare Pages default domain: `popzbowling.pages.dev`.
- Source of truth: GitHub `michael5cents/popz-bowling-stats-pwa`.
- Secondary backup: Gitea `michael5cents/popz-bowling-stats-pwa` on the private LAN.
- Cloudflare deployment is currently performed with Wrangler rather than Git integration.
- Pages Functions endpoint `/api/telemetry` writes to D1 database `popz-bowling-telemetry` through binding `TELEMETRY_DB`; `scripts/telemetry-report.sh` returns aggregate usage counts without exposing bowling content.
- Google Sync backend: Firebase project `popz-bowling-stats`, Google Authentication, and Firestore `(default)` in `nam5`. Firebase configuration/rules are kept in `.firebaserc`, `firebase.json`, `firestore.rules`, and `firestore.indexes.json`.
- Private aggregate dashboard: `https://popzbowling.com/telemetry-dashboard`. It is protected by HTTP Basic Auth (`michael` + Cloudflare secret `TELEMETRY_DASHBOARD_PASSWORD`), is `noindex`, uses `no-store`, renders only aggregate metrics/tables—never raw device IDs or bowling data—and automatically refreshes every 60 seconds.

Release rule: every public release must update `APP_VERSION`, service-worker/cache asset versions, and `latest-version.json` to the same version. `latest-version.json` is deliberately excluded from the offline cache and served with `Cache-Control: no-store` so installed copies can detect a newer production release.

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
During the public test period, optional Google Sync is available without payment so adoption and usefulness can be measured. If a paid/Pro tier is introduced later, automatic Google multi-device sync is intended to become a Pro incentive alongside Track Bowling Line / Advanced Shot Tracking. No payment or entitlement gate is implemented yet.
