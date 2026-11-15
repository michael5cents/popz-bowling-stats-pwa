# Popz Bowling Free + Pro Plan

## November 14, 2026 — new commercial policy (supersedes October pricing discussion)
The proposed product is **free installation plus $9.99 one-time Lifetime Pro**, with no recurring subscription. Existing qualifying Founder Pro remains free for life; the newly approved trial is 30 days for new installs. A server-verified Stripe integration has been staged in branch feature/stripe-lifetime-pro, **deployed to an isolated Cloudflare preview, not production**, and production purchases remain disabled until Stripe/Firebase credentials, refund/tax/legal policies and live tests are complete. Pro Preview is still enabled. The earlier monthly/annual subscription checklist is retained below for historical reference, not the current product decision. See docs/STRIPE-LIFETIME-PILOT.md and docs/STRIPE-LAUNCH-SAFEGUARDS.md.


## November 14 — durable Stripe Checkout reservation
Development-only Stripe Checkout now claims one Firestore reservation before session creation; multiple tabs, devices and cross-day retries reuse the same idempotency key and session. Expiration must be verified with Stripe before renewal, and unknown outcomes fail closed. No production billing or Pro access enforcement enabled. See docs/STRIPE-LAUNCH-SAFEGUARDS.md.

## Commercialization sequencing decision — 2026-10-05
The approved strategy is **PWA-first commercialization**. Prove the existing `popzbowling.com` PWA with Stripe, real customers, and a stable paid operating period before starting Android/iOS standalone conversion. Native packaging is a later resilience/distribution phase, not a prerequisite to testing the business. The paid PWA remains available while native apps are developed and may remain a permanent product surface.

The canonical schedule, decision gates, Cloudflare/domain-risk plan, native-conversion sequence, telemetry-dashboard boundary, and platform-neutral billing architecture are documented in `COMMERCIALIZATION-ROADMAP.md`.

## Product decision
Popz Bowling remains **free to install/use**. A single optional **Popz Bowling Pro** tier unlocks advanced features. Price and billing cadence are intentionally undecided.

## Free feature baseline
Free remains a useful bowling app, not a crippled demo:
- Complete game/series scoring and handicap calculation
- League and Practice tracking
- Overall and league statistics
- History and frame review
- Ball, center, lane, and oil-pattern tracking
- Existing Performance Breakdowns and leave/spare statistics
- Per-league average rules
- Offline local storage
- Export / Import / Share Backup

## Pro feature family
Current/future Pro features:
- **Share Live Scores** — implemented in public-v34. Opt-in, read-only live-session links for one selected bowler's current series. It is not a Stats/History/past-score sharing feature and is separate from Share / Transfer Backup (which remains Free). See `LIVE-SHARING.md`.
- Google multi-device sync — implemented
- Advanced Shot Tracking: ball + stand board + target board — implemented in public-v26
- Automatic cloud backup/restore — future
- Line-change and lane-transition analytics — future
- Advanced line/ball/oil analytics — future
- **AI Bowling Coach / Analyze My Bowling** — research candidate and possible future Pro incentive. The app should compute the statistics first, then give an AI a compact evidence packet to produce post-series observations, confidence-aware interpretations, and suggested experiments. Validate usefulness and model requirements in the private Bowling app before any public rollout.
- **Multi-player league/session scoring** — implemented in public-v31 as a Pro feature. One device scores 2–12 bowlers in bowling order while keeping each bowler's averages, handicap, History, Stats, backup data, and cloud records separate. The implementation uses linked per-bowler series under a shared group-session ID so single-player data and the existing scoring engine remain compatible.
- Future premium analysis built from the bowler's own history

## Public usability research
- **Quick Scoring is implemented in public-v29 and is the default.** It records roll pinfall without asking users to identify the exact standing pins after each first ball. A one-tap **Mark Split** flag is available after a non-strike first ball, and the frame editor can correct that flag later; flagged Quick-mode splits count toward overall Split Conversion %. The existing pin-deck workflow remains available as **Detailed Scoring** for bowlers who want the exact leave pattern, single-pin/10-pin detail, and per-leave conversion analytics. Scoring mode is a device-local usability preference.
- **Historical adoption note:** on September 22, 2026 the pre-cleanup dashboard showed 7 anonymous profiles and 0 series started/completed, with known owner-QA contamination. That count is not a current adoption baseline. Production adoption telemetry was deliberately reset on October 2; at the 2026-10-05 documentation audit the clean D1 still showed **0 profiles / 0 events**. Use the post-reset activation funnel—not Cloudflare pageview totals—to judge real app adoption.

