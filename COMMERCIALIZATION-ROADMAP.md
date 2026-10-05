# Popz Bowling Commercialization and Platform Roadmap

Last updated: 2026-10-05
Current public client at planning baseline: public-v39.008
Canonical product repo: `~/popz-bowling-stats-pwa`

**Source-of-truth rule:** this repository file is the canonical roadmap. Exact reference mirrors are kept in Collective and Obsidian for Wiki/search visibility; when the roadmap changes, refresh both mirrors from this file in the same change so the schedule cannot drift.

## Executive decision

Popz Bowling will **commercialize the existing PWA first** before investing in native standalone apps.

The sequence is intentionally:

1. Prove the current PWA is reliable, useful, and capable of supporting real paid Popz Bowling Pro customers.
2. Launch and operate a **web/PWA + Stripe** commercial version while keeping the Free tier useful.
3. Require an actual period of stable paid operation before starting native packaging.
4. After the PWA is commercially proven, refactor the app so the bowling core no longer depends on `popzbowling.com` for its executable files.
5. Build standalone Android first, then iPhone/iPad, while the proven PWA remains available.
6. Keep `popzbowling.com` long term for the product site, PWA, support, legal pages, account management, live-score spectator links, and web checkout even after native apps exist.

This replaces the earlier idea of doing the native conversion before payment integration. The purpose is to avoid delaying market validation and to avoid spending several weeks on native packaging before we know whether bowlers will repeatedly use and pay for the product.

## Product principle

The app must remain **offline-first** and the Free tier must remain genuinely useful.

Basic scoring, handicap, leagues/practice, normal Stats, History, ball/lane/oil tracking, league-average rules, local storage, and manual backup/import/share stay Free.

The planned Pro family is:
- Google multi-device Sync
- Advanced Shot Tracking
- Team / Multi-Bowler scoring
- Share Live Scores
- Future advanced line/ball/oil and lane-transition analytics
- Possible future AI Bowling Coach only if private-app testing proves it useful

Existing qualifying beta testers may receive Founder Pro free for life before Pro Preview ends.

## Telemetry dashboard boundary

The private telemetry dashboard is **strictly an owner/admin tool for Michael**.

It is not a bowler-facing feature, not part of Popz Bowling Pro, and not required for users to score or review bowling. Its purpose is to help Michael measure:
- real adoption
- series starts/completions
- returning use and retention
- feature usage
- runtime/startup health
- commercialization readiness

The dashboard remains privately authenticated and separate from the user experience. Anonymous beta telemetry and privacy-safe runtime diagnostics may feed it, but bowlers never need dashboard access.

## Why the PWA comes first

The current app already has the difficult product work:
- reliable scoring and handicap logic
- Quick and Detailed Scoring
- offline IndexedDB storage
- Stats and History
- multi-bowler scoring
- Google Sync
- Share Live Scores
- backups/import
- update recovery
- Pro entitlement foundation
- runtime diagnostics and external Telegram health monitoring
- 34 regression tests at the 2026-10-05 planning baseline

What is not yet proven is the business:
- repeated outside-bowler usage
- retention
- willingness to pay
- real purchase/cancellation/resubscription flows
- support burden
- commercial cloud cost

A paid PWA is the fastest and least disruptive way to learn those things.

## Known PWA dependency risk

The current installed PWA ultimately depends on `popzbowling.com` and its hosting/origin for fresh installation, long-term updates, recovery on new devices, and online services. Cached app files allow offline scoring, but the domain/origin remains an architectural dependency.

That is an accepted **Phase 1 risk**, not the desired final architecture.

Before long-term native commercialization, the bowling core should be packaged locally so Android/iOS can launch and score even if `popzbowling.com`, Cloudflare, or DNS is unavailable.

Online-only features may still depend on backend services:
- Google Sync
- live score sharing
- telemetry/runtime reporting
- Pro entitlement verification
- billing/account services

If those services are unavailable, local bowling must continue and online work must retry later.

## Phase schedule

### Phase 0 — Stabilize and measure the current beta
**Target: October 5–18, 2026**

Goal: freeze major feature expansion and establish a trustworthy baseline after public-v39.008.

Work:
- repair dependable owner access to the telemetry dashboard/operator tooling
- continue runtime and Telegram monitoring
- recruit outside league bowlers deliberately rather than relying on random website traffic
- observe the simplified v39.008 Stats/History experience
- fix only blocking bugs, data-risk defects, or clear usability problems
- keep Pro Preview enabled

Exit gate:
- no unresolved data-loss defect
- no repeat series-blocking production defect
- production health monitoring remains dependable
- clean telemetry can distinguish real installed use from browser/install-page traffic
- enough outside bowlers are actively testing to begin a retention window

### Phase 1 — Structured free PWA beta
**Target: October 19–November 15, 2026**

Goal: prove that outside bowlers repeatedly choose to score real bowling with Popz.

Evidence targets:
- approximately 15–25 outside testers if practical
- at least 50 real completed series / roughly 150 games across the cohort
- multiple users returning across at least 3–4 weeks
- direct feedback on scoring, Stats, History, Sync, and Pro Preview features
- no known data-loss incident

Do not use raw Cloudflare pageviews as adoption evidence. Use clean in-app series/funnel telemetry plus direct tester feedback.

Decision at November 15:
- If bowlers are returning and completing series, proceed to Stripe commercialization work.
- If installs occur but real scoring remains weak, continue usability/onboarding work instead of charging.

### Phase 2 — Build commercial PWA + Stripe
**Target: November 16–December 13, 2026**

Goal: make the existing PWA commercially charge-ready without changing the core bowling experience.

