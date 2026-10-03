# Telemetry Dashboard Access Runbook

## Private dashboard
- URL: `https://popzbowling.com/telemetry-dashboard`
- HTTP Basic Auth username: `michael`
- Cloudflare Pages secret name: `TELEMETRY_DASHBOARD_PASSWORD`
- macOS Keychain service used by the repo scripts: `popzbowling-telemetry-dashboard`
- Keychain account: `michael`

## Normal assistant/operator workflow
From the public Bowling repo:

```bash
./scripts/telemetry-dashboard-fetch.sh > /tmp/popz-telemetry-dashboard.html
```

Then inspect `/tmp/popz-telemetry-dashboard.html`. No Wrangler/D1 access is required for the normal dashboard review.

## One-time Keychain setup
If the fetch script says the credential is missing:

```bash
./scripts/telemetry-dashboard-init.sh
```

Enter the current dashboard password once. The initializer stores it in macOS Keychain only.

## Production QA rule
Automated browser tests must not contaminate adoption telemetry. WebDriver and HeadlessChrome sessions are suppressed automatically. For manual production QA, use `https://popzbowling.com/?qa=1`; `?telemetry=off` is intentionally no longer supported during beta. Normal beta users cannot disable telemetry. The dedicated phone simulator uses `https://popzbowling.com/?qa=1&phone=1`, which also forces Compact Phone layout while keeping both adoption telemetry and runtime diagnostics suppressed.

## Security rule
Never put the dashboard password itself in GitHub, Gitea, Markdown, Obsidian, Collective, Wiki, shell scripts, or chat handoff notes. Those locations should store only the URL, username, Cloudflare secret name, Keychain service name, and access procedure.

## Fallback checkout
The fallback public repo on `.56` is:
`/Users/michaelnichols/popz-bowling-stats-pwa`

It uses the same scripts. If its Keychain entry is absent, run the initializer once on that machine.

## Raw D1 report
`scripts/telemetry-report.sh` remains useful when Wrangler has valid Cloudflare/D1 authorization. If that path fails, use the Keychain-backed dashboard fetch script instead of searching old chats or reconstructing credentials.

## public-v33 milestone durability
- New v33+ series carry a local telemetry eligibility/origin marker so bowling milestones can be reconciled from saved IndexedDB state after an offline period or app restart.
- `series_started`, `first_roll_recorded`, `game_completed`, and `series_completed` use deterministic milestone IDs. Team / Multi-Bowler sessions emit one milestone per team stage rather than one per bowler.
- The local queue is removed only after `/api/telemetry` returns a complete acknowledgement for the submitted batch. A local acknowledgement ledger prevents already-accepted milestones from being requeued on every launch; D1 `INSERT OR IGNORE` remains the final duplicate guard.
- Reconciliation runs at app start, connectivity/foreground return, and periodically while the app is open. Synced/imported series from another device are not replayed as local telemetry.
- public-v39.004 uses telemetry marker version 2. Pre-reset version-1 series are ineligible for the fresh baseline, and QA-suppressed series remain ineligible for later milestone backfill.
## Exact sanitized runtime-error rows
For incident investigation, query the dedicated runtime D1 directly with the repository helper:

```bash
./scripts/runtime-errors.sh 24 20
```

Arguments are `[hours] [limit]`. The helper reads the bound `RUNTIME_DB` database ID from `wrangler.toml` and queries that exact D1, avoiding database-name/account ambiguity. Output contains only sanitized runtime fields: timestamp, event type, app version, coarse platform/install mode, sanitized error kind/message, source filename, line and column. It does not return bowling scores, bowler names, leagues, history, Firebase UID, raw runtime IDs, or telemetry device IDs.

For the 2026-10-01 alert, this command recovered the exact row: `2026-10-01T07:05:16.292Z` (02:05:16 CDT), `public-v35`, iOS browser, `resource_error`, `stylesheet_load`, source `live-share.css`.