## Entitlement architecture
Firestore path: `/users/{uid}/entitlements/pro`

Schema:
- `plan`: `free` or `pro`
- `status`: `active`, `trial`, `expired`, `lifetime`, `complimentary`, or `founder`
- `source`: future billing/admin source such as `stripe`, `google_play`, `apple`, `admin`, or `founder`
- `expiresAt`: optional expiration timestamp
- `updatedAt`: entitlement update timestamp

Client apps may **read** their own entitlement but may never write it. Firestore rules reserve entitlement and billing paths for a trusted future billing/admin backend.

## Preview period
`PRO_PREVIEW_ENABLED=true` currently grants access to all Pro-designated features without payment. The header and **Settings -> Account & Plan** show that status. The current Pro family includes **Google Sync, Advanced Shot Tracking, Team / Multi-Bowler scoring, and Share Live Scores**. Advanced Shot Tracking remains **off by default**; each device must explicitly enable it in Settings before Ball + Stand + Target inputs appear or new frame-level setup snapshots are recorded.

When paid access is ready, preview can be disabled after the payment/entitlement backend exists. Existing testers can be assigned `founder` or `complimentary` entitlement before enforcement.

## Commercial production checklist — saved for review

1. **Define Pro clearly.** Keep the Free app permanently useful; the current Pro family is Google Sync, Advanced Shot Tracking, Team / Multi-Bowler scoring, and Share Live Scores, with future cloud recovery and deeper bowling analytics as possible additions.
2. **Choose billing structure.** Decide monthly, annual, and whether Lifetime is sold at all. Architecture already supports any combination.
3. **Founder treatment.** Existing qualifying testers receive **Founder Pro free for life** before Pro Preview ends.
4. **Trial policy.** DECIDED November 15: 30-day Pro trial for new installs. **Superseded November 15:** the owner approved a 30-day full-Pro trial beginning at the first installed-app launch; Free features remain available afterwards and $9.99 one-time Lifetime Pro can be purchased.
5. **Purchase flow.** Build Upgrade to Pro → hosted checkout → verified payment → server-side entitlement activation → app immediately shows Pro.
6. **Keep card data out of Popz.** Use a payment provider for card/payment details; Popz stores only customer/billing references and entitlement state.
7. **Tie Pro to the signed-in account.** A purchase belongs to the Firebase/Google user, not a phone/tablet, so Pro follows the user across devices.
8. **Cancellation behavior.** Cancellation stops renewal but keeps Pro active through the already-paid period; bowling history is never removed just because billing stops.

9. **Cloud-data retention after Pro ends.** Start with keeping synced bowling history indefinitely; revisit retention only if scale/cost makes it necessary.
10. **Free-user Pro UX.** Keep Pro features visible but locked, with clear Upgrade to Pro messaging instead of hiding them.
11. **Free vs Pro comparison.** Add a simple comparison view showing what stays Free and what Pro unlocks.
12. **Subscription management.** Add plan status, renewal/expiration details, and a Manage Subscription link to the payment provider's customer portal.
13. **Failed-payment handling.** Use retries/grace period before entitlement expires; then fall back to Free without deleting bowling history.
14. **Entitlement model.** Keep server-controlled `free`, `active`, `trial`, `expired`, `lifetime`, `complimentary`, and `founder` states independent from payment-provider details.
15. **Commercial/legal basics.** Add Privacy Policy, Terms, subscription/cancellation wording, refund policy, and account/data-deletion instructions before charging users.
16. **Final production testing.** Test Free, Trial, Monthly/Annual Pro, Founder, Complimentary, Expired/Cancelled, multi-device sign-in, offline bowling, resubscribe, and historical-data visibility before disabling Pro Preview.

