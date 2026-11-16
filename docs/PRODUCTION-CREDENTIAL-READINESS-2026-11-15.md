# Popz Bowling - Live billing credential readiness (2026-11-15)

Status: credentials installed, billing launch flags OFF. This is a verification record, NOT commercial go-live approval. Never store Stripe, webhook, or Firebase secret values in repositories or documents.

## Verified live configuration
- Connected LIVE Stripe merchant: Popz Computers & App Development, acct_1UbqNUPWlfgsVLEI.
- Stripe account API: charges_enabled=true, payouts_enabled=true, details_submitted=true at this inspection. Stripe identity verification was initially due; on recheck after owner completed Dashboard verification, the LIVE account has currently_due=[], past_due=[], pending_verification=[], errors=[], disabled_reason=null. eventually_due=[company.vat_id] remains shown as an eventual field, not an active deadline.
- One-time LIVE product prod_VdUdkV2ijsyKCv with active USD 999-cent price price_1UcDf2PWlfgsVLEISDJ6MZaL, tax_behavior=inclusive.
- Signed LIVE webhook destination exists at https://popzbowling.com/api/billing/webhook.
- Wrangler production secret listing confirms encrypted STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and FIREBASE_SERVICE_ACCOUNT_JSON. Only names and encrypted status verified; this listing does not reveal values or test Stripe webhooks, private-key integrity or Firebase authorizations.
- Non-secret production Firebase web API key and price IDs are set in wrangler.toml. Dedicated billing service account is popz-bowling-stripe-prod@popz-bowling-stats.iam.gserviceaccount.com.
- Production GET /api/billing/config reports enabled=false, USD 999 cents; /api/billing/trial reports enabled=false and trialDays=30; production public-v39.014. Checkout and trials remain OFF.
- Stripe Tax Settings status=active and live tax registrations=0. BILLING_AUTOMATIC_TAX_ENABLED=false; do not infer that no sales tax is legally due.
- LIVE account recheck after identity verification: charges_enabled=true, payouts_enabled=true, details_submitted=true, no currently_due/past_due/pending_verification fields, no errors or disabled reason. Stripe's eventual VAT ID field is not an outstanding identity hold.

## Verified non-destructive checks
- Read-only Founder audit: 3 verified Google/Firebase users, 3 permanent Founder records, 0 proposed data writes. No history or entitlements modified.
- Node test suite: 88/88 passing after updating three version-specific test assertions left on public-v39.013 following the earlier v39.014 release. Only the tests were edited.
- Separate real Firebase Emulator commercial rules suite: 154 permitted/denied operations PASSED, including Founder, lifetime, trial expiration, cross-user denial, batches and preserved historical scores. No live Firebase rules deployed.

## Go-live hold points
- Commercial Firestore rules are staged only; current production Pro Preview is ON and LIVE_SHARE_PREVIEW is true. Coordinate both flags, billing and trial flags, security rules, version update and recovery plan as one cutover.
- Live production billing-review operator/monitor token and Telegram alert delivery are not yet activated; live D1 binding exists.
- Owner selected the app's existing feedback@popzbowling.com address for billing/refund support (confirmed in app.js, index.html and USER-GUIDE.md). Draft customer policies now include it. Stripe LIVE account API now independently confirms business_profile.support_email=feedback@popzbowling.com; mailbox delivery itself has not yet been tested.
- Owner approved a final-sale refund decision on 2026-11-15: no change-of-mind/non-use refunds; only verified billing errors and mandatory legal exceptions. Policy staged in docs/REFUND-POLICY-OWNER-APPROVED-2026-11-15.md. Customer-facing Privacy Policy, Terms, refund-policy legal review and seller details remain drafts, not yet published.
- Confirm tax obligations/registration as applicable before enabling automatic tax. Identity-document requirement has cleared after owner verification.
- No live charge, real customer checkout or signed live webhook E2E has been performed in this verification. Keep the existing three Founder entitlements and bowling data intact.

- OWNER CHANGE after original audit: one specific fourth Founder exception was approved for a customer installing Tuesday, November 17. No Firebase identity is known yet, and no fourth grant was made. Guarded after-install operator procedure is documented in docs/FOUNDER-AND-30DAY-TRIAL-POLICY.md; original three Founders remain intact.
