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


## November 14, 2026 - Firebase OAuth, IAM and Stripe sandbox checkout end-to-end setup
- User approved Google Cloud OAuth on the canonical MacBook. Google Cloud SDK verified project popz-bowling-stats and user michael5cents@gmail.com.
- Created dedicated service account popz-bowling-stripe-preview@popz-bowling-stats.iam.gserviceaccount.com with custom project IAM role projects/popz-bowling-stats/roles/popzBowlingBilling. Its ONLY Firestore permissions are datastore.entities.get, datastore.entities.create, datastore.entities.update; no list/delete/admin privileges. Credential was uploaded to encrypted Cloudflare Pages PREVIEW FIREBASE_SERVICE_ACCOUNT_JSON; the local private JSON file was immediately deleted. One user-managed key remains: the Cloudflare preview credential.
- Cloudflare preview deployed after secrets were installed; unsigned webhook requests are rejected with HTTP 400, proving configuration is loaded. The production app remains public-v39.013.
- Added ONLY stripe-lifetime-pro-preview.popzbowling.pages.dev to Firebase Auth authorized domains. Existing domains popz-bowling-stats.firebaseapp.com, popz-bowling-stats.web.app, popzbowling.com remain present and unchanged.
- Created one disposable Firebase Auth user popz_preview_e2e_20261114 with verified synthetic address popz-billing-sandbox@example.com. Email/password provider was left DISABLED; used a short-lived custom Firebase test token instead. All temporary Google service-account signing keys were revoked, and the temporary TokenCreator policy binding was removed.
- Authenticated with that real Firebase ID token and successfully called https://stripe-lifetime-pro-preview.popzbowling.pages.dev/api/billing/checkout. The actual Cloudflare endpoint verified the user and Stripe one-time USD 999-cent Price, then created Stripe-hosted test Checkout Session cs_test_a06ycn36beqMx7Se7G3ai1hF3xkQwGcYv4YvJx4R9u6hrC8s6RnJzeT2hG. It was OPEN/UNPAID at last check.
- Preview-only BILLING_CHECKOUT_ENABLED currently TRUE temporarily for this sandbox QA run, not for production. Production remained unchanged and only Stripe test mode is authorized. The test Checkout was opened on the user's Mac for human completion using Stripe's test card because a browser automation run encountered an anti-bot challenge. No real money is involved.
- A temporary operator-authenticated QA preflight route was tested for unauthorized access (404), then removed before the currently deployed preview build; its unused encrypted BILLING_QA_PROBE_TOKEN secret can be cleaned from Preview settings. No QA token was disclosed.
- Remaining: the human completes Stripe sandbox checkout, verify Stripe reports PAID and that the signed webhook grants a lifetime Pro entitlement to the disposable QA UID; inspect webhook delivery and Firestore state. Afterwards turn PREVIEW checkout flag FALSE, redeploy Preview, delete disposable test Auth user and its Firestore billing/entitlement records, remove local QA credentials, and update documentation. A public launch also requires refund/dispute/duplicates, tax, policies, Founder migration, live Stripe keys and explicit owner approval.


