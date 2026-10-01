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
Automated browser tests must not contaminate adoption telemetry. public-v32 automatically suppresses WebDriver and HeadlessChrome sessions. For any manual production QA browser/profile, open `https://popzbowling.com/?qa=1` (or add `?telemetry=off`) before testing. QA suppression does not change the user's saved Anonymous usage statistics preference; it only prevents that QA session from queuing/sending adoption events.

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
- Telemetry-off and QA-suppressed series are ineligible for later milestone backfill. Pre-v33 history is intentionally not reconstructed into the cleaned telemetry baseline.
## public-v35 runtime health and crash diagnostics
- `runtime-monitor.js` loads before the main `app.js` module. It records `boot_started` immediately and `app_ready` only after the local database loads, UI renders/binds, live-share controls mount, and normal startup is usable.
- Privacy-safe error events are `resource_error`, `window_error`, and `unhandled_rejection`. Allowed fields are anonymous runtime/boot IDs, app version, timestamp, browser/installed mode, coarse platform, sanitized error kind/message, source filename, line and column. Scores, bowler names, leagues, centers, balls, oil patterns, leaves, frames, backups, Google/Firebase identity, live-share tokens, and raw URLs are not accepted.
- Runtime diagnostics follow the existing Anonymous usage & diagnostics setting. Turning it Off clears the unsent runtime queue. WebDriver, HeadlessChrome, `?qa=1`, and `?telemetry=off` suppress both adoption telemetry and runtime diagnostics.
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
