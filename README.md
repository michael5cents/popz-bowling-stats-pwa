# Popz Bowling Stats — Public PWA

Production URL: **https://popzbowling.com**

Current app version: **public-v22**

A one-device-per-bowler, offline-first bowling scoring and statistics app hosted on Cloudflare Pages.

## Separation from Michael's personal app
This repository is the public/friends version only. It is completely separate from Michael's personal bowling app (`bowling-stats-offline`) and has its own code, IndexedDB database, deployment, and update path. Changes here must not be applied to the personal app unless explicitly requested.

## Privacy and storage
- Bowling data is stored locally in IndexedDB on the bowler's device.
- No account or login is used, and there is no server-side bowling-history database.
- public-v22 sends privacy-minimal anonymous product-usage events to a dedicated Cloudflare D1 telemetry database. Events identify only the random device ID, event type, app version, timestamp, installed/browser mode, and coarse platform. Scores, names, league names, centers, balls, oil patterns, averages, leaves, frames, and backup contents are never accepted by the telemetry endpoint.
- Anonymous usage statistics are On by default and can be turned Off in Settings; the telemetry queue is stored separately from bowling backups.
- The installed PWA works offline after its files have been cached.
- Users protect their history with **Export Backup** and restore it with **Import JSON**.

## Install
Open **https://popzbowling.com** in a modern browser.
- Android/Chrome: tap the visible **Install App** button. If Chrome has not exposed its install prompt yet, refresh once and tap it again; the app also provides fallback instructions.
- iPhone/iPad: open the site in Safari, tap **Install App**, then follow **Share → Add to Home Screen → Add**.
- The Install App button hides when the app is already running in standalone installed mode.

## Current public-v22 behavior
- Default handicap for new series: **90% of 220**.
- Bowling-center filtering also limits the lane list and lane breakdown to that center.
- **Finish Series** first shows statistics for only the just-completed series, then offers **Continue to Overall Stats** for cumulative stats.
- If the entering average is blank, the app uses the stored running average for the same league or Practice when available; **Entering / Current Average** remains editable during bowling and immediately updates handicap.
- League average rules are configurable per league in **Settings → League Average Rule**. A league can keep carrying its book average, or use the book average only until a chosen number of actual games is completed; after that threshold, the app uses the whole-number actual pinfall average with the fraction dropped.
- PWA manifest, icons, service worker, and offline cache are versioned for public-v22.
- Anonymous telemetry tracks first seen/app opens, install events, series started/completed, Stats/History/Help views, and backup export/share/import usage. Events queue locally while offline and flush when connectivity returns.
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
- Private aggregate dashboard: `https://popzbowling.com/telemetry-dashboard`. It is protected by HTTP Basic Auth (`michael` + Cloudflare secret `TELEMETRY_DASHBOARD_PASSWORD`), is `noindex`, uses `no-store`, and renders only aggregate metrics/tables—never raw device IDs or bowling data.

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
