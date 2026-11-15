# Popz Bowling — Billing Incident, Refund, Dispute, and Uncertain Checkout Playbook

**Draft operating procedure; NOT authorization to issue refunds, revoke Pro, unlock reservations, or contact a customer.** Prepared November 15, 2026.

## Safety baseline

- Product: $9.99 one-time Lifetime Pro, with a 30-day free Pro trial and three permanent Founder grants. No recurring payments or automatic trial-to-paid conversion.
- Real payment collection and the production review monitor are disabled. The isolated sandbox was proven with a real test-card payment, full refund and Telegram delivery. No actual customer or live transaction was used.
- Stripe's signed webhooks preserve the payment state, maintain a canonical Firestore receipt, and generate append-only refund/dispute/duplicate reviews. **Receiving a refund/dispute event does not automatically revoke Lifetime Pro or remove scoring history.**
- Production review storage exists but is dormant; see `docs/PRODUCTION-BILLING-REVIEW-RUNBOOK.md`. The only currently scheduled billing Telegram checker is the SANDBOX monitor.

## Incident investigation steps (once live is approved)

1. Read the alert's source environment and review ID. A sandbox alert is not a live charge. Use the owner-protected CLI in the correct mode: sandbox `node scripts/billing-review-owner.mjs open`, or production `node scripts/billing-review-owner.mjs --production open` **after** separately configured live credentials. Never share owner tokens, Firebase UIDs or card data in chat, Telegram or Git logs.
2. Open the exact original Stripe Checkout Session / PaymentIntent / Charge / Refund or Dispute in the appropriate Stripe mode. Independently verify merchant account, livemode, customer reference, one-time product, original $9.99 price and any approved tax, charged amount, currency, payment settlement status, and linked Firebase UID.
3. Inspect the immutable canonical Firestore payment record and any previous review IDs. Confirm that this is the same purchase, not an unrelated Stripe charge, another user's purchase, or a repeated webhook event.
4. Acknowledge the review item and record an operator investigation note. Acknowledgement is not a refund or a user-access change.
5. Determine the necessary customer response under the **approved published Refund Policy** and any applicable legal rights. Confirm transaction state and evidence before taking any action.
6. Any actual refund, dispute evidence submission, reservation unlock or customer access change requires explicit owner approval and separate authorized Stripe/Firebase controls. Do not take action merely to make the Telegram alert disappear.
7. Once the underlying issue is independently verified and the relevant action is complete, resolve the review with a descriptive note. The original Stripe transaction and review audit remain saved.
8. Monitor webhook failures, D1 delivery, Telegram status and customer support replies until the issue truly closes. Missing D1 records must fail safely and trigger Stripe retry rather than silently losing a billing incident.

## Event-specific safeguards

**Duplicate paid sessions**: Verify both paid transactions independently. Never rewrite the original canonical purchase or send a second lifetime entitlement. Determine whether the second payment requires a refund; do not issue one automatically without approval or if it is an unrelated transaction. Record the decision and user notification as appropriate.

**Refund created / updated / failed**: A pending refund is not a completed refund. Read its latest state, amount and original PaymentIntent. Full and partial refunds are distinct. Preserve the three Founder entitlements. A processed refund alone does not automatically justify deleting bowling scores or access without an owner-approved policy and consumer-rights review.

**Charge refunded**: Treat the Stripe charge state and the refund resource as separate events that may produce separate review IDs. They are not necessarily two refunds. Idempotent event handling must prevent duplicate operator actions.

**Dispute or chargeback**: Verify live merchant mode, dispute ID, amount, current status and Stripe evidence deadline in the Dashboard. The deadlines and evidence requirements are dispute-specific; **do not invent a standard number of days**. Follow the applicable business/consumer policy and document evidence before Stripe's deadline. Do not automatically refund a charge with an open dispute if that creates an additional loss; verify with Stripe.

**Stale/ambiguous Checkout**: The reservation intentionally blocks a new purchase after a lost Stripe response passes the 20-hour idempotency safety window. It creates one `checkout_uncertain` owner review. Examine the original reservation UID/nonce and Stripe search/Workbench events, determine whether any session was created, could still settle asynchronously, or already charged. **There is currently no approved automated reservation-release action.** Do not manually clear/rewrite the Firestore lock without a separately reviewed compare-and-set unlock implementation and exact Stripe proof of nonpayment. Resolving the inbox item alone DOES NOT unlock Checkout.

## Privacy and support

Keep Telegram alerts non-identifying: issue kind, Stripe status, amount and review ID only. Never include customer emails or bowling history in a channel alert. Customer communications should use an owner-approved support identity and accurate receipt references; do not request CVV or full card numbers.

## Before the first live customer

- Approve refund window/conditions, service lifetime wording, billing support email, incident response owner and escalation contacts, and actual expected response time.
- Verify the live Stripe account/price/webhook, tax settings, production-only D1/tokens, and genuine alert delivery.
- Implement and test manual stale-reservation unlock safeguards after confirming no payment can still settle.
- Test both full and partial refunds, two Stripe events for one refund, a real test dispute where supported, duplicate paid-session behavior, tax-inclusive/exclusive totals as approved, Founder preservation, history retention, outage retry, and correct customer messaging.
- Keep production payments off until owner approves the complete launch.