## public-v35 runtime health and crash diagnostics
- `runtime-monitor.js` loads before the main `app.js` module. It records `boot_started` immediately and `app_ready` only after the local database loads, UI renders/binds, live-share controls mount, and normal startup is usable.
- Privacy-safe error events are `resource_error`, `window_error`, and `unhandled_rejection`. Allowed fields are anonymous runtime/boot IDs, app version, timestamp, browser/installed mode, coarse platform, sanitized error kind/message, source filename, line and column. Scores, bowler names, leagues, centers, balls, oil patterns, leaves, frames, backups, Google/Firebase identity, live-share tokens, and raw URLs are not accepted.
- During the public beta, runtime diagnostics are mandatory for normal users and there is no user opt-out. WebDriver, HeadlessChrome, and the internal `?qa=1` path suppress both adoption telemetry and runtime diagnostics. `?telemetry=off` is not supported.
- Runtime reports use separate D1 database `popz-bowling-runtime`, binding `RUNTIME_DB`, migration folder `runtime-migrations/`, and endpoint `/api/runtime`. Do not migrate runtime tables into `TELEMETRY_DB` or `LIVE_SHARE_DB`.
- The private telemetry dashboard now includes Runtime status, 24-hour boots, ready boots, mature startup failures, runtime-error count, and the latest sanitized errors. Raw runtime IDs/boot IDs are not rendered.
- Public `/api/health` returns only app version, dependency health, and booleans for a recent runtime error or mature startup failure. It never returns error messages, IDs, bowling data, or adoption counts. External health monitoring should also verify `/`, `/latest-version.json`, `/runtime-monitor.js`, `/app.js`, and `/service-worker.js`.
- If a boot does not reach ready within 8 seconds, the user receives an on-screen recovery message stating that saved bowling data was not erased and suggesting a complete close/reopen while online.
## Telegram production health alerts
- The authoritative external alert path is Michael's existing Telegram bot, not ChatGPT task notifications. The previous hourly ChatGPT `Popz Bowling Health` task is disabled.
- PopzVPS runs `~/.local/lib/popz-bowling-monitor/run.sh` from the user crontab every five minutes. The wrapper loads only `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` from `~/.config/popz-bowling-monitor/telegram.env` (mode 600) and runs the deployed copy of `monitoring/telegram-health-monitor.mjs`.
- Each run verifies `latest-version.json`, homepage versioned asset references, the runtime monitor, main app bundle, service worker, and `/api/health`. A healthy run is silent. A new failure sends `POPZ BOWLING ALERT`. Availability/dependency failures may repeat after 15 minutes. Runtime-diagnostic-only incidents use a 60-minute repeat cooldown so a single client error inside `/api/health`'s 60-minute recent-error window normally produces one alert, followed by recovery when the window clears. The first fully healthy run after an incident sends `POPZ BOWLING RECOVERED`.
- The monitor source and deployment notes live under `monitoring/` in this private repo. Bot token and chat ID must never be committed, documented, copied into Obsidian/Collective/Wiki, or echoed into chat.
- Production validation on 2026-09-30: the exact PopzVPS wrapper reported `Healthy: public-v35`, and a real `POPZ BOWLING MONITOR TEST` message was accepted by Telegram using the same bot/chat as the call-forwarding monitor.

### Patch-version health monitoring
The Telegram monitor accepts numeric patch releases such as `public-v37.002`. `/api/health` no longer hard-codes an app version; it reads the current published `latest-version.json`, so health/version checks stay aligned automatically on future `public-v37.xxx` maintenance releases.

## public-v39.004 fresh baseline
- The adoption D1 and runtime D1 were deliberately cleared for a new beta baseline at **2026-10-02T14:45:00Z**. public-v39.004 and newer are eligible normally. Older **installed** PWAs from public-v31 onward may store only fresh events whose own timestamps are at or after that reset point; old browser traffic and pre-reset timestamps stay excluded.
- `/api/telemetry` enforces the current activation sequence before storing downstream milestones. For fresh legacy installed clients, the server uses a compatible older milestone prerequisite where needed so genuine stale-client scoring is not silently discarded.
- The dashboard renders raw accepted values only and has an **Invalid funnel events** consistency card. It should remain 0.
- Adoption queue/ack/first-seen keys and runtime queue use v2 namespaces. Old v1 queues are removed by public-v39.004, and old `_telemetry.version=1` series are not reconciled into the new baseline.
- Normal public-beta users cannot disable adoption telemetry or runtime diagnostics. Only `?qa=1`, WebDriver, and HeadlessChrome suppress them.

## MacBook QA phone simulator
- Desktop launcher: `~/Desktop/Popz Bowling QA Phone.app`.
- It opens live production at `https://popzbowling.com/?qa=1&phone=1` in a separate Chrome profile and phone-sized app window.
- `qa=1` suppresses both adoption telemetry and runtime diagnostics; `phone=1` is honored only with QA mode and forces Compact Phone layout while bypassing the public install gate.
- Use this launcher for manual public-app QA so tests do not alter production adoption counts. Because it loads the live domain, reopening it tests the currently deployed public version rather than a local copy.

### Deployment-race alert protection
The PopzVPS monitor performs a complete second production check after a short delay whenever the first check finds an issue. Telegram is evaluated only from the second result. This prevents brief deployment version mismatches from producing false alerts while persistent failures still alert normally.