## November 14, 2026 - Locked-down sandbox fulfillment awaiting manual test card
- Deployed protected sandbox checkout with a strict allowlist for the disposable QA Firebase UID popz_preview_e2e_20261114. Preview Checkout now refuses any other signed-in user's UID, and the webhook's paid-session validator refuses to grant Pro to any other UID on the sandbox branch. Production main (live-mode-only) logic stays separate.
- A valid Firebase ID token for the disposable, verified QA account was minted using a temporary service-account signing key; that temporary key was revoked immediately after verifying the ID token. The user-managed service account key count is one (encrypted Cloudflare Preview credential). Owner's temporary TokenCreator binding was also revoked.
- Verified authenticated Cloudflare Preview POST /api/billing/checkout returned HTTP 200 and a Stripe-hosted Checkout URL for the one-time $9.99 price. Test Checkout Session cs_test_a06ycn36beqMx7Se7G3ai1hF3xkQwGcYv4YvJx4R9u6hrC8s6RnJzeT2hG was still open and unpaid at last check. No real customer or bowling-history document was changed.
- Opened the generated Checkout URL in the user's MacBook browser; headless automation encountered Stripe human verification, which was not bypassed. Owner can finish with the documented Stripe test card. A real paid webhook-to-Firestore verification has NOT yet succeeded; status must be checked after a completed test payment.
- IMPORTANT CURRENT STATE (supersedes earlier temporary-enabled setup): Cloudflare Preview BILLING_CHECKOUT_ENABLED=false again after QA, and the deployed Preview branch restricts webhook entitlements to the disposable UID. Unsigned webhook returned HTTP 400; new checkout returned HTTP 503. Production https://popzbowling.com remains public-v39.013.
- The operator-only temporary preflight JS route and the associated local QA token file were removed; an unused encrypted QA token binding remains in Preview settings for later cleanup. The disposable Firebase Auth test account and its one-time checkout session remain until the signed webhook and entitlement are verified; afterwards clean up test records, tokens, and unused QA settings.
- All 79 Node regression tests passed, including the explicit test that paid sandbox sessions for a different UID cannot activate Pro. No source changes to production main, Personal Bowling, users' scoring databases, or real Stripe account were made.


## 2026-11-14 — Real sandbox payment and Firestore activation PROVEN
- Stripe sandbox session cs_test_a06ycn36beqMx7Se7G3ai1hF3xkQwGcYv4YvJx4R9u6hrC8s6RnJzeT2hG returned status=complete, payment_status=paid, livemode=false, mode=payment, amount_total=999 cents USD, exactly one item of price_1UbqZiBmwB4QMGDE6oIXNFL0, linked only to disposable Firebase UID popz_preview_e2e_20261114. No real money moved.
- Stripe emitted real checkout.session.completed event evt_1UbuHZBmwB4QMGDEpQ5J61tZ for that session, with pending_webhooks=0.
- Independently fetched Firestore documents via authorized Google Cloud read-only inspection: users/popz_preview_e2e_20261114/entitlements/pro -> plan=pro, status=lifetime, source=stripe (HTTP 200); users/popz_preview_e2e_20261114/billing/stripeLifetime -> amountCents=999, currency=usd, checkoutSessionId matching the paid session, stripeEventId matching the event (HTTP 200).
- This establishes a real sandbox Stripe paid Checkout -> signed webhook -> Firebase lifetime entitlement end-to-end success. The return to the Popz Bowling welcome screen is consistent with the Checkout success redirect, but is NOT by itself evidence that the current browser's user was granted Pro.
- Cloudflare preview BILLING_CHECKOUT_ENABLED=false at the verification; live main remained public-v39.013. The disposable account, not any customer's Google identity, received the Lifetime Pro test grant.
- Only the disposable QA user and its two known Firestore test records are to be cleaned; retain Stripe test-mode payment and event for audit. Existing Founder Pro, customer data, public app, and Personal Bowling app remain untouched.


