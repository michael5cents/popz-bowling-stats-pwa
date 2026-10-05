# Share Live Scores — public-v34+

Introduced in public-v34 and still active in current production **public-v39.007**, Share Live Scores ports the tested private app's single-bowler spectator experience into **Popz Bowling Pro**. The public live-sharing database/API remain isolated from adoption telemetry, runtime diagnostics, and Michael's personal-app relay.

## Using it

1. Open **Bowl**, complete the setup, and press **Start Series**. The initial setup does not show Share Live Scores. Once the series starts, a small **collapsed Share Live Scores** bar appears and remains available while scoring. It never auto-opens. This feature is only for the selected bowler's current live series; it is not a Stats, History, past-score, or backup sharing feature.
2. In team mode, select the bowler first. **Start Sharing** creates one read-only link for that bowler. Turn rotation does not change whose scores are shared.
3. Choose **Share Link** to send it through your phone's share sheet, or copy the displayed link. Viewers do not need an account, installation, or Pro.
4. Score normally. Keep the app open and online for updates. Scoring and Finish Series save locally first; network failures cannot block those saves. Pending final results retry when the app returns online or reopens.
5. Finish Series publishes final boards and completed-game statistics. **Stop Sharing** remains on Bowl after finishing. Failed/offline stops are marked **Stop pending** and retain credentials for retry.

One bowler's link is managed per scoring device at a time. Stop/clear it before sharing another bowler or series. Use one scoring tab; simultaneous editing of the same device-local bowling state in multiple tabs is not supported.

## Pro and privacy

- `PRO_FEATURES.LIVE_SCORE_SHARING` gates creation. Existing Pro Preview unlocks it for testers.
- Server creation requires both `PRO_PREVIEW_ENABLED` and `LIVE_SHARE_PREVIEW="true"`, or a verified Firebase identity with an active server-owned `/users/{uid}/entitlements/pro` document. Before ending preview, configure `LIVE_FIREBASE_WEB_API_KEY` with the existing Firebase **public web API key**, and set `LIVE_SHARE_PREVIEW="false"` in both Wrangler environments. No client-provided plan is trusted. Existing links retain their bounded lifetime; Stop works regardless of plan.
- Sharing is off by default and starts only on explicit action. The URL follows only the selected bowler's current live series. It does **not** expose the Stats screen, History, past series, backups, or other bowlers. A viewer can see the selected bowler's name, date, league, series label, live game marks/scores, current ball, and the final result for that same live session.
- No other bowlers, full history, center, lane, oil pattern, stand/target boards, email, Firebase UID, telemetry ID or publisher secret enters a snapshot. The server independently allowlists payloads.
- Viewer and publisher credentials are separate random values. The server stores only a SHA-256 publisher-secret hash. Raw publisher secrets stay in a separate localStorage key, outside bowling state, backup exports and Google Sync.
- Active links expire at most 12 hours after creation. Final links expire within 2 hours of finishing (or the original deadline if sooner). Finished scores cannot be overwritten. Viewers continue checking for Stop/expiry, clearing their display on confirmed revocation. Already-seen information or screenshots cannot be recalled.
- Acknowledged Stop clears the remote snapshot immediately. Expired records become inaccessible immediately; stale records are physically cleaned on subsequent link/tombstone creation after an extra 12-hour race-protection window. Physical deletion is not a scheduled retention guarantee.
- Anonymous preview creation and unknown-token Stop requests are limited to 30 new records per IP/hour. Only short-lived hashed buckets are stored, not raw IPs. Cloudflare-level abuse controls can be tightened separately if needed.
- `/live/` is standalone, without Firebase, telemetry or service-worker registration. The app's worker bypasses `/live/` and `/api/live/`; snapshots are never cached. Viewer URLs use a fragment, with no-referrer and noindex headers.

## Infrastructure — separate from telemetry

- Spectator: `https://popzbowling.com/live/#<viewer-token>`
- API: `/api/live/<viewer-token>` — POST create/idempotent retry, PUT publish, GET read, DELETE revoke.
- Binding: **LIVE_SHARE_DB**, database **popz-bowling-live** (`4e13df82-3fb9-4225-8174-6c99c7fa7590`).
- Migration folder: **live-migrations/**. Never apply this migration to TELEMETRY_DB.
- `LIVE_SHARE_DB` remains independent of `TELEMETRY_DB` and `RUNTIME_DB`. Later telemetry/runtime changes do not alter live-share records, and live-share payloads do not enter the telemetry dashboard.

```sh
npx wrangler d1 migrations apply popz-bowling-live --remote
```

For local Cloudflare-runtime validation, use `--local` instead of `--remote`, then `npx wrangler pages dev .`. Never send QA events to production telemetry.

## Verification

```sh
node --test tests/*.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tools/test-live-share-browser.mjs
```

Node 24+ supplies in-memory SQLite for API tests. Browser QA uses an ephemeral localhost server, in-memory live database, synthetic bowlers, QA telemetry suppression and blocked external calls. It checks mobile layout, 300 scoring, offline Finish/reconnect, team-bowler isolation, offline Stop/retry, revocation after Finish, and offline service-worker loading. Screenshots: `/private/tmp/popz-live-*-qa.png`.

References: [Cloudflare Pages D1 bindings](https://developers.cloudflare.com/pages/functions/bindings/), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [Firebase Auth REST](https://firebase.google.com/docs/reference/rest/auth/), [Firestore REST authorization](https://firebase.google.com/docs/firestore/use-rest-api).
