# Popz Bowling - private macOS Founder Admin

Installed on the owner's MacBook Desktop as **Popz Bowling Founder Admin.app**. It is a locally compiled, ad-hoc-signed macOS Cocoa app with the existing Popz Bowling artwork. It is NOT part of the public site, Cloudflare Functions or customer downloads.

## Owner workflow

1. Ask the person to install Popz Bowling Stats and sign in with their own verified Google account. The 30-day Pro trial is free. Do not ask them to buy the one-time $9.99 license first.
2. Open `~/Desktop/Popz Bowling Founder Admin.app` by double-clicking.
3. Enter the exact Google email, then click **1. Check Google account**. Only the matching Firebase Auth account is eligible. A disabled or non-Google/unverified account is rejected. The app displays existing Founder/Pro status and a specific reason when a grant is blocked.
4. For an eligible account, click **2. Grant Lifetime Founder**, review the exact email in the confirmation dialog, and click **Grant Lifetime Founder** again. Only this deliberate action writes a permanent Founder Pro entitlement. The app verifies it before reporting success.
5. The recipient opens the installed app online and signs in with that SAME Google account. It recognizes permanent Pro across supported devices; there is no charge or subscription and bowling history remains intact.

The owner may manually grant any number of additional approved Founders. General Founder registration stays closed and all other new users follow the 30-day trial -> optional $9.99 Lifetime Pro path. The first three Founder accounts remain unchanged. The older fourth-Founder script is historical; this Mac application is the reusable way to approve future manual grants.

## Security

- No web-exposed Founder admin route is created. The app runs on this authorized Mac user account and uses `gcloud auth print-access-token` for the Google Cloud owner session, never a copy of the production Firebase service-account private key.
- The email is an exact match against Firebase Authentication's inventory. The account must be verified, enabled, and linked to Google.
- A paid Stripe Lifetime purchase record, ANY Checkout reservation, an existing permanent Pro grant, or an unrecognized entitlement blocks grant. No paid refunds, payment captures or owner-entered Firebase UIDs are permitted.
- For an eligible new/Free/trial account, the Firestore transaction atomically verifies both Stripe billing records remain absent and uses an `exists:false` or exact `updateTime` entitlement precondition. Concurrent checkout or plan changes fail closed. Only `users/{uid}/entitlements/pro` may be written. The app never deletes or edits history, leagues, sessions or users.
- Each successful local grant is appended to a private mode-600 `~/.config/popz-bowling/founder-admin-audit.jsonl` on the owner's Mac. This file and OAuth credentials are NEVER included in git or the public app. Account UIDs/emails are not printed in deployment logs.
- Built Mac app includes just the executable, icon, Info.plist and two scoped JavaScript modules; no private keys or bearer tokens are bundled. Ad hoc local code-signing was verified after installation.

## Source and rebuild

Sources: `mac-founder-admin/main.swift`, `mac-founder-admin/Info.plist`, `mac-founder-admin/build-mac-app.sh`, `scripts/founder-admin.mjs`, `scripts/founder-admin-core.mjs`. Build on the Mac from the project repository with `bash mac-founder-admin/build-mac-app.sh`. It installs/replaces the Desktop app using an atomic rename; the source stays in the repository and is testable under `tests/test_founder_admin.mjs`.

Tested on the actual Mac: Swift GUI compiled, app bundle created, local signature verified, GUI process launched, and bundled CLI successfully performed a read-only lookup of a nonexistent Google account, returning 'not registered' with zero writes. Live Firebase Founder mutation has NOT been tested on a real customer's account. It will be independently verified when the first approved recipient signs in.

Additional packaged-app live read-only test: an already-approved original Founder Google account returned `verifiedGoogle=true`, `accountStatus=founder`, `eligible=false`, `alreadyFounder=true`. No repeated grant or data write was permitted. The Mac GUI executable remains running successfully from the Desktop app bundle.
