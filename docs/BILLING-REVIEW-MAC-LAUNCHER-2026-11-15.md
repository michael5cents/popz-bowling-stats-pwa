# Popz Bowling LIVE Payment Reviews — Owner Mac Launcher

**Status:** Installed, signed, launched and read-only verified on the owner's MacBook November 15, 2026. This documents an OWNER-ONLY desktop workflow; the public customer PWA remains **public-v39.017**.

## What this application is for

The private payment-exception review inbox records unusual billing events such as refunds, Stripe disputes, duplicate paid sessions, and uncertain Checkout outcomes. Routine paid subscriptions or one-time Lifetime Pro purchases do **not** require manually reviewing every sale; only flagged exceptions need attention. This is a *review ledger*, NOT a Stripe payment/refund console.

## Where to click

1. **Original Mac app:** `~/Desktop/Popz Bowling Payment Reviews.app`
2. **Flyers-folder shortcut:** `~/Desktop/Popz Bowling Public Beta/Popz Bowling Payment Reviews.app`, a Finder-launchable symlink pointing at `../Popz Bowling Payment Reviews.app`.
3. The private **Founder Admin** app is separate and unchanged. Never use it to resolve payment disputes.

## How to review a payment issue safely

1. Double-click **Popz Bowling Payment Reviews**. Its startup check reads **LIVE** open reviews, not sandbox or Preview.
2. Click **Check Open Issues** (or **Show All History**). An empty result means this particular live review inbox has no unresolved records, not necessarily that Stripe itself has no errors.
3. For any flagged review, click **Open Stripe**. Find the matching PaymentIntent/Checkout/refund/dispute and independently verify the actual provider status. Review amounts, duplicate charges, refund state, dispute deadlines, and payment outcome.
4. To acknowledge an issue while investigating it, paste the exact `evt_...` or `checkout_...` review ID, click **Mark Investigating**, and confirm.
5. **Only after the underlying issue is actually verified or fixed:** enter the review ID and a meaningful note describing what you verified, click **Mark Resolved**, and confirm. The note should not contain credit-card details or sensitive customer data.
6. If an actual refund or other Stripe action is needed, **handle it separately in Stripe**, then verify the outcome. The Mac review tool does **not** refund, charge, grant/revoke Lifetime Pro, change bowling scores/history, or release a stalled Checkout reservation. Resolving the alert does not fix a live payment automatically.

See `docs/PRODUCTION-BILLING-REVIEW-RUNBOOK.md` for the full production review security model and `docs/REFUND-DISPUTE-OPERATIONS-DRAFT.md` for historical incident planning. Older planning docs may describe the formerly disabled production endpoint; the release status is updated by live behavior and the current commercial release documentation.

## Implementation and credentials

- Source: `mac-billing-review/main.swift`, `mac-billing-review/Info.plist`, `mac-billing-review/build-mac-app.sh`.
- Backend: the existing reviewed `scripts/billing-review-owner.mjs` is bundled into the signed `.app` resources, but **NEVER** a token. The CLI forces `--production` and reads the owner's protected `~/.config/popz-bowling-billing/review-production-admin-token` on the Mac.
- App is local Cocoa/Swift with buttons for read-only open/all listings and explicit confirmation before owner-only acknowledge/resolve API calls. **Opening the app automatically performs a read-only check; no payment records are changed.**
- The Mac app uses the existing signed Popz Bowling icon artwork. A second desktop/flyers shortcut is only a symlink, not a duplicate installation.
- Rebuild from the canonical Mac source: `bash mac-billing-review/build-mac-app.sh`. The script signs the bundle locally, installs/updates the Desktop app, and refreshes the flyers shortcut. If the original Mac app moves, repair the relative symlink.
- Do not copy live review tokens, Stripe keys, card data, real customer emails, event-specific private IDs, or private audit logs into public Git, Obsidian, Collective, Wiki or screenshots.

## Verification on owner's MacBook

- Confirmed both protected owner token files exist **without reading their contents**; independent authorized calls to the LIVE and sandbox review APIs succeed, each reporting zero open exceptions at the time of the check. The production reviews endpoint returns HTTP 404 without owner authorization.
- The **bundled compiled app** passed `--read-only-smoke-test` with `Popz Bowling LIVE reviews: 0 (scope: open)` / `No reviews in this selection.`.
- `codesign --verify --deep` passed for `~/Desktop/Popz Bowling Payment Reviews.app`.
- Actual Finder shortcut `~/Desktop/Popz Bowling Public Beta/Popz Bowling Payment Reviews.app` resolved to the original app; `open` launched executable `PopzPaymentReviews` (process verified).
- No live review entries were acknowledged, resolved or otherwise mutated as part of testing. The review UI's write actions were not exercised against a real customer.
- No Stripe payments, product prices, Google/Firebase entitlements, public website files or bowling data were changed. Version remains `public-v39.017`.

## Release/documentation sync

Keep this source and runbook on both GitHub and Gitea public repo `main` (without any local credentials), update the Popz Collective, Bowling Obsidian and generated Popz Wiki, and fast-forward the Office `.56` backup checkout. Preserve the previously uncommitted, unrelated MacBook QA launcher `tools/launch-qa-phone.sh`; don't stage it inadvertently.
