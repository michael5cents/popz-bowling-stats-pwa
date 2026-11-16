# Popz Bowling — Production Billing Review Operations

**LATEST VERIFIED OWNER WORKFLOW (late November 15, 2026):** The previously planned production operator API is now authorized for the owner: the read-only production CLI successfully returned **0 open** and **0 historical** review records, without modifying Stripe or customer data. A signed, Finder-launchable, production-only **Popz Bowling Payment Reviews.app** has been installed on the MacBook Desktop and a shortcut placed in the desktop flyers folder. Its READ-ONLY launch check passed against the bundled CLI and the app launched successfully. [Current launcher operations](BILLING-REVIEW-MAC-LAUNCHER-2026-11-15.md). The original infrastructure and activation checklist below records an EARLIER preparation stage; its former v39.013/no-live-Checkout status is historical and must not override the verified **public-v39.017** live commercial app. This check confirms the production owner review endpoint is accessible; it does NOT independently establish whether every possible future payment exception is delivered through the live alert-monitoring timer.

**Status: PRODUCTION INFRASTRUCTURE PREPARED BUT NOT CONNECTED OR ACTIVATED.**
As of November 15, 2026. The live app is still public-v39.013; no live Stripe Checkout or trial enrollment is enabled. No production merchant account is available through the connected Stripe integration.

## Isolated production review database

Created empty Cloudflare D1 database **popz-bowling-billing-review-production**, database ID `821922f7-63cf-43a3-acb4-a446c1764c74`, using the existing reviewed migration `billing-migrations/0001-review-queue.sql`. An independent read verified `review_count=0`. It has no connection to customer scoring/telemetry history and is **not bound to the deployed production Pages Functions**.

Development source branch `feature/stripe-lifetime-pro` includes a separate `[[env.production.d1_databases]]` binding with `BILLING_REVIEW_DB`, while preserving ALL existing production TELEMETRY_DB, LIVE_SHARE_DB and RUNTIME_DB bindings. The sandbox remains separately configured to its own review D1 database `b86d17e8-6d9b-4039-af8f-2e6b8f7fb464`. Never swap these IDs.

## Production review endpoint security

The updated API code `functions/api/billing/reviews.js` is still **unpublished to production**. Even when the source is deployed later, it responds with HTTP 404 to live calls unless all are true:

1. Cloudflare Pages branch is exactly `main`.
2. Request origin is exactly `https://popzbowling.com`.
3. `BILLING_REVIEW_PRODUCTION_ENABLED` is explicitly set to the string `true` in the production environment.
4. The caller provides the correctly scoped **production** owner or monitor 256-bit bearer token from Cloudflare's encrypted secrets.
5. The production D1 binding is present and healthy (otherwise HTTP 503).

Sandbox preview uses its original branch/hostname and credentials, never production credentials. Neither role can refund a transaction, revoke Pro, edit bowling history or create charges. Owner can list, acknowledge and resolve private audit records. Monitor can read a summary of pending alerts and mark them delivered, without Firebase user IDs or card information.

## Credentials and VPS service — not yet installed

**Not configured as of this audit**: production `BILLING_REVIEW_ADMIN_TOKEN`, `BILLING_REVIEW_MONITOR_TOKEN`, `BILLING_REVIEW_PRODUCTION_ENABLED`, live Stripe restricted key, live price, live webhook signing secret and production Firebase server service account. Do not assume the presence of the development sandbox secrets in production.

When the owner explicitly authorizes production activation:
- Generate **new** independent 256-bit owner and monitor tokens. Never reuse the sandbox tokens or copy them into chat, code, email, logs or a wiki.
- Store owner token on the Mac as `~/.config/popz-bowling-billing/review-production-admin-token` (mode 600) and in Cloudflare's encrypted **production** `BILLING_REVIEW_ADMIN_TOKEN`.
- Store monitor token on PopzVPS as `~/.config/popz-bowling-monitor/billing-review-production-monitor-token` (mode 600) and in Cloudflare's encrypted **production** `BILLING_REVIEW_MONITOR_TOKEN`. It must have no owner permissions.
- Use the existing Telegram bot/chat credentials on PopzVPS only. Do not transfer bot tokens to Cloudflare or the source repository.
- Owner CLI: `node scripts/billing-review-owner.mjs --production open`. Without `--production` it remains a SANDBOX operator tool. Production mode will fail safely while the token and live API are disabled.
- Source for production VPS wrapper: `monitoring/billing-telegram-run-production.sh`. Install it beside the existing sandbox monitor and link **separate** units from `monitoring/systemd/popz-billing-alerts-production.service` and `monitoring/systemd/popz-billing-alerts-production.timer`. Explicitly enable the production timer only **after** the live API, token and synthetic alert smoke test succeed. Never replace/disable existing `popz-billing-alerts.timer` or `popz-monitor.timer`.
- The production wrapper sets `POPZ_BILLING_ALERT_ENV=production`; the updated monitor code then changes both API base and protected token file. Without that env it continues to use the sandbox API, as before.
- Use only an independently identified, clearly labeled non-customer synthetic incident to smoke-test the delivery/ack/resolve flow; then leave the case resolved in the permanent review history.

## Go-live checks that remain mandatory

1. Confirm a **connected live Stripe merchant account**, live charges/payouts enabled, the legally correct selling entity, account security, and bank payout information.
2. Choose tax classification/registrations, tax behavior for a **new live** $9.99 one-time Price, and whether tax adds to $9.99 or is included. NEVER reuse the sandbox Product/Price identifiers.
3. Harden paid-session, refund/dispute and D1 amount validations for applicable taxes **before enabling automatic_tax**. The current strict $9.99 validation intentionally rejects larger totals. See `docs/TAXED-CHECKOUT-COMPATIBILITY.md`.
4. Provision live-only minimal-permission restricted Stripe credentials and a **signed live webhook**. Confirm fulfillment and review alert delivery with exact amount, product, price, UID, currency and account-mode checks. Payment and refund events should be idempotent and preserve original receipts.
5. Finalize approved customer-facing Terms, Privacy, support contact, refund policy and applicable tax registrations. The 30-day free Pro trial is not a 30-day money-back guarantee.
6. Complete Founder, Free, expired trial, new purchase, duplicate prevention, refunded/disputed case, multi-device, phone/tablet and offline regressions and restore/rollback plans.
7. **Coordinate** payment enablement, 30-day trial enrollment, Pro Preview disable, Firestore commercial rules and Live Sharing enforcement. Do not disable Pro for current users while they lack the live checkout to buy it.
8. Observe live Stripe webhook delivery, Cloudflare and Firebase errors, and PopzVPS alerts. Be able to restore the original production rules and UI without deleting bowling histories.

## Test and audit evidence

The local `tests/test_stripe_production_review_staging.mjs` verifies production branch/hostname isolation, default-off behavior, separate owner/monitor tokens, denial of a sandbox token on production, denial of a production token in sandbox, absent database fail-close, owner vs monitor permissions, and incident replay/acknowledgement/resolution using an isolated in-memory SQLite database. The prior test `tests/test_stripe_review_inbox.mjs` still verifies the sandbox path.

**Do not merge this development branch or apply Cloudflare Pages production deployment settings without explicit launch approval.** This runbook authorizes preparation, not real-money changes.
