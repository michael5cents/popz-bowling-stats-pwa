# Popz Bowling - Live billing credential readiness (2026-11-15)

Status: credentials installed, billing launch flags OFF. This is a verification record, NOT commercial go-live approval. Never store Stripe, webhook, or Firebase secret values in repositories or documents.

## Verified live configuration
- Connected LIVE Stripe merchant: Popz Computers & App Development, acct_1UbqNUPWlfgsVLEI.
- Stripe account API: charges_enabled=true, payouts_enabled=true, details_submitted=true at this inspection. Stripe still reports an identity-verification document due; monitor that separately in Dashboard.
- One-time LIVE product prod_VdUdkV2ijsyKCv with active USD 999-cent price price_1UcDf2PWlfgsVLEISDJ6MZaL, tax_behavior=inclusive.
- Signed LIVE webhook destination exists at https://popzbowling.com/api/billing/webhook.
- Wrangler production secret listing confirms encrypted STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and FIREBASE_SERVICE_ACCOUNT_JSON. Only names and encrypted status verified; this listing does not reveal values or test Stripe webhooks, private-key integrity or Firebase authorizations.
- Non-secret production Firebase web API key and price IDs are set in wrangler.toml. Dedicated billing service account is popz-bowling-stripe-prod@popz-bowling-stats.iam.gserviceaccount.com.
- Production GET /api/billing/config reports enabled=false, USD 999 cents; /api/billing/trial reports enabled=false and trialDays=30; production public-v39.014. Checkout and trials remain OFF.
- Stripe Tax Settings status=active and live tax registrations=0. BILLING_AUTOMATIC_TAX_ENABLED=false; do not infer that no sales tax is legally due.

## Verified non-destructive checks
- Read-only Founder audit: 3 verified Google/Firebase users, 3 permanent Founder records, 0 proposed data writes. No history or entitlements modified.
- Node test suite: 88/88 passing after updating three version-specific test assertions left on public-v39.013 following the earlier v39.014 release. Only the tests were edited.
- Separate real Firebase Emulator commercial rules suite: 154 permitted/denied operations PASSED, including Founder, lifetime, trial expiration, cross-user denial, batches and preserved historical scores. No live Firebase rules deployed.

## Go-live hold points
- Commercial Firestore rules are staged only; current production Pro Preview is ON and LIVE_SHARE_PREVIEW is true. Coordinate both flags, billing and trial flags, security rules, version update and recovery plan as one cutover.
- Live production billing-review operator/monitor token and Telegram alert delivery are not yet activated; live D1 binding exists.
- Customer-facing Privacy Policy, Terms, refund conditions, support contact and legal seller details remain drafts, not approved/published.
- Confirm tax obligations/registration as applicable before enabling automatic tax. Stripe's identity-verification document is still due.
- No live charge, real customer checkout or signed live webhook E2E has been performed in this verification. Keep the existing three Founder entitlements and bowling data intact.
