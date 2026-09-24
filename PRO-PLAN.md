# Popz Bowling Free + Pro Plan

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
- Current adoption is still very early. On September 22, 2026 the dashboard showed 7 anonymous device profiles and 0 series started/completed. At least one, and possibly two, of those profiles include Michael's own public-app QA checks from his phone/tablet, so raw device count is not outside adoption. public-v30 adds a Bowl -> setup -> start -> first roll -> game complete -> series complete funnel so future decisions can use real activation evidence.

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
`PRO_PREVIEW_ENABLED=true` currently grants access to all Pro-designated features without payment. The header and **Settings -> Account & Plan** show that status and label Google Sync, Advanced Shot Tracking, and Team / Multi-Bowler scoring as **PRO PREVIEW**. Starting in public-v28, Advanced Shot Tracking remains available during preview but is **off by default**; each device must explicitly enable it in Settings before Ball + Stand + Target inputs appear or new frame-level setup snapshots are recorded.

When paid access is ready, preview can be disabled after the payment/entitlement backend exists. Existing testers can be assigned `founder` or `complimentary` entitlement before enforcement.

## Commercial production checklist — saved for review

1. **Define Pro clearly.** Keep the Free app permanently useful; Pro is for Google Sync, Advanced Shot Tracking, Team / Multi-Bowler scoring, future cloud recovery, and deeper bowling analytics.
2. **Choose billing structure.** Decide monthly, annual, and whether Lifetime is sold at all. Architecture already supports any combination.
3. **Founder treatment.** Existing qualifying testers receive **Founder Pro free for life** before Pro Preview ends.
4. **Trial policy.** Decide no trial vs 7/14/30 days. A 14-day trial is the current working recommendation because it spans multiple bowling nights.
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
- Founder enrollment will be capped; the exact maximum is still **TBD**.
- Preferred cutoff logic: choose a telemetry adoption threshold that closes new Founder eligibility once reached, then use the count of unique Founder Firebase UIDs as the authoritative grant count so one person using multiple devices cannot consume multiple Founder slots.
- Anyone already granted `status=founder` keeps lifetime Pro even after the Founder window closes.
