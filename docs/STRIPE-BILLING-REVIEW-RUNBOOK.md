# Popz Bowling Stripe billing review — owner operations

Status: **SANDBOX PREVIEW ONLY**. Public version public-v39.013, real payments disabled.

## What is monitored

The Stripe billing webhook verifies event signatures and the original Stripe PaymentIntent before creating an append-only private Firestore audit entry for refunds, disputes and duplicate paid sessions. A matching record is also inserted into a separate, isolated Cloudflare D1 billing-review inbox. A repeat Stripe webhook reuses the same event ID without duplicating the alert.

If Checkout creation has an uncertain outcome after the 20-hour idempotency safety window, the request stays blocked and creates exactly one inbox record with kind checkout_uncertain. It cannot start another charge until an owner verifies Stripe's records and manually authorizes a correction.

The existing PopzVPS Telegram bot is reused for alerts. The new server-side billing monitor reads **only** queued alert metadata (no customer email, Firebase UID, card details or credentials), sends the notification, and marks it delivered. It is independent of the established Popz Bowling health monitor. When Telegram or PopzVPS is unavailable, the D1 item stays pending for the next poll.

## Owner review on the MacBook

From /Users/michaelnichols/popz-bowling-stripe-pro:

    /Users/michaelnichols/.nvm/versions/node/v24.15.0/bin/node scripts/billing-review-owner.mjs open
    /Users/michaelnichols/.nvm/versions/node/v24.15.0/bin/node scripts/billing-review-owner.mjs all
    /Users/michaelnichols/.nvm/versions/node/v24.15.0/bin/node scripts/billing-review-owner.mjs ack EVENT_ID "Investigating in Stripe"
    /Users/michaelnichols/.nvm/versions/node/v24.15.0/bin/node scripts/billing-review-owner.mjs resolve EVENT_ID "Reviewed Stripe payment, payment state verified, no further action"

An acknowledgement moves manual_review_required to acknowledged. Resolution requires a substantive note and updates only the separate D1 review row. All events stay in the review history (including resolved events). No command can refund a payment, create a new Checkout session, unblock a stalled reservation, change a customer's Pro access, or modify bowling history.

For refunds: check Stripe's latest refund and original PaymentIntent before taking action. Pending refund is not a completed refund. For disputes: review the dispute status and evidence deadlines in Stripe. For duplicate paid sessions: verify both charges and avoid auto-refunding without owner approval. For checkout_uncertain: search Stripe for the original reservation UID/nonce and session; never create a new session until the previous outcome is proven safe. Manually resolving the alert alone **does not release** the underlying Firestore reservation.

## Access separation and data isolation

- Cloudflare Preview binding BILLING_REVIEW_DB points only to isolated D1 database popz-bowling-billing-review-preview (ID b86d17e8-6d9b-4039-af8f-2e6b8f7fb464). No production scoring, telemetry or live-sharing tables are modified.
- HTTP route /api/billing/reviews is restricted to the exact preview branch and preview hostname. Unauthenticated requests get HTTP 404; it never exposes a browser token. All responses use no-store and noindex.
- The **owner token**, BILLING_REVIEW_ADMIN_TOKEN, exists only as an encrypted Cloudflare Preview secret and an owner-only mode-600 Mac file at ~/.config/popz-bowling-billing/review-admin-token. It can list, acknowledge and resolve.
- The **monitor token**, BILLING_REVIEW_MONITOR_TOKEN, exists only as an encrypted Cloudflare Preview secret and a mode-600 file on PopzVPS at ~/.config/popz-bowling-monitor/billing-review-monitor-token. It can see pending alert metadata and mark a successfully delivered alert; it cannot acknowledge/resolve or access Firebase identities.
- Telegram credentials remain exclusively on PopzVPS at ~/.config/popz-bowling-monitor/telegram.env and are not copied into Cloudflare, ChatGPT, source repositories or the Mac.
- No customer payment identifiers or email addresses appear in Telegram messages; only review ID, type, status, $ amount, and a prompt to inspect the private inbox.
- Both monitor and owner API tokens must be rotated if a device is compromised. Do not paste any token into chat or log files.

## Deployment and testing

Database migration is billing-migrations/0001-review-queue.sql. It was applied directly to the preview-only database. The runbook and private CLI are not part of the public app bundle. The preview is deployed as branch stripe-lifetime-pro-preview using Wrangler.

Before real sales: provision a **separate production review database and distinct production-only owner/monitor tokens**, restrict production admin access, test delivery/incident lifecycle with a fresh disposable Firebase QA identity, verify real signed Stripe refund/dispute events write both private Firestore and operator D1, and define a reliable manual stale-reservation reconciliation procedure. Do not enable live billing, merge the Stripe branch, or change Founder entitlements without user approval.

Test source: tests/test_stripe_review_inbox.mjs and the expanded tests/test_stripe_billing_reconciliation.mjs / tests/test_stripe_checkout_reservation.mjs; they exercise actual SQLite schema and authentication/role boundaries.
