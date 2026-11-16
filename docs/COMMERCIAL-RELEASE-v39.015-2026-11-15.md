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

## Actual verified production cutover - November 15, 2026

- Wrangler successfully deployed **public-v39.015** to the exact Cloudflare Pages production branch `main` (deployment https://1b121169.popzbowling.pages.dev). Public https://popzbowling.com/latest-version.json returned version public-v39.015, and GET /api/billing/config returned enabled=true with amountCents=999 and lifetime=true. GET /api/billing/trial returned enabled=true and trialDays=30.
- Public /terms.html, /privacy.html and /refund-policy.html each returned HTTP 200; customer-facing no-refund-except-billing-issues notice is in the bundled app and Stripe Checkout.
- Unsigned POST to /api/billing/webhook returned HTTP 400 `Invalid signature` (secret present, signature checking active). No real charge was made in deployment testing.
- Firebase CLI `firebase deploy --only firestore:rules --project popz-bowling-stats --non-interactive` succeeded, including rules compilation, upload and release to cloud.firestore. No bowling records were changed by rule deployment. Existing 3 Founder accounts were audited read-only immediately after, 3/3 permanent grants, 0 writes.
- Live operator review CLI verified production-only D1 is reachable and currently empty. Created two separate encrypted Cloudflare production review tokens, with owner credential on Mac and scoped monitor token on PopzVPS. PopzVPS installed its independent production Telegram billing monitor and enabled the new per-minute user systemd timer. Its first one-shot run exited successfully. Existing sandbox timer remains active separately.
- Owner's Mac Desktop Founder Admin app was locally built, signed, and launched; source is private/local only, with no public HTTP admin route. The packaged backend read-only Google-account lookup succeeded. No real customer's Founder record was written in test. The original three Founder entitlements remain unchanged. See docs/FOUNDER-ADMIN-MAC-2026-11-15.md.
- Full source test suite: **90 passed / 0 failed**, including new safe manual Founder grant tests. Swift GUI compiled and macOS bundle signature validated. The optional older full Playwright phone QA script has stale layout assumptions and did not produce a passing verdict; the release does not change the core scoring layout. Avoid claiming browser regression certification from that script.

**Ongoing business obligation:** Stripe Tax has ZERO registered tax jurisdictions and automatic tax remains disabled. Business owner must confirm applicable sales-tax compliance separately. Account support is feedback@popzbowling.com; live Stripe payments and payouts are enabled. Customer-facing policy was published under owner launch authorization and should receive independent legal/accounting review as appropriate.

## Additional browser verification

A fresh installed-PWA browser context using actual **https://popzbowling.com**, Google Chrome on Mac and 390x844 phone / 820x1180 tablet viewports PASSED both direct live smoke tests: correct public-v39.015 HTML version, Bowl default landing, automatically Compact Phone for phone, preserved Full Layout for tablet, Start Series reached scoring controls, and ZERO JavaScript page errors in either context. The older extended browser QA script still contains unrelated stale button/display assumptions; the focused production smoke test does not claim to cover every extended browser path.
