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


## Cloudflare OAuth recovery and preview deployment, November 14
- Previously configured Wrangler was present on the canonical MacBook; its persisted OAuth access token had expired. Refreshed existing login via MacBook browser OAuth, no new account/installation.
- Verified existing Cloudflare Pages project popzbowling using Wrangler 4.162.0; canonical source branch remains feature/stripe-lifetime-pro. The public main site is still public-v39.013.
- Deployed pre-production branch stripe-lifetime-pro-preview to https://stripe-lifetime-pro-preview.popzbowling.pages.dev, initial deployment ID a616a257; Wrangler compiled Pages Functions and published the strict dist/ allowlist, not source files.
- Verified preview via live HTTPS: GET /api/billing/config HTTP 200, enabled:false, USD 999 cents, lifetime true; POST /api/billing/checkout and POST /api/billing/webhook return HTTP 503; both /payment/success/ and /payment/cancel/ return HTTP 200. Production remains the same version.
- Later source hardening enforces explicit origin/Stripe-mode separation: only stripe-lifetime-pro-preview Cloudflare branch and exact branch-alias URL can use sandbox keys; only main plus popzbowling.com can use live keys. Unrelated preview branches fail closed. Test coverage asserts those boundaries.
- No secret Stripe API keys, Firebase service credentials, or webhook signing secrets were configured or committed as part of this code deployment; payment activation requires separate explicit integration testing.


## Verified Cloudflare preview environment setup
- Authenticated Wrangler against the established Cloudflare project from the original MacBook, using user-approved browser OAuth.
- Cloudflare preview environment now stores four encrypted bindings: STRIPE_LIFETIME_PRICE_ID (verified test price), STRIPE_LIFETIME_PRODUCT_ID (verified test product), FIREBASE_WEB_API_KEY (already public Firebase client configuration), and BILLING_CHECKOUT_ENABLED explicitly false.
- STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and FIREBASE_SERVICE_ACCOUNT_JSON are still not configured. Nothing can start real checkout or grant Pro.
- Checkout origin checks additionally require the exact branch-alias URL and the proper Stripe key mode; the production origin is accepted only with live mode on branch main (but checkout remains absent/disabled on the live main app).
- Stripe restricted test API key, signed test webhook, and minimal Firebase service account are future secure prerequisites, never stored in code or ordinary documentation.


## November 14, 2026 — Cloudflare OAuth recovered and Stripe preview deployed
- Correct existing Cloudflare Pages project is popzbowling; Wrangler was previously deployed but its saved OAuth access token expired. Reauthorized the existing Wrangler on MacBook with the user's browser approval.
- Working Stripe source branch feature/stripe-lifetime-pro, commit 590f2746a2d1, synchronized on GitHub and Gitea. Strict one-time $9.99 Stripe sandbox price and verified Stripe product remain configured.
- Separate branch preview deployed to https://stripe-lifetime-pro-preview.popzbowling.pages.dev (deployment beb008b8); production main was NOT deployed.
- Preview-only encrypted bindings added: BILLING_CHECKOUT_ENABLED=false, STRIPE_LIFETIME_PRICE_ID, STRIPE_LIFETIME_PRODUCT_ID, FIREBASE_WEB_API_KEY (public Firebase client key). The secret Stripe API key, Stripe webhook signing secret, and Firebase service account are not configured.
- API smoke on live preview: GET billing config returned HTTP 200, price 999 USD cents, enabled false. POST checkout and POST webhook returned HTTP 503 (blocked); payment success/cancel pages and billing-client module returned HTTP 200.
- Strict checkout origin isolation: only the explicit preview branch on the preview alias can use test Stripe keys; only production main at popzbowling.com can use live keys. Mocked signed webhook checks prevent unpaid grants and preserve Founder Pro.
- All 79 Node tests passed; no production billing, real payments, database migration, customer history edits, or Personal Bowling changes. Production /api/health returned ok=true and public-v39.013.
- Next: provision encrypted least-privilege Stripe test API key, sandbox webhook signing secret, and dedicated Firebase service account; run authenticated browser test purchase and verified Firebase lifetime entitlement; then plan refund/dispute, duplicate purchases, tax/legal, and Founder migration before going live. Never put credential values in Git, logs, wiki, or chat.


## November 14, 2026 — Stripe webhook created; sandbox credentials handoff
- In the authorized Popz Computers & App Development sandbox, created and verified active Stripe webhook endpoint we_1UbtmrBmwB4QMGDEUXnxKUrh, targeting https://stripe-lifetime-pro-preview.popzbowling.pages.dev/api/billing/webhook. Events enabled: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed; api version 2026-09-30.endive; livemode=false.
- The newly issued signing secret was uploaded via the Mac to encrypted Cloudflare Pages Preview secret STRIPE_WEBHOOK_SECRET and removed from its short-lived local file. Neither the secret nor a Stripe API key was written in Git, Obsidian, Collective, Wiki or chat.
- Preview remains disabled: BILLING_CHECKOUT_ENABLED=false; live site public-v39.013 unchanged. STRIPE_SECRET_KEY and FIREBASE_SERVICE_ACCOUNT_JSON are the two missing private credentials before end-to-end sandbox purchase.
- Added safe operator helper scripts/configure-stripe-preview-key.mjs, which reads an rk_test_ restricted Stripe key from the Mac clipboard, verifies it against the exact $9.99 sandbox Price, and uploads it to encrypted Cloudflare Preview, never printing it. Required permissions from the existing implementation: Checkout Sessions Read and Write, Prices Read.
- Added safe operator helper scripts/configure-firebase-preview-service-account.mjs, which accepts only a dedicated popz-bowling-stripe-preview service-account JSON for Google Cloud project popz-bowling-stats and uploads it as a Cloudflare Preview encrypted secret. Creation/privilege assignment must be approved through Google Cloud IAM; do not use Owner credentials.
- Stripe does not expose a usable API operation through the connected account to issue a restricted API key; Stripe's Dashboard must issue the sandbox key. User will copy key locally, not paste into chat. No real or sandbox payment is completed yet.

## November 14 (later) — Stripe sandbox API key installed
- The Mac clipboard contained Stripe `sk_test_` (sandbox secret), rather than the preferred `rk_test_` restricted key. Verified directly with Stripe that the key retrieves the intended $9.99 one-time sandbox Price and correct Product.
- Installed that sandbox-only key as encrypted Cloudflare Pages Preview secret `STRIPE_SECRET_KEY`; no key values were printed, saved in Git, or transmitted to chat. The clipboard was cleared after successful upload.
- Existing `STRIPE_WEBHOOK_SECRET` remains configured and the preview billing switch remains `false`. Production is not affected. Replace the broad sandbox key with a minimal `rk_test_` restricted key before a public release.
- Official Google Cloud SDK installed locally on the Mac and initialized with a local compatible Python to provision a dedicated Firebase service account; Google Cloud OAuth authorization is pending. No IAM access changes or real payments made yet.
