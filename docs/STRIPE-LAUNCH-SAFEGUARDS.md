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

- **Finish integration validation of the reservation.** Atomic Firestore locking and safe Stripe Session reuse are implemented and tested on the development branch. A new disposable QA account and full Cloudflare/Firestore/Stripe integration regression are still required. Build a documented manual unlock/reconciliation procedure for an ambiguous Stripe outcome older than 20 hours.
- **Production notification delivery and manual operations.** Sandbox now has a separate D1 review inbox, role-separated owner/monitor HTTP API, Telegram delivery monitor using the existing PopzVPS bot, and ack/resolve-only owner CLI. Before live billing, independently provision production-only D1 and tokens, test actual real-environment alerts and incident drills, set an acceptable response SLA, and confirm the existing monitor remains healthy.
- **Real review-record fulfillment still requires a new disposable test.** Stripe's real sandbox full refund generated refund.created and charge.refunded (both delivered), while the QA account had already been deleted and the QA grant gate was closed. Thus the HTTPS delivery was verified but no new Firestore review document was written; automated tests separately verify records, retries, amounts and Founder preservation. A fresh disposable test identity will be needed before launch for true refund/dispute-to-Firestore proof.
- **Finalize a written refund policy and dispute handling procedure.** No arbitrary full-refund window, fees, or unilateral revocation policy has been set.
- **Founder migration and paid-feature enforcement.** Pro Preview is still enabled for everyone. Establish qualifying Founder UIDs and grant `status=founder` before disabling Preview; verify cross-device account entitlement without affecting scoring history.
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
