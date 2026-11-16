# Popz Bowling Stats - public-v39.015 commercial rollout

Owner specifically authorized public deployment on November 15, 2026. This rollout integrates the existing tested $9.99 LIVE Stripe Lifetime Pro Checkout, 30-day new-install trial, original 3 lifetime Founder accounts, Google Sync entitlement-based Firestore rules, production-only billing review queue and notices, and final-sale except verified billing problems policy. The personally approved future Founder can be granted separately after signing in; no automatic Founder eligibility for general users.

## Prepared release controls

- Production Pages branch must be exactly `main`; Stripe live key must be present; Checkout is enabled only when signed webhook key, live price, Firebase credentials and public Firebase web key are configured. Preview branch remains test-only.
- Production billing variables: BILLING_CHECKOUT_ENABLED=true, BILLING_TRIAL_ENABLED=true, BILLING_REVIEW_PRODUCTION_ENABLED=true, LIVE_SHARE_PREVIEW=false, BILLING_AUTOMATIC_TAX_ENABLED=false. Stripe Tax has no registrations; applicable tax obligations remain an owner/accountant responsibility, not resolved by toggling Stripe Tax.
- Google Sync client rules now check server-controlled permanent or unexpired trial entitlements, never trust browser claims. No scoring data is erased by changing rules. The three original permanent Founder records were audited read-only before cutover.
- Live score creation requires authenticated active Pro (Founder, paid, trial) instead of a preview bypass. Public Firebase key set for the live-share verification route.
- Version public-v39.015 and service-worker cache version bumped to force cohesive app update; tablet layout and core scoring are not modified.
- Public /terms.html, /privacy.html, /refund-policy.html are statically published, linked from install and purchase screens; final-sale except billing errors also displayed at Stripe Checkout before payment. Support feedback@popzbowling.com.
- Encrypted production secrets were independently confirmed: Stripe API key, Stripe signing secret, dedicated Firebase service-account credential and separate billing-review operator/monitor bearer credentials. Never print them in reports.
- Production review D1 database is separate from preview, telemetry and bowling scoring databases. Sandbox alert monitoring stays separate.
- 89/89 Node tests passed before the release, including payment reservation, duplicate prevention, refunds/disputes, trial protection, Founder preservation and local scoring. Wrangler Pages Functions built. Google Firebase CLI dry-run compiled commercial rules without changes.

## Required post-deploy verification

1. Confirm https://popzbowling.com/latest-version.json is public-v39.015; GET /api/billing/config reports enabled=true and 999 cents; GET /api/billing/trial reports enabled=true and trialDays=30.
2. GET and POST improper calls to webhook must not charge or fulfill; verify unsigned POST rejects with HTTP 400, not unavailable; GET remains 405.
3. Confirm production-only review endpoint responds with authenticated scoped tokens, and PopzVPS Telegram live timer is independently deployed and enabled.
4. Deploy the reviewed commercial Firestore security rules to project `popz-bowling-stats` only after the commercial website is live, then verify actual rules deployment and original Founder audit.
5. Confirm privacy, terms and refunds pages are served and are accessible from the live app; assess mobile/tablet/browser and offline install.
6. Ensure no test payment or paid customer record is created merely by smoke tests. First real purchase should be checked in Stripe and Firebase with the customer's consent.

## Rollback

Keep prelaunch `main` code and the previous firestore.rules source in a private local backup. If billing or trial cannot be reached, restore last stable Pro Preview app with old permissive rules to avoid locking existing users out of Google Sync. Never delete or edit customer bowling records during rollback.