### Founder Pro policy
- **Decision:** Founder Pro is free for life.
- Founder enrollment is closed at **3**, the three verified Google/Firebase accounts existing by November 15, 2026 12:12:36 PM CST (18:12:36 UTC).
- Preferred cutoff logic: choose a telemetry adoption threshold that closes new Founder eligibility once reached, then use the count of unique Founder Firebase UIDs as the authoritative grant count so one person using multiple devices cannot consume multiple Founder slots.
- Anyone already granted `status=founder` keeps lifetime Pro even after the Founder window closes.

## November 15 — owner billing incident review (sandbox only)
The Stripe development branch now includes a separate Cloudflare preview D1 incident inbox, a Telegram delivery monitor using the existing PopzVPS health-alert bot, and an authenticated owner-only review CLI. Sandbox events remain recorded until acknowledged or resolved; neither path can refund money or change Pro entitlements. See docs/STRIPE-BILLING-REVIEW-RUNBOOK.md. Production checkout remains disabled, and live-specific infrastructure and owner approvals are still required.

## November 15 - Full sandbox commercial E2E verified
The isolated Stripe Preview passed a genuine $9.99 test purchase with a Firestore atomic Checkout reservation, signed webhook Lifetime Pro activation, second-charge prevention, a full Stripe sandbox refund, verified Firestore/D1 risk records and real Telegram alerts, followed by operator review and full disposable Firebase cleanup. Preview checkout and QA fulfillment are OFF, production is unchanged at public-v39.013. This is not production release approval: Founder migration, tax/legal/terms/refund policies, separate production alerts, live restricted Stripe keys and a final rollout decision remain.

## November 15 - Founder cap three, 30-day trial approved
The owner explicitly selected exactly three existing verified Google accounts to receive free Lifetime Founder Pro. All three were committed atomically to Firestore with source=founder/status=founder and independently verified. Founder enrollment was closed at the exact cutoff 2026-11-15T18:12:36Z. Every later new install is to receive 30 x 24 hours of Pro features, then Free scoring/history continue; an optional explicit $9.99 one-time Lifetime Pro unlock restores paid features permanently. No automatic charge, no subscriptions. Account-bound trial creation is server-only and create-only, while anonymous installations maintain a local first-launch trial clock. Trial implementation is staged on the Stripe development branch, but production Pro Preview and real paid Checkout are unchanged until release safeguards are complete. See docs/FOUNDER-AND-30DAY-TRIAL-POLICY.md.


## November 15 - Google Sync paid enforcement rule validation (staged only)

The current Firestore Rules only verify owner UID for cloud profile, session and deleted-session operations, allowing signed-in Free accounts to bypass the UI-only Pro feature gate. A new, separate candidate firestore.commercial.rules now checks the same owner's server-controlled entitlements/pro record before Google Sync operations. Permanent Founder/complimentary/lifetime grants always pass; trial/active accounts pass only with a native Firestore expiresAtTimestamp later than request.time; expired, missing and malformed records fail closed. End users cannot change their own entitlements or billing audit, and historical cloud sessions are never deleted merely because a trial expires.

The 30-day trial endpoint now writes the native server-authored Firestore expiry timestamp as well as the existing ISO text expiration for the browser. No extra client-side trust is introduced. Real Firebase Local Emulator verification PASSED 154 authorized/denied operations including 6-session and 400-session batches, all 3 permanent grant classes, trial expiry, anonymous/cross-user rejection, preserved history and private record protection. Normal automated tests additionally assert that firebase.json STILL points to the original production firestore.rules. Test uses demo-popz-bowling-commercial-qa only, separate firebase.commercial.emulator.json, and no live data or identities.

The commercial rules are NOT deployed. Original public version public-v39.013, Pro Preview ON, preview trial/checkout OFF and the previously granted three Founders remain unchanged. A coordinated go-live rollout must include approved live Stripe payment and signed webhook, 30-day trial enrollment, server-side Firestore rules and Live Sharing Preview removal, cross-device/offline validation and rollback, all with explicit user approval. See docs/FIRESTORE-COMMERCIAL-ENFORCEMENT.md.