Required work:
- choose initial Pro price and billing cadence
- Stripe hosted Checkout
- trusted server webhook processing
- map successful Stripe subscription/customer state into the existing server-controlled entitlement model
- Upgrade to Pro flow
- Account & Plan view
- Manage Subscription / Stripe customer portal
- cancellation behavior through paid period
- failed-payment/grace-period behavior
- resubscription
- Founder and Complimentary entitlement assignment
- Free vs Pro comparison
- Privacy Policy
- Terms of Service / Terms of Use
- subscription and cancellation language
- refund policy
- cloud-account/data-deletion instructions and working deletion path
- production security-header hardening
- commercial billing/account regression tests

Principle: Popz never stores raw card data. Stripe owns payment-card handling; Popz stores only safe billing references and entitlement state.

Exit gate:
- Free, Trial if used, Active, Founder, Complimentary, Cancelled/Expired, failed-payment/grace, and resubscribe states are tested
- purchase activates Pro server-side
- cancellation never deletes bowling history
- loss of Pro never deletes historical bowling data
- multi-device entitlement behavior works
- legal/account-deletion paths are live
- production rollback path exists

### Phase 3 — Paid PWA proving period
**Target: December 14, 2026–January 31, 2027**

Goal: prove the actual commercial system before native expansion.

Keep the PWA available and stable. Avoid large feature additions during this period.

Use a small real customer cohort plus Founder testers. Measure:
- successful checkout-to-Pro activation
- renewal
- cancellation
- expiration
- resubscription
- support load
- cloud/backend costs
- repeat bowling use
- Pro feature usage
- reliability through normal league nights

Minimum proof gate before native work begins:
- at least 30 consecutive days of stable paid operation
- no unresolved billing/entitlement defect
- no data-loss incident
- purchase/cancel/expire/resubscribe paths verified with real accounts
- recurring outside-bowler use continues after charging begins
- support burden is manageable

A specific revenue threshold is **not required** to begin native work; the important proof is that real users repeatedly use the product and the commercial system works safely. Revenue/conversion data will guide pricing and future investment.

### Phase 4 — Platform-independence refactor
**Earliest start: February 2027, only after Phase 3 passes**

Estimated focused development: **3–5 days**.

Goal: separate the bowling core from the assumption that the app itself is served by `popzbowling.com`.

Work:
- platform/service abstraction for Web vs native
- configurable API base rather than same-origin-only `/api/*` assumptions
- separate PWA service-worker/update code from native app update behavior
- make cloud features optional and failure-tolerant
- preserve one shared scoring/stats/history codebase
- build tests proving the packaged bowling core can launch and complete a series with `popzbowling.com` unreachable

Definition of done:
A packaged build can start offline, score three games, finish the series, show Stats/History, close/reopen, and retain the data while every Popz web/backend endpoint is unreachable.

### Phase 5 — Standalone Android
**Estimated focused development after Phase 4: 4–7 days plus store/signing work**

Preferred approach: Capacitor wrapper around the existing shared web application.

Work:
- bundled local app assets
- Android storage/file/share integration
- safe areas and back-button behavior
- native-compatible Google sign-in
- native update path
- signed APK/AAB
- real testing on Michael's Samsung devices
- Google Play preparation

The commercially proven PWA stays live during Android development and after Android launch.

### Phase 6 — Standalone iPhone/iPad
**Estimated focused development after Android: 4–7 days plus Apple signing/review work**

Work:
- reuse shared application and Capacitor foundation
- Apple authentication/session validation
- native file/share behavior
- iOS safe-area/keyboard testing
- StoreKit billing integration as required for native digital Pro purchases
- TestFlight validation
- App Store submission

The PWA remains available during and after iOS rollout.

### Phase 7 — Desktop standalone apps, optional
**Only if real demand justifies it**

Potential approach: Tauri for Windows/macOS/Linux using the same frontend/core.

Do not build desktop packages merely for completeness. Build them only when customer demand or distribution value is demonstrated.

## Billing architecture across platforms

The Pro entitlement system must remain payment-provider-neutral.

A Popz Pro entitlement may eventually be granted by:
- Stripe web subscription
- Google Play Billing
- Apple StoreKit
- Founder
- Complimentary/admin
- possible future Lifetime purchase

Payment providers prove payment; Popz's server-controlled entitlement record decides whether the account has Pro.

Do not hard-wire the application feature gates directly to Stripe.

## Long-term role of popzbowling.com

Keep the domain even after native apps exist.

Long-term uses:
- public product/marketing site
- PWA version
- Privacy Policy and Terms
- account and subscription management
- web/Stripe purchase path where permitted
- support
- live-score spectator links
- downloads/store links
- release/support documentation

The architectural goal is not to eliminate the domain. It is to ensure a domain/Cloudflare outage cannot stop an already-installed native user from bowling locally.

## Commercial launch timing

The roadmap deliberately separates **PWA commercialization** from **native expansion**.

Working target:
- free beta evidence: through mid-November 2026
- commercial PWA build: mid-November through mid-December 2026
- paid PWA proving period: mid-December 2026 through January 2027
- native platform work: no earlier than February 2027 and only after the paid PWA proof gate passes

The PWA may remain the commercial product indefinitely if users like it and it proves reliable. Native conversion is a resilience/distribution improvement, not a reason to postpone learning whether the business works.

## Change-control rule

Until the paid PWA proof period is complete:
- prioritize reliability, usability, billing safety, and real-user evidence
- avoid large speculative feature additions
- treat telemetry dashboard data as owner-only decision support
- preserve the Free tier
- keep one canonical shared bowling codebase
- document every commercial-policy change in this roadmap and the Pro plan

## Next concrete action

Do **not** begin native conversion yet.

The next product action is to run the structured free PWA beta and collect clean real-bowler usage through November 15 while preparing the commercial requirements. Stripe implementation begins only after the Phase 1 usage gate is reviewed.
