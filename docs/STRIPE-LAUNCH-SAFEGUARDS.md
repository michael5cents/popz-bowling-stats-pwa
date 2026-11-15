# Popz Bowling Pro Lifetime — prelaunch billing safeguards

Status: development / Stripe sandbox only. Current public app: public-v39.013. No live payments or production deployment.

## Purpose and verified baseline

Popz Bowling Pro is a $9.99 USD **one-time, lifetime** purchase. Founder and complimentary Pro remain free for life. Existing Free features, offline scoring, bowling history and local backups must never be deleted as a billing side effect.

On 2026-11-14, one genuine sandbox Checkout payment succeeded, its signed webhook delivered, and Firestore stored an exact lifetime entitlement and matching payment record for a disposable QA account. Both test Firestore documents and the disposable Auth user were later removed. That test does not establish production launch readiness.

## Safeguards implemented in feature/stripe-lifetime-pro

1. **No double charge for an already-paid account.** Before creating Checkout, the server checks both the verified Pro entitlement and the canonical Firestore billing document; either existing permanent Pro or an already-recorded payment prevents another Checkout.
2. **Protect canonical purchases.** Original `users/{uid}/billing/stripeLifetime` is created with a Firestore `exists:false` precondition and is never overwritten by a second paid session.
3. **Flag a second paid session rather than hide it.** If Stripe reports a different successfully paid Checkout for the same Pro/Founder account, preserve Pro, preserve the original billing document, and append a private `users/{uid}/billing/review_{stripeEventId}` audit document with `kind=duplicate_paid_purchase`, `reviewState=manual_review_required`, session ID, amount, and payment intent. A repeat webhook must not duplicate the record.
4. **Refund and dispute intake.** A signature-verified webhook handles `refund.created`, `refund.updated`, `refund.failed`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.updated`, and `charge.dispute.closed`. It re-reads Stripe's authoritative refund/charge/dispute and PaymentIntent data, checks Stripe mode, amount, product, Firebase UID, and the original paid Firestore billing record. Only matching Popz purchases generate an append-only private review record.
5. **No silent access changes.** Refunds, partial refunds and chargebacks do NOT automatically delete or revoke Pro, Founder access, user accounts, or bowling scores. Refunding money and changing entitlement are explicit owner-approved business decisions; the handler currently marks those events for manual review.
6. **Sandbox closed by default.** Checkout is off and the sandbox QA-specific grant gate is off unless explicitly activated for a fresh, disposable test UID. This blocks Stripe event replays from re-granting access to an already-deleted QA account. Test and live Stripe keys remain isolated by Cloudflare branch and checkout origin.
7. **Least privilege.** Firestore client rules deny writes to entitlement and billing subcollections; the dedicated Cloudflare preview service account has only Firestore entity get/create/update permissions. No server secret is in the public JS bundle or Git.

## Operator review of events

Review records are private Firestore documents under `users/{uid}/billing/review_{stripeEventId}`. They include kind, current Stripe status at handling time, amount, Stripe reference, PaymentIntent ID, and review state `manual_review_required`. Every risk event retains its own record; later events never overwrite earlier evidence.

For a real customer refund, dispute or second paid purchase, **review Stripe's dashboard and the original Checkout/PaymentIntent plus billing record first**; decide whether a refund/reversal is appropriate, verify payment outcome, contact the customer as required, and only then decide entitlement treatment. No automatic API refund or auto-revoke action is implemented. A review record is not itself an email, notification, or resolved ticket.

Do not interpret a dispute's temporary status as a final loss; do not equate a pending or failed refund with a successful refund. Existing Founder and complimentary grants must be preserved regardless of payment issues.

## Remains BLOCKING before live sales

- **Checkout reservation E2E verified in sandbox.** A fresh live authenticated sandbox test proved concurrent requests create only one Stripe session, paid fulfillment works, and another purchase is blocked. A manual resolution procedure for a genuinely ambiguous Checkout older than 20 hours is STILL required.
- **Production notification delivery and manual operations.** Sandbox now has a separate D1 review inbox, role-separated owner/monitor HTTP API, Telegram delivery monitor using the existing PopzVPS bot, and ack/resolve-only owner CLI. Before live billing, independently provision production-only D1 and tokens, test actual real-environment alerts and incident drills, set an acceptable response SLA, and confirm the existing monitor remains healthy.
- **Refund-to-operator alert E2E verified in sandbox.** Signed Stripe refund and charge-refunded events generated two verified private Firestore audits, two D1 inbox reviews, two Telegram alerts and successful operator resolution. A real chargeback/dispute rehearsal and production-only notification deployment remain to be completed.
- **Finalize a written refund policy and dispute handling procedure.** No arbitrary full-refund window, fees, or unilateral revocation policy has been set.
- **Commercial enforcement and server-side Google Sync rules.** Founder migration COMPLETE: exactly three verified existing accounts have permanent founder entitlements. The 30-day trial code and paid upgrade path are staged with trial activation disabled by default. Pro Preview remains on until the $9.99 live Checkout, server-side Sync enforcement, cross-device/offline tests and full owner go-live approval are ready.
- **Tax and disclosures.** Confirm sales tax nexus/registrations and correct digital-software tax classification with an appropriate advisor. Stripe Tax is currently not configured; do not activate automatic tax without actual registrations. Clarify whether $9.99 is inclusive or exclusive if tax applies. Publish Privacy Policy, Terms, refund policy and support/contact/data-deletion procedures.
- **Secure live configuration.** Replace sandbox broad `sk_test` with a restricted `rk_test` for staging, provision distinct restricted live keys and live Product/Price/Webhook only after separate account authorization, and verify webhook permissions.
- **Full commercial regression and approved go-live.** Test free, Founder, complimentary, lifetime, failed payment, refund/dispute, data retention, tablet/mobile layouts, history and rollback. Production billing stays off until the owner explicitly approves.

## Sources and tests

- `functions/_billing/core.mjs` — canonical entitlement, payment and append-only risk records.
- `functions/_billing/reconciliation.mjs` — Stripe re-verification and refund/dispute review.
- `functions/api/billing/webhook.js` — signature checks and event dispatch.
- `functions/api/billing/checkout.js` — authenticated Checkout and existing-payment guard.
- `tests/test_stripe_billing.mjs` and `tests/test_stripe_billing_reconciliation.mjs`.
- `docs/STRIPE-SANDBOX-VERIFICATION-2026-11-14.md` — dated real sandbox payment evidence and cleanup.

Do not merge, deploy to production, enable real Stripe payments, issue customer refunds, or change user entitlements without explicit owner approval.


## Durable per-account Checkout reservation — November 14
- Added functions/_billing/checkout-reservation.mjs. Before contacting Stripe, the authenticated backend claims a Firestore document at users/{uid}/billing/checkoutReservation with the atomic exists:false precondition; races cannot each create a chargeable session.
- The reservation stores the original verified UID, price, origin, email, 45-minute expiration, and a random 128-bit nonce. Stripe idempotency is derived from that nonce, NOT the calendar day. Repeated tabs, devices, and midnight crossings reuse the same Checkout URL.
- Lost Stripe responses can be retried with the SAME nonce, expiration and request parameters within a conservative 20-hour Stripe idempotency safety period. An older ambiguous creation remains blocked for owner review; it is never automatically assigned a fresh payment.
- Session reuse independently re-reads Stripe and verifies the user, reservation nonce, product, amount, currency, account mode, and expiration. A session that is complete (including delayed payment) cannot trigger a new charge. Only a Stripe-confirmed expired and unpaid session may be replaced with an updateTime compare-and-set.
- Client billing adapter and app show a payment-processing message instead of redirecting to an undefined URL. Existing bowling history, Founder and complimentary entitlements remain untouched.
- New tests/test_stripe_checkout_reservation.mjs covers races, device reuse, UTC midnight, safe expiry rotation, network-response loss, stale idempotency, tampering and Firestore outage. The existing mock Checkout test now enforces creation of an atomic reservation.


## Sandbox billing incident alerts and owner review
- Signed Stripe risk events and duplicate-paid-session detections first create idempotent private Firestore records and then insert a durable event into the isolated billing-review D1 database. If the D1 insert fails, the webhook fails so Stripe will retry rather than silently lose an alert.
- An uncertain Checkout older than the 20-hour Stripe idempotency safety interval remains blocked and creates exactly one D1 checkout_uncertain incident. Alert resolution is intentionally separate from unlocking a real payment reservation.
- PopzVPS reuses the existing Telegram bot but receives only a scoped monitor token and nonidentifying incident summary. Every alert remains pending until the Telegram API confirms delivery, then the VPS marks it notified. The owner can use the protected Mac CLI to list open/all reviews and acknowledge or resolve with a note.
- The preview-only D1 binding and IAM roles are separate from the production app and scoring databases. The route is available only on the exact preview alias with a cryptographically random bearer token; the monitor cannot access customer UIDs or resolve cases, and the owner role cannot impersonate notification delivery.
- Neither the alerting system nor the owner API can issue refunds, change Pro or Founder grants, or edit bowling records. See docs/STRIPE-BILLING-REVIEW-RUNBOOK.md.


## Live sandbox notification smoke test
On November 15, the isolated preview D1 review endpoint was verified with both owner and monitor credentials, then a single synthetic checkout_uncertain incident was delivered to the existing PopzVPS Telegram bot and marked notified. The owner CLI acknowledged/resolved it and retained the audit record. A separate user-level systemd timer now runs the sandbox monitor once per minute without modifying the existing health monitor. All 82 automated tests passed before this deployment. See docs/STRIPE-BILLING-REVIEW-RUNBOOK.md for exact commands and still-open production readiness work.

## November 15 - Full sandbox purchase and refund E2E
The next live sandbox regression passed with a fresh verified disposable Firebase account: one concurrent Checkout reservation, paid Stripe session, genuine signed webhook, correct lifetime entitlement and blocked duplicate purchase, successful test refund and two signed refund events, matching Firestore and D1 audit records, two delivered Telegram notifications and operator resolution. After exact-ownership verification, all five synthetic Firestore documents and the QA Auth identity were deleted. Preview Checkout and QA fulfillment are OFF again. The sandbox Stripe records and resolved D1 incident history remain as evidence. See the dated sandbox verification report. Live sale prerequisites remain outstanding.

## November 15 - Founder migration completed and 30-day new-user policy
Exactly three eligible verified Google accounts created before 2026-11-15T18:12:36Z were atomically granted nonexpiring Firestore Founder Pro (status=founder, source=founder). Independent audit confirms 3 of 3. The post-cutoff policy is a 30-day Pro installation trial, Free scoring and history thereafter, followed by an optional $9.99 one-time Lifetime Pro unlock. Account-bound trial grants use Firestore exists:false and cannot restart on device changes. Offline signed-out installations keep a first-launch timer; Founder and paid users may cache a verified grant for offline access. No browser client can write the authoritative entitlement document. The new trial enrollment API is disabled by default, main still serves Pro Preview, and live payments stay off. See docs/FOUNDER-AND-30DAY-TRIAL-POLICY.md.


## November 15 - Google Sync paid enforcement rule validation (staged only)

The current Firestore Rules only verify owner UID for cloud profile, session and deleted-session operations, allowing signed-in Free accounts to bypass the UI-only Pro feature gate. A new, separate candidate firestore.commercial.rules now checks the same owner's server-controlled entitlements/pro record before Google Sync operations. Permanent Founder/complimentary/lifetime grants always pass; trial/active accounts pass only with a native Firestore expiresAtTimestamp later than request.time; expired, missing and malformed records fail closed. End users cannot change their own entitlements or billing audit, and historical cloud sessions are never deleted merely because a trial expires.

The 30-day trial endpoint now writes the native server-authored Firestore expiry timestamp as well as the existing ISO text expiration for the browser. No extra client-side trust is introduced. Real Firebase Local Emulator verification PASSED 153 authorized/denied operations including 6-session batches, all 3 permanent grant classes, trial expiry, anonymous/cross-user rejection, preserved history and private record protection. Normal automated tests additionally assert that firebase.json STILL points to the original production firestore.rules. Test uses demo-popz-bowling-commercial-qa only, separate firebase.commercial.emulator.json, and no live data or identities.

The commercial rules are NOT deployed. Original public version public-v39.013, Pro Preview ON, preview trial/checkout OFF and the previously granted three Founders remain unchanged. A coordinated go-live rollout must include approved live Stripe payment and signed webhook, 30-day trial enrollment, server-side Firestore rules and Live Sharing Preview removal, cross-device/offline validation and rollback, all with explicit user approval. See docs/FIRESTORE-COMMERCIAL-ENFORCEMENT.md.
