# Popz Bowling Stats — $9.99 Lifetime Pro / Stripe pilot

Date: 2026-11-14
Status: isolated development branch; NOT live; NOT accepting payments.
Source: MacBook ~/popz-bowling-stripe-pro, branch feature/stripe-lifetime-pro.


## Current status — post-successful sandbox payment

**New development safeguard:** Firestore atomic Checkout reservation prevents parallel and cross-day Stripe purchase attempts; only a Stripe-confirmed expired/unpaid session can be replaced. Checkout remains disabled and the implementation is not in production.

The full Stripe test payment -> signature-verified webhook -> Firestore Lifetime Pro activation was independently verified on November 14. The disposable QA user and its test Firestore billing/entitlement documents were removed afterward. Cloudflare Preview is deployed but Checkout is disabled; the production PWA remains public-v39.013 with no live payments.
Further launch safeguards, including append-only duplicate-payment/refund/dispute review, are in docs/STRIPE-LAUNCH-SAFEGUARDS.md.
**All paragraphs below describing credentials as missing, a preview as not deployed, or all tests as mocks are historical setup notes; they no longer describe the current sandbox state.** They do not authorize a production deployment or paid launch.

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
- STRIPE_SECRET_KEY (prefer a least-privilege restricted rk_test_ key in the sandbox; never commit secret credentials)
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

## Sandbox Checkout verification (continued November 14)
The real Stripe sandbox Price and actual unpaid Checkout Session were verified by Stripe API, and Wrangler local Pages endpoints were smoke-tested with checkout disabled. See docs/STRIPE-SANDBOX-VERIFICATION-2026-11-14.md for the exact product/price IDs, test session details, integration refinements, and remaining secure preview credentials. Nothing was deployed or charged.

## Secure sandbox preview
- Test site: https://stripe-lifetime-pro-preview.popzbowling.pages.dev
- Only the exact stripe-lifetime-pro-preview branch may use sandbox Stripe keys; production must use live-mode Stripe keys only after launch approval. Both are separate from the Personal Bowling app.
- No complete test-mode Checkout payment or Firebase entitlement fulfillment has occurred. The deployed preview intentionally has checkout disabled. See the dated sandbox verification log.

## Sandbox webhook endpoint and credential installer
- Created Stripe sandbox endpoint we_1UbtmrBmwB4QMGDEUXnxKUrh delivering signed payment events to the isolated branch alias.
- Stripe signing secret is configured in Cloudflare Preview, but restricted API key and dedicated Firebase service account are not.
- Stripe Dashboard sandbox API keys: https://dashboard.stripe.com/apikeys . Create a restricted rk_test_ key with Checkout Sessions Read+Write and Prices Read; never copy into chat.
- After operator copies it on the Mac, execute node scripts/configure-stripe-preview-key.mjs. It validates the exact Stripe sandbox product/price and uploads securely to Cloudflare Preview without writing to disk.
- For a dedicated Firebase service-account JSON, execute node scripts/configure-firebase-preview-service-account.mjs /absolute/path/to/file.json after Google Cloud IAM creation with minimum permissions; do not commit the JSON.
- Keep billing disabled until a completed sandbox purchase has confirmed a verified signed webhook and entitlement grant to the correct Google identity. Production remains unchanged.

## Owner alerts (sandbox preview only)
Billing risk events and Checkout creation ambiguity are now queued in an isolated preview D1 database for Telegram delivery through PopzVPS. The authorized Mac owner CLI can acknowledge/resolve review rows without touching payments or customer access. See docs/STRIPE-BILLING-REVIEW-RUNBOOK.md. Separate production setup and testing remain required before live checkout.

## November 15 - Full sandbox commercial E2E verified
The isolated Stripe Preview passed a genuine $9.99 test purchase with a Firestore atomic Checkout reservation, signed webhook Lifetime Pro activation, second-charge prevention, a full Stripe sandbox refund, verified Firestore/D1 risk records and real Telegram alerts, followed by operator review and full disposable Firebase cleanup. Preview checkout and QA fulfillment are OFF, production is unchanged at public-v39.013. This is not production release approval: Founder migration, tax/legal/terms/refund policies, separate production alerts, live restricted Stripe keys and a final rollout decision remain.

## November 15 - Actual Founder grants and approved 30-day trial
Owner approved a cap of three permanent Founder Pro accounts (existing verified Google users as of 2026-11-15T18:12:36Z) and a 30-day Pro trial for every subsequent newly installed PWA. Three create-only Firestore Founder grants were committed and verified; no customer history or billing documents were modified. After the trial, Free remains available, and a single $9.99 hosted Stripe Checkout can grant Lifetime Pro. Trial activation through the trusted server is default OFF, the production Pro Preview is still ON, and no live Stripe charge is enabled. The client-local trial clock has an anonymous reinstall limitation: strict one-per-person enforcement requires verified account enrollment. See docs/FOUNDER-AND-30DAY-TRIAL-POLICY.md.
