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
- Google multi-device sync
- Automatic cloud backup/restore
- Advanced Shot Tracking: ball + stand board + target board
- Line-change and lane-transition history
- Advanced line/ball/oil analytics
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
`PRO_PREVIEW_ENABLED=true` currently unlocks all Pro-designated features without payment. This lets current testers keep Google Sync and lets us measure adoption before choosing a price.

When paid access is ready, preview can be disabled after the payment/entitlement backend exists. Existing testers can be assigned `founder` or `complimentary` entitlement before enforcement.
