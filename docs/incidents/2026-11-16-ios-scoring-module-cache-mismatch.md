# Incident review — iOS installed PWA scoring module import error (November 16, 2026)

**Incident classification:** Single observed client-side JavaScript startup failure; temporarily degraded /api/health (not a demonstrated site-wide outage). **Public runtime:** `public-v39.017`. **Status at investigation:** Live health OK, one affected iOS installation subsequently reported app_ready. **Production software changes:** NONE.

## Owner-reported Telegram alert timeline (America/Chicago)

- **2:35:05 AM CST, November 16:** `POPZ BOWLING ALERT`, with `Health API: status=degraded ok=false` and `Runtime errors: recent client runtime error reported`.
- **3:35:02 AM CST:** `POPZ BOWLING RECOVERED`, with both issues resolved.
- **6:23 AM CST:** Direct independent live checks of `https://popzbowling.com/api/health` returned HTTP 200, `ok:true`, `status:"ok"`, version `public-v39.017`; all three dependency probes (telemetry, liveSharing, runtime) true; `recentErrors:false` and `recentStartupFailures:false`.

## Exact evidence from the live production Cloudflare RUNTIME_DB (read-only)

Only one `window_error` in the queried November 16 error data, observed at **2026-11-16T08:30:59.064Z (2:30:59 AM CST)**:
- `platform=ios`
- `install_mode=installed`
- `app_version=public-v39.017`
- `error_kind=SyntaxError`
- `error_message=SyntaxError: Importing binding name 'wholeGameBall' is not found.`
- no source file/line/column provided by the browser.

The same private runtime-id (not copied into documentation) had a **later `app_ready` event** in the next 30 minutes, approximately **2:35 AM CST**. SQL correlation yielded `flagged_events=1` and `ready_after_error_same_install=1`. This establishes successful subsequent startup of the same installation, but **does not by itself establish uninterrupted functionality, absence of scoring data loss, or recovery of any unsaved in-progress game**.

## Most likely technical mechanism (inference, not direct access to user's cache)

The source makes an older-service-worker / new-JavaScript graph mismatch plausible:
1. `app.js?v=39.017` imports the NEW `wholeGameBall` binding from unversioned `./scoring.mjs`.
2. `wholeGameBall` was **added by public-v39.016**. Direct repository check of the older `public-v39.013` `scoring.mjs` found no such export; current live `scoring.mjs?v=39.017` **does** export it.
3. Existing service-worker routing maps unversioned `.mjs` requests to its own active cache's versioned assets. During upgrade, an old installed worker could still serve pre-v39.016 `scoring.mjs` while the new `app.js?v=39.017` was already loaded. That combination explains exactly the missing named export.
4. The next successful app boot, with no later runtime errors in the sampled window, is consistent with the newly activated cache providing a consistent module set.

The specific iOS device cache was unavailable for inspection; therefore identify this as **probable**, not definitive. Do not present multiple Telegram issue labels as multiple independent failures: `Health API degraded` was a derived state from the same runtime exception.

## Why recovery took about an hour

`functions/api/health.js` marks the health status `degraded` whenever **any qualifying client `window_error`, `unhandled_rejection` or `resource_error`** is recorded within the **last 60 minutes**. That is true even if an individual affected installation successfully starts again shortly afterward. The independent monitor reports both the Health API state and the underlying runtime-error flag. Around 3:35 AM the 2:30:59 AM event was outside the 60-minute lookback, clearing both reported issues. This is the expected existing rule, not evidence a server or payment integration was down for an hour.

## Follow-up recommendation (NOT deployed)

- On the next explicitly approved release, pin critical front-end module import specifiers to the same app version (especially `./scoring.mjs?v=...`) or implement another provably atomic module-update mechanism. Explicit versioned imports prevent an older service worker from silently substituting an obsolete cached module for the new app's dependency.
- Add automated regression covering a running old service worker (v39.013/v39.015) when an installed client receives a new app entry module (v39.016+), including iOS installed/browser modes and preservation of local bowling history.
- Keep runtime error alerts, but consider separating isolated user startup errors from global health/outage wording so `degraded` is not read as an hour-long site-wide outage when dependencies remain healthy.
- Continue to watch for repeated errors or affected-user reports. If a user has recurring blank-screen/startup errors, instruct them to fully close and reopen the installed app while online; do NOT suggest wiping site data/IndexedDB or reinstalling without a bowling-history backup.

## Source and safety

Verified against live `/api/health`, repository `functions/api/health.js`, `runtime-monitor.js`, `app.js`, `scoring.mjs`, `service-worker.js`, the historical v39.013 source, and production Cloudflare runtime D1 read-only queries. No private runtime ID, client device identifier, customer email, payment detail or authorization token copied here. No production code, Stripe settings, Firebase entitlement, customer data or cloud deployment changed as part of this investigation.
