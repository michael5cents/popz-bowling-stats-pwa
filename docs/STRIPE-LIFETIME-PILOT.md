# Popz Bowling Stats — $9.99 Lifetime Pro / Stripe pilot

Date: 2026-11-14
Status: isolated development branch; NOT live; NOT accepting payments.
Source: MacBook ~/popz-bowling-stripe-pro, branch feature/stripe-lifetime-pro.

## Approved commercial direction
- Free PWA installation remains available. Basic scoring, league/handicap, Stats, History, local offline storage and manual backup/import remain useful without payment.
- Popz Bowling Pro: US $9.99, ONE-TIME lifetime purchase. No recurring subscription. Trial length undecided.
- Qualifying Founder Pro remains free for life. Existing complimentary and lifetime entitlements must be protected.
- Entitlement is attached to a verified Firebase/Google UID, not a phone or an untrusted user identifier. Future Android direct-download client may share Pro when native sign-in is implemented.
- No production data migration or change to the separate Personal Bowling app.
- The separately distributed Android APK remains a follow-on release; never publish a debug APK.

## Staged implementation
1. GET /api/billing/config returns public pricing and whether checkout is enabled (default: disabled).
2. POST /api/billing/checkout verifies a Firebase Auth token server-side, refuses Founder/complimentary/lifetime users, fetches an active Stripe one-time Price exactly USD $9.99, and creates Stripe-hosted card Checkout.
3. POST /api/billing/webhook verifies raw Stripe signature and timestamp, retrieves the paid Checkout Session from Stripe, checks account binding, exact amount/currency/product, and writes entitlement through an authorized Firebase service account.
4. Firestore atomic commit updates users/{uid}/entitlements/pro and users/{uid}/billing/stripeLifetime. Current client Firestore rules disallow users from writing either path.
5. Settings has a Lifetime Pro row and an Upgrade button hidden unless server-side checkout is enabled. Payment returns to dedicated success/cancel pages; no reliance on the browser install gate.
6. Billing client is explicitly allowlisted and precached for offline startup. Pro Preview remains enabled; no saved history is deleted.
7. Browser sends no payment-card numbers to Popz servers; card entry belongs to Stripe.

## Keys and setup: not yet configured
No Stripe or Firebase administrative credentials were installed, no real/test payments occurred, and no customer entitlements were changed. Do not paste secrets in chats or store them in Git, Obsidian, Wiki or the Collective. Use encrypted Cloudflare Pages secrets after account connection:
- STRIPE_SECRET_KEY (Stripe test-mode key for the first integration test)
- STRIPE_WEBHOOK_SECRET (Stripe event destination signing secret)
- FIREBASE_SERVICE_ACCOUNT_JSON (dedicated, least-privileged Firebase service account, not an Owner credential)

Non-secret Cloudflare configuration:
- STRIPE_LIFETIME_PRICE_ID (Stripe one-time Price ID for USD $9.99)
- FIREBASE_WEB_API_KEY (existing Firebase project's public Web API key)
- BILLING_CHECKOUT_ENABLED (keep unset or false until explicit approval after tests)

Stripe webhook destination when ready: https://popzbowling.com/api/billing/webhook. Supported event types: checkout.session.completed and checkout.session.async_payment_succeeded. Existing checkout deliberately refuses preview-host requests; staging payment testing will require a separate deliberate environment plan.

## Blocking steps before enabling real checkout
- Actual Stripe test-mode Checkout, webhook and cross-device Pro verification, duplicate event retries, Founder handling, and failed payments. Current automated tests use mocks.
- Refund/chargeback reversals and duplicate parallel purchase handling without deletion of bowling history. These are NOT yet implemented.
- Sales tax obligations and whether $9.99 is tax-inclusive; strict current code expects exactly $9.99 total.
- Privacy Policy, Terms, refund policy, customer support, account/data deletion paths and operational reconciliation.
- Founder user eligibility and grants before turning off Pro Preview. Preserve Free access and offline user data.
- Coordinate client/app/service-worker version bump, browser/tablet regression and rollback before any PWA deployment.
- Android: native Google sign-in, offline three-game persistence, data export/import, signed release APK, update strategy, direct-download instructions, developer verification, and testing. Debug APK is not a commercial release.

## Validation
- Full Node suite: 79 tests passed (mocked Stripe routes/signature/entitlement).
- Wrangler Pages Functions bundler compiled all three billing routes; server-only helper not exposed in public routes.
- Static dist allowlist isolates server code. No live deployment or production charge.
- Production main remains public-v39.013.

## 2026-11-14 — Stripe sandbox product confirmed
- Stripe connection: Popz Computers & App Development **sandbox** only (livemode=false). Live merchant account was not authorized.
- Product: Popz Bowling Pro Lifetime; ID `prod_Vd6n0W8JakrQl9`.
- One-time Price: `price_1UbqZiBmwB4QMGDE6oIXNFL0`, USD 999 cents ($9.99), `recurring=null`, `type=one_time`, `livemode=false`.
- Stripe Tax remains unconfigured; the customer has not previously collected sales tax on software sales. Before going live, determine applicable tax obligations; do not assume none are due.
- This Price ID is safe to reference as the future **sandbox-only** `STRIPE_LIFETIME_PRICE_ID`. The production Price ID will be different.
- No test charge has been made, no webhook secret, Stripe API secret, or Firebase service credentials were configured, and `BILLING_CHECKOUT_ENABLED` must remain false.
