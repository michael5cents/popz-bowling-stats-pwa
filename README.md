# Popz Bowling Stats — Public PWA

Production URL: **https://popzbowling.com**

Current app version: **public-v15**

A one-device-per-bowler, offline-first bowling scoring and statistics app hosted on Cloudflare Pages.

## Separation from Michael's personal app
This repository is the public/friends version only. It is completely separate from Michael's personal bowling app (`bowling-stats-offline`) and has its own code, IndexedDB database, deployment, and update path. Changes here must not be applied to the personal app unless explicitly requested.

## Privacy and storage
- Bowling data is stored locally in IndexedDB on the bowler's device.
- No account, login, Michael server backend, or server-side bowling database is used.
- The installed PWA works offline after its files have been cached.
- Users protect their history with **Export Backup** and restore it with **Import JSON**.

## Install
Open **https://popzbowling.com** in a modern browser.
- Android/Chrome: tap the visible **Install App** button. If Chrome has not exposed its install prompt yet, refresh once and tap it again; the app also provides fallback instructions.
- iPhone/iPad: open the site in Safari, tap **Install App**, then follow **Share → Add to Home Screen → Add**.
- The Install App button hides when the app is already running in standalone installed mode.

## Current public-v15 behavior
- Default handicap for new series: **90% of 220**.
- Bowling-center filtering also limits the lane list and lane breakdown to that center.
- **Finish Series** first shows statistics for only the just-completed series, then offers **Continue to Overall Stats** for cumulative stats.
- If the entering average is blank, the app uses the stored running average for the same league or Practice when available; **Entering / Current Average** remains editable during bowling and immediately updates handicap.
- PWA manifest, icons, service worker, and offline cache are versioned for public-v15.
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
