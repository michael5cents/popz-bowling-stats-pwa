# Popz Bowling Founder and 30-Day Pro Trial Policy

**Approved November 15, 2026 at 12:12:36 PM Central Standard Time** (2026-11-15T18:12:36Z).

## Owner decisions

1. The **three existing verified Google/Firebase accounts are Founder Pro, free for life**. All three were created before the owner-approved cutoff. Their entitlements were atomically created (not overwritten) on Nov 15: plan=pro, status=founder, source=founder, cohort=founder-2026. No expiration, no purchase required. Post-write verification found three Founder records and no preexisting paid or complimentary records. No bowling/scoring data changed.
2. **Founder cap is three, and Founder registration is closed.** Accounts created after the cutoff do not qualify automatically. The approved three-UID roster is maintained privately at ~/.config/popz-bowling/founder-manifest-20261115.json (0600, MacBook only); do not commit, publish or disclose these identities.
3. **New installations get 30 days of Pro** from their first installed-app launch once the commercial trial release is deployed. The earliest permissible starting point is the Nov 15 cutoff; the window is exactly 30 x 24 hours.
4. On a new installation, local IndexedDB stores the original first-launch time and last-seen clock, preserved by normal in-app data resets. During the trial, offline Pro features are available. After expiry, Free local scoring, leagues, Stats, History, backups and manual imports stay available.
5. A **Google/Firebase verified account** receives one server-controlled trial record (plan=pro, status=trial, source=installation, trialStartedAt and expiresAt) through the same-origin Cloudflare API when enrollment is explicitly enabled. A Firestore exists:false precondition ensures the account cannot restart its trial across a second device, repeated requests or reinstalls. The server clamps any installation time to the Founder cutoff and current server time. Existing Founder/complimentary/lifetime/trial records cannot be overwritten by enrollment.
6. After the 30 days, Pro access requires an **explicit $9.99 one-time Lifetime Pro purchase**, not a recurring subscription or automatic charge. Purchases use hosted Stripe Checkout with signed webhook fulfillment to status=lifetime, restoring Pro on all devices for that Google account. A user may purchase while their trial is still active.
7. Founder, complimentary and paid Lifetime Pro always remain active. Existing bowling histories must never be deleted due to trial expiry or billing. Previously verified entitlements can be cached locally for offline use, and the app clears the cached grant when users explicitly sign out.

## Implementation status and release blockers

- **LIVE:** Three permanent Founder entitlements created and independently verified in Firebase. Only the three approved entitlement documents were changed in production data.
- **DEVELOPMENT BRANCH ONLY:** The 30-day trial policy module, device-first-launch clock, Google-sign-in enrollment route, expiry UI, cached offline Founder access, client-side Pro gating and test suite are implemented.
- **NOT ENABLED FOR NEW CUSTOMER CHARGES:** Production Pro Preview still equals true. Cloudflare trial enrollment defaults OFF and live Stripe Checkout is OFF. Do not take Pro away after 30 days until the real $9.99 purchase can be completed.
- **Reinstallation limitation:** Browser storage clearing can reset an anonymous local-only trial. Account-bound Firebase trial records prevent restarting once the user signs in. Strict one-trial-per-person enforcement would require a verified account to access the trial from day one.
- **Server enforcement not yet deployed:** Firestore scoring-session sync rules currently permit owner reads/writes independently of Pro state; future commercial go-live must test server-side Sync authorization and Live Sharing Preview shutdown. Do not activate restrictive rules before payments and migration are tested.
- Remaining gates: actual live Stripe restricted key/account/webhook, production-only billing alert database and secrets, owner refunds/disputes and ambiguous Checkout policies, tax/legal/privacy/terms, phone and tablet regression, and explicit launch authorization.

## Operator checks

Aggregate read-only audit (does not print user IDs/emails):

    cd ~/popz-bowling-stripe-pro
    node scripts/founder-migration-audit.mjs --manifest ~/.config/popz-bowling/founder-manifest-20261115.json

Expected: 3 verified Google users, 3 Founder entitlements, 0 proposed writes, cap not exceeded.

Relevant test files: tests/test_founder_migration.mjs; tests/test_30day_trial_policy.mjs; tests/test_stripe_30day_trial.mjs; tests/test_trial_upgrade_lifetime.mjs; tests/test_entitlements.mjs; tests/test_dist_allowlist.mjs; tests/test_service_worker_cache.mjs.

Trial implementation: trial-policy.mjs and functions/api/billing/trial.js. Trial activation remains gated by BILLING_TRIAL_ENABLED=true, correct Stripe sandbox/live branch isolation, and the Preview QA allowlist. The owner must approve the actual public rollout separately.


## November 15 - Test preview deployment verified with enrollment OFF
- Owner-approved Founder migration: three existing verified Firebase/Google accounts received permanent nonexpiring Founder Pro, atomic create-only, verified 3/3. The cutoff is 2026-11-15T18:12:36Z; cap 3, enrollment closed.
- Post-cutoff 30-day Pro trial and account-bound create-once entitlement path added in Stripe development branch, with offline first-launch clock and $9.99 one-time Lifetime Pro unlock after expiration. Verified 86/86 automated tests, build-dist static allowlist and Wrangler Pages Functions build.
- Deployed new development code ONLY to the isolated Cloudflare Pages Preview: https://95374aa5.popzbowling.pages.dev (alias https://stripe-lifetime-pro-preview.popzbowling.pages.dev). GET /api/billing/trial returned enabled=false, trialDays=30, Founder cutoff=2026-11-15T18:12:36.000Z. POST trial enrollment returned HTTP 503. GET billing config enabled=false, POST Checkout returned HTTP 503.
- Production https://popzbowling.com remained public-v39.013 with Pro Preview still on. No live payments, subscriptions, trial enrollments or customer bowling-history changes. Only the three explicitly approved permanent Founder entitlement documents were changed in live Firebase.
- Live rollout prerequisites remain: actual payment account and separate production reviews, Google Sync server security-rule gating, offline phone/tablet QA, tax/legal refund/chargeback policy, and owner's explicit commercial launch approval. The client-local anonymous reinstall limitation remains documented.
