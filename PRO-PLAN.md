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
- Future premium analysis built from the bowler's own history

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
`PRO_PREVIEW_ENABLED=true` currently unlocks all Pro-designated features without payment. public-v26 makes that status visible in the header and **Settings → Account & Plan**, labels Google Sync and Advanced Shot Tracking as **PRO PREVIEW**, and lets current testers exercise the paid-feature workflow before pricing is chosen.

When paid access is ready, preview can be disabled after the payment/entitlement backend exists. Existing testers can be assigned `founder` or `complimentary` entitlement before enforcement.
