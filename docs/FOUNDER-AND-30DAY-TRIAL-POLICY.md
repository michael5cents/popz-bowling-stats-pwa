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

## One owner-approved fourth Founder exception - November 15, 2026

The owner explicitly approved ONE additional permanent Founder for a customer expected to install Tuesday, November 17, 2026. The original three permanent Founder accounts remain unchanged. General Founder enrollment remains closed: all other new users receive the standard 30-day trial, followed by optional $9.99 Lifetime Pro purchase.

The fourth person is NOT yet registered in the verified three-user Firebase inventory, so no fourth grant can be applied today. Once the customer installs and signs into Popz Bowling with Google, confirm the exact Google account and run a read-only preflight, then the guarded one-off grant:

    node scripts/grant-fourth-founder.mjs --email CUSTOMER@EXAMPLE.COM
    node scripts/grant-fourth-founder.mjs --email CUSTOMER@EXAMPLE.COM --apply --confirm-email CUSTOMER@EXAMPLE.COM

The second command is only for a verified, owner-approved account after inspecting the first result. It requires exactly three existing live Founders, a verified non-disabled Google account, no paid Lifetime Stripe record, no Checkout reservation, and either no entitlement or an existing server-issued installation trial. Any existing trial is atomically replaced using Firestore updateTime to avoid races; existing Founder/paid/complimentary grants are never overwritten. After successful verification, the Mac-only private roster is extended from three to four. The original three are never changed, and no score/history document is touched. No UID or email is recorded in the repository. Do not have this customer buy the $9.99 upgrade before the fourth Founder is granted.

After the grant, independently audit the private Founder roster and confirm four permanent entitlements. This exception is NOT an approval to grant all new users Founder status or a change to the original pre-cutoff three-person migration.

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


## November 15 - Google Sync paid enforcement rule validation (staged only)

The current Firestore Rules only verify owner UID for cloud profile, session and deleted-session operations, allowing signed-in Free accounts to bypass the UI-only Pro feature gate. A new, separate candidate firestore.commercial.rules now checks the same owner's server-controlled entitlements/pro record before Google Sync operations. Permanent Founder/complimentary/lifetime grants always pass; trial/active accounts pass only with a native Firestore expiresAtTimestamp later than request.time; expired, missing and malformed records fail closed. End users cannot change their own entitlements or billing audit, and historical cloud sessions are never deleted merely because a trial expires.

The 30-day trial endpoint now writes the native server-authored Firestore expiry timestamp as well as the existing ISO text expiration for the browser. No extra client-side trust is introduced. Real Firebase Local Emulator verification PASSED 154 authorized/denied operations including 6-session and 400-session batches, all 3 permanent grant classes, trial expiry, anonymous/cross-user rejection, preserved history and private record protection. Normal automated tests additionally assert that firebase.json STILL points to the original production firestore.rules. Test uses demo-popz-bowling-commercial-qa only, separate firebase.commercial.emulator.json, and no live data or identities.

The commercial rules are NOT deployed. Original public version public-v39.013, Pro Preview ON, preview trial/checkout OFF and the previously granted three Founders remain unchanged. A coordinated go-live rollout must include approved live Stripe payment and signed webhook, 30-day trial enrollment, server-side Firestore rules and Live Sharing Preview removal, cross-device/offline validation and rollback, all with explicit user approval. See docs/FIRESTORE-COMMERCIAL-ENFORCEMENT.md.
