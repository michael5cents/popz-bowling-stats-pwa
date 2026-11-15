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


## Verified PopzVPS timer and actual Telegram smoke test — November 15

The MacBook deployed the new monitor files on PopzVPS without altering the established production health monitor. The PopzVPS account could not edit its crontab because the cron spool rejects user writes, so the monitoring service uses a supported user-level systemd timer with lingering already enabled.

Unit source (checked into this branch):
- monitoring/systemd/popz-billing-alerts.service
- monitoring/systemd/popz-billing-alerts.timer

Installed unit links under the existing PopzVPS user systemd manager:
- popz-billing-alerts.timer is enabled and active, running once per minute
- popz-billing-alerts.service is a restricted oneshot service; its latest manual run returned success
- original popz-monitor.timer remains active and was not altered

Safe VPS status commands:

    systemctl --user status popz-billing-alerts.timer --no-pager
    systemctl --user list-timers --all --no-pager
    journalctl --user -u popz-billing-alerts.service -n 25 --no-pager

Real isolated sandbox alert smoke test: inserted one synthetic, non-customer checkout_uncertain incident with ID checkout_2a86b9c563b2f06b5c33b404db96fb94 into the separate preview-only billing review database. PopzVPS read that one pending item and sent one Telegram bot message accepted by the Telegram API. The monitor then acknowledged the item, and the owner CLI independently verified the alert was marked notified and removed from pending. The owner CLI acknowledged and resolved the synthetic incident with a note; it remains in the audit history with review_state=resolved, the open queue is empty, and repeated resolution is idempotent. There was no Stripe payment, no real Firebase identity and no change to scoring.

No real Stripe risk-event-to-Telegram test has occurred with an active disposable Firebase account, and no production alert service has been enabled. The sandbox unit must not be treated as the live production delivery channel until production D1, distinct tokens and approval are configured.

## November 15 - Genuine sandbox refund-to-Telegram regression
A real paid 999-cent sandbox Checkout was refunded in full. Both Stripe refund.created and charge.refunded events were delivered to the Preview webhook and wrote matching Firestore and D1 risk records. PopzVPS sent and confirmed both Telegram alerts and the owner acknowledged/resolved both. The test identity and Firestore documents were deleted after verification. The three resolved synthetic D1 records remain for audit; no customer data was changed. This does not replace production-specific alerting and a live chargeback/dispute rehearsal.


## November 15 - Production billing review storage prepared; live Stripe and tax NOT ready

- Audited the connected Stripe context read-only. Only the Popz Computers & App Development SANDBOX account is available; there is NO connected live merchant account in this workspace. Sandbox account details reported charges/payouts not enabled, but this cannot determine live merchant status.
- Sandbox Stripe Tax Settings are PENDING with head_office missing; there are ZERO tax registrations; the product has no tax_code and the one-time $9.99 price uses unspecified tax_behavior. Tax monitoring returned no jurisdictions and no computed freshness timestamp. No registration, product code, tax collection or live price was created.
- Queried the canonical Stripe Tax Codes API for candidate personal-use SaaS, SaaS-with-local-install, and downloadable software categories, but selected NONE. Alabama Administrative Code Rule 810-6-1-.37 generally treats software licensing as taxable regardless of transmission method, but the legal seller's real location/presence and actual tax obligations are unverified. Do not infer that the remote-seller threshold excuses local sellers; confirm with a tax advisor. See docs/LIVE-MERCHANT-TAX-REVIEW.md.
- Created isolated Cloudflare D1 popz-bowling-billing-review-production (821922f7-63cf-43a3-acb4-a446c1764c74), initialized the review schema, and independently verified it had ZERO records. This is NOT connected to the deployed production app or any user scoring/history D1. Sandbox D1 and incidents remain separate.
- Development branch alone now has a separate env.production BILLING_REVIEW_DB binding, strict main+https://popzbowling.com+explicit BILLING_REVIEW_PRODUCTION_ENABLED=true gate, and separate operator/monitor token file paths and disabled VPS production-timer unit sources. No production credentials were installed, no production timer was enabled, and no production Pages deployment occurred. Production API remains unavailable. See docs/PRODUCTION-BILLING-REVIEW-RUNBOOK.md.
- Verified preview/sandbox bearer tokens are invalid for production routes and vice versa in local SQLite tests. Admin may acknowledge/resolve without issuing refunds or changing Pro, monitor only sees anonymous alert summaries and can mark Telegram delivery. 88/88 Node regression tests passed and Wrangler Functions compiled without warnings.
- Identified a genuine release blocker: current Checkout validation and billing audit D1 schema assume a $9.99 (999 cent) PAYMENT TOTAL. A Stripe Checkout that adds sales tax on top will exceed the cap, fail signed fulfillment or lose refund-alert processing. The existing strict validation was left intact (tax is OFF) until owner/accountant approves a price/tax model; see docs/TAXED-CHECKOUT-COMPATIBILITY.md. Never turn on automatic_tax before fixing this and verifying active registrations.
- Drafted customer-facing purchase/refund/Terms/Privacy copy and a manual incident playbook as UNAPPROVED internal Markdown docs; NONE was published to the public site. Refund period, support contact, business identity, tax treatment and service-lifetime wording remain owner/legal decisions.
- Next gates: authorize connected LIVE Stripe account, verify charges/payouts, approve legal/tax data, create distinct live product/price/webhook/restricted credential, test tax-aware Checkout and refund, provision production-only tokens with an owner-approved rollout, and execute phone/tablet/offline + rollback checks before any real charge. Three Founder grants and public-v39.013 Pro Preview remain untouched.