## November 14, 2026 — Post-payment verification and QA cleanup completed
- Stripe sandbox completed Checkout cs_test_a06ycn36beqMx7Se7G3ai1hF3xkQwGcYv4YvJx4R9u6hrC8s6RnJzeT2hG for USD $9.99 one-time Lifetime Pro (mode=payment, status=complete, payment_status=paid, livemode=false). Event checkout.session.completed, evt_1UbuHZBmwB4QMGDEpQ5J61tZ, had pending_webhooks=0.
- Queried Firestore test UID popz_preview_e2e_20261114 via Google Cloud credentials: entitlements/pro plan=pro, status=lifetime, source=stripe; billing/stripeLifetime matched the exact payment amount, currency, session, and event. This proves real signed webhook fulfillment rather than only a Checkout redirect.
- After verifying the records and synthetic identity, intentionally deleted ONLY two QA Firestore documents (users/popz_preview_e2e_20261114/entitlements/pro and /billing/stripeLifetime) using document update-time preconditions, then re-read both to verify 404. Deleted ONLY the synthetic Firebase Auth user popz_preview_e2e_20261114 (popz-billing-sandbox@example.com) and verified the ID is absent. No real user, Founder, scoring, or Personal Bowling data was deleted.
- Cleared local disposable Firebase ID token, Checkout URL, QA JWT claims and any remaining ephemeral local signing-key files from the MacBook cache. The completed payment and Stripe event remain as sandbox audit evidence.
- Confirmed https://stripe-lifetime-pro-preview.popzbowling.pages.dev/api/billing/config returns enabled=false, amountCents=999, lifetime=true; POST /api/billing/checkout returns HTTP 503. The production app still serves public-v39.013; no live Stripe charges or live Stripe authorization.
- Test-only restrictions in branch feature/stripe-lifetime-pro ensure preview purchase/grants target only the disposable QA UID (now deleted). Remove or generalize this QA allowlist only in a properly reviewed, authorized prelaunch integration. Keep checkout disabled until further planned tests and owner approval.
- Incomplete go-live requirements remain: restricted Stripe API key instead of broad sk_test key; one-time Pro feature entitlement UI/Founder entitlement migration and duplicate-purchase/refund/dispute handling; sales tax/legal terms; proper live Stripe account/product/price/webhook config; platform approval and publish. QA setup is successful, not approval for live sales.


## November 14 — first prelaunch commercial safeguard implementation
- Development branch introduced append-only billing review records for detected duplicate paid Checkout, refund.created/updated/failed, charge.refunded and charge.dispute.created/updated/closed. Verified Stripe resources and PaymentIntent product/UID must match the original canonical Firestore billing document. No refunds or Pro access changes are made automatically.
- Checkout now checks canonical original payment record as well as permanent Pro entitlement, refusing a repeat purchase if either already exists. Firestore canonical billing write is create-only (exists:false). A second paid webhook produces an operator review record without overwriting Founder or lifetime entitlements.
- Closed the preview QA fulfillment gate by default so signed events cannot reactivate the previously deleted disposable account; the sandbox's checkout remains disabled. Manual review alerts, cross-day/parallel open-session locking, tax and policies still block commercial launch.
- Added tests/test_stripe_billing_reconciliation.mjs and expanded the existing billing tests. Full suite: 80/80 passed, Wrangler Pages Functions compiled, server code excluded from the public bundle.
- Sandbox Stripe webhook endpoint we_1UbtmrBmwB4QMGDEUXnxKUrh now subscribes to the 3 existing Checkout events plus 7 new refund/dispute events; production Stripe was not authorized or touched.
- Verified Stripe sandbox charge ch_3UbuHXBmwB4QMGDE19ljAfnP was originally USD 999 cents and not refunded; then issued an explicit USD 999-cent **sandbox-only** full refund re_3UbuHXBmwB4QMGDE1qRHFsfL for payment intent pi_3UbuHXBmwB4QMGDE14La2wcX. Refund succeeded, and Stripe emitted refund.created evt_3UbuHXBmwB4QMGDE1x5gRfDN and charge.refunded evt_3UbuHXBmwB4QMGDE14zGFT3p with pending_webhooks=0.
- The real Stripe Refund API response omits a livemode property. The code was corrected to validate mode using the original verified PaymentIntent, and its tests now use a refund fixture without livemode. The already-closed preview QA gate acknowledges these events; no deleted Firebase test identity was re-created and no bowling user was modified.
- Follow-up blocker: this proves real Stripe sandbox refund event delivery, not refund-to-Firestore review storage with a current, matching QA account. Full manual-owner-alerting and duplicate parallel purchase prevention remain future prelaunch tasks. See docs/STRIPE-LAUNCH-SAFEGUARDS.md.


