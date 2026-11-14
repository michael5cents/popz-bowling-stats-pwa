# Popz Bowling Stats — Stripe Sandbox Verification

Date: 2026-11-14
Scope: sandbox-only verification. No public deploy and no real payment.

## Verified Stripe account and product
- Authorized Stripe context: acct_1UbmSbBmwB4QMGDE, Popz Computers & App Development sandbox; livemode false. Do not use the live account.
- Product: Popz Bowling Pro Lifetime; ID prod_Vd6n0W8JakrQl9.
- Stripe Price ID: price_1UbqZiBmwB4QMGDE6oIXNFL0; amount 999 USD cents ($9.99), active one-time price, recurring null, livemode false.
- Product tax code and Stripe Tax remain unconfigured. Sales tax obligations must be reviewed before real sales.

## Real Stripe sandbox API smoke test
- Created a genuine Stripe-hosted Checkout Session using the verified sandbox Price, a synthetic non-customer UID (popz_sandbox_smoke_test), and a fixed $9.99 one-time line item.
- Session ID: cs_test_a0RQD8U3vheNvbAZDa3z93R7KLzWLdeMUCn6AM6t2oHVwuedkePhB1E1KS.
- Stripe reported status open, payment_status unpaid, amount_total 999, livemode false. No payment was completed and no Pro entitlement was written.
- Retrieved the Session with expanded line_items: one item, quantity one, price_1UbqZiBmwB4QMGDE6oIXNFL0; matches the server's validation schema.
- Stripe's automatic payment-method selection offered card and other eligible methods. Do not force card-only payment_method_types.

## Local code and Cloudflare Pages tests
- Development branch: feature/stripe-lifetime-pro, isolated from main.
- Server helper now accepts least-privilege restricted rk_test_ / rk_live_ keys; also accepts sk_ keys if needed. Never put secret keys in repository or user chat.
- Validates price active/one-time/USD 999, Stripe account mode, optional exact product ID, and paid session amount/product/account fields before granting lifetime Pro.
- Checkout uses dynamic payment-method selection, stable per-UID-per-day idempotency key and integration_identifier label, HTTPS Stripe-hosted redirect.
- Signature validation supports multiple v1 signatures during Stripe webhook-secret rotation and enforces timestamp freshness.
- Mocked tests verify Founder protection, no unpaid grant, signed webhook, exact price, duplicate webhook handling, retry consistency and secrets-disabled behavior.
- Wrangler local Cloudflare Pages responded GET /api/billing/config HTTP 200 with amountCents 999 and enabled false; POST checkout and webhook returned HTTP 503 with credentials absent. Fail closed confirmed.
- No completed test purchase, Firebase service-account grant, browser payment flow, or real webhook delivery has yet been tested.
- Cloudflare production and preview were not deployed or changed. Noninteractive Wrangler preview deployment lacked reliably authenticated credentials.

## Next configuration (do not enable real payments)
- In the Cloudflare preview environment, set STRIPE_LIFETIME_PRICE_ID=price_1UbqZiBmwB4QMGDE6oIXNFL0 and STRIPE_LIFETIME_PRODUCT_ID=prod_Vd6n0W8JakrQl9 (non-secret values).
- Create a restricted Stripe sandbox API key with only the needed Checkout Sessions and Price read/write scopes and store it as an encrypted Cloudflare secret named STRIPE_SECRET_KEY.
- Create a test-mode Stripe webhook destination pointing to the isolated preview endpoint after it exists. Store its whsec_ signing secret in encrypted Cloudflare secret STRIPE_WEBHOOK_SECRET.
- Supply dedicated minimally privileged Firebase service-account credentials only through encrypted Cloudflare secret FIREBASE_SERVICE_ACCOUNT_JSON, and configure the public FIREBASE_WEB_API_KEY for the same Firebase project.
- Keep BILLING_CHECKOUT_ENABLED=false until real test-mode Checkout -> signed webhook -> correct Firebase UID entitlement passes on the isolated preview. Never switch real checkout on without explicit go-live approval.
- Before launch: handle refunds/disputes and duplicate purchases, settle taxes, account support/refund/privacy policies, protect Founder Pro, and coordinate proper release/version testing.
- Direct Android APK release remains separate and requires signed-build, native sign-in, offline/history and data-transfer verification.

Detailed original implementation architecture: docs/STRIPE-LIFETIME-PILOT.md.