## November 14 — durable Checkout reservation preparation (development)
- Added atomic Firestore Checkout reservation, server-only source module, stable nonce-based Stripe idempotency and Stripe-verified expiration renewal with Firestore updateTime CAS.
- Additional concurrency and recovery tests cover parallel tabs, UTC day boundary, lost network response, stale unknown payments, paid/unpaid processing, identity mismatch and outages; existing tests were updated for actual reservation reads/writes.
- Checkout remains disabled in the Cloudflare Preview. No new production or live Stripe payment was attempted and the previous disposable QA identity is still deleted.
- Full rollout requires testing with a NEW disposable Firebase QA account and signed Stripe sandbox payment; currently the module has mock coverage and Wrangler build validation.


## November 15 — preview billing owner inbox and Telegram integration
- Created an independent Cloudflare D1 database popz-bowling-billing-review-preview (b86d17e8-6d9b-4039-af8f-2e6b8f7fb464). Created the billing_reviews table, with append-only Stripe event IDs, pending/notified Telegram states, manual_review_required/acknowledged/resolved owner review states, and timestamps. No production D1 database was altered.
- Added an env.preview.d1_databases binding named BILLING_REVIEW_DB in wrangler.toml; explicitly retained all three original app D1 bindings and left production D1 configuration unchanged.
- Added D1 queue ingestion to the existing Firestore private incident documents and the stale unknown Stripe Checkout lock. A D1 outage is treated as a retryable webhook failure. No customer emails, names, scores, card data or API credentials enter the D1 review queue.
- Added separate review-owner and Telegram-monitor 256-bit bearer tokens in Cloudflare Preview; only the owner token is stored locally on the MacBook and only the scoped monitor token is stored on PopzVPS. Telegram bot/chat remain exclusively on PopzVPS. Monitoring and review authorization are separate.
- Added preview-exclusive /api/billing/reviews endpoints and scripts/billing-review-owner.mjs, plus monitoring/billing-telegram-alerts.mjs and its VPS wrapper. Owner actions only acknowledge/resolve an audit row; no Stripe refunds or user entitlement changes. The VPS monitor sends only type/status/amount/review ID, not Firebase UID.
- Tests using real in-memory SQLite migration SQL verify D1 uniqueness, Stripe webhook retry behavior, role isolation, anonymous 404, replay deduplication, owner acknowledge/resolve and unknown Checkout event idempotency. Full suite 82/82 passed before deployment. The preview remains disabled for checkout.
- Runbook: docs/STRIPE-BILLING-REVIEW-RUNBOOK.md. Production billing is still disabled and lacks separately provisioned production owner alerts, real customer policy approvals, and a fresh E2E sandbox regression.


## November 15 — live sandbox alert delivery and owner workflow VERIFIED
- Cloudflare Pages preview deployed with a separate billing review D1 binding and encrypted owner/monitor bearer tokens; anonymous GET review endpoint returns 404. Owner token can list inbox; monitor token receives only nonidentifying pending alert metadata; monitor cannot list owner reviews.
- PopzVPS monitor script installed beside the existing health monitor (no existing file replaced). One sandbox-only synthetic checkout_uncertain item was inserted into the D1 review table; PopzVPS delivered exactly one alert through the existing Telegram bot, and the review API recorded notified. The next alert list returned zero items.
- Owner Mac CLI acknowledged the synthetic incident, resolved it with a descriptive note and independently confirmed that the open list is empty while the resolved item remains in all-history; a second resolution made no change. No Stripe checkout or real Firebase customer was involved.
- PopzVPS cron is not writable by the user. Installed independent popz-billing-alerts.service and popz-billing-alerts.timer via supported systemd user unit linking. Timer active, one-minute interval; test oneshot completed successfully; existing popz-monitor.timer remains active. Source units are stored in monitoring/systemd.
- Cloudflare checkout remains disabled on preview and production. The alert system does not auto-refund, unblock unknown Checkout attempts, revoke Pro, or edit scoring records.
