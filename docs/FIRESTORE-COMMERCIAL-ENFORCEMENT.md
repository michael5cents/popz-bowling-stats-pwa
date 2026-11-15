# Commercial Google Sync Enforcement - Staged Firestore Rules

**Status: STAGED AND EMULATOR-TESTED; NOT DEPLOYED TO FIREBASE.**

## Problem and scope

In the current public PWA (public-v39.013), the checked-in Firestore Rules permit any authenticated account to read and write its own cloud bowling profile, sessions and deleted-session tombstones. The front-end Pro Preview flag and Pro UI checks are not a server authorization boundary. Until live $9.99 purchases are available, leave these existing production rules exactly as they are.

The alternative ruleset, firestore.commercial.rules, is a release candidate to enforce the paid Google Sync entitlement at the Firestore data boundary. It lives alongside (NOT in place of) firestore.rules. firebase.json still references the original firestore.rules. The separately named firebase.commercial.emulator.json exists solely for local rules testing against a demo Firebase project, NOT any connected production data.

## Access model

- Account identity: Firebase Auth UID must equal the requested users/{uid}.
- Read/write of a user's cloud profile, sessions, and deletedSessions requires an owner-matching UID AND an independently fetched, server-owned users/{uid}/entitlements/pro record.
- A permanent entitlement has plan=pro and status=founder, complimentary or lifetime. These never expire. The owner-approved three Founder accounts qualify automatically without changing their existing documents.
- A time-limited entitlement has plan=pro, status=trial or active, and a **native Firestore timestamp** expiresAtTimestamp strictly later than request.time. Both the timestamp's type and expiry are checked; missing, textual-only, invalid or past timestamps fail closed.
- For newly granted 30-day trials the trusted Cloudflare server writes BOTH expiresAt (ISO text for browser UI) and expiresAtTimestamp (Firestore timestampValue for Rules) with a Firestore exists:false compare-and-set. The customer cannot edit either field.
- Account owners may always read their own entitlement and billing audit records to understand their access or a payment problem, even after their trial expires. They cannot write/modify/delete entitlement or billing records.
- Different users, signed-out visitors, missing entitlement holders, inactive subscriptions and expired trials cannot directly download, update, or delete another user's or their own cloud bowling data through Firestore Client SDK.
- Expiration changes **permissions only**. No Firestore scoring, histories, or deletions are performed by this ruleset. Free local bowling scoring/history and local/manual backup remain available. An expired account's historical cloud records are held for restoration when Lifetime Pro is purchased, but direct cloud retrieval on a new device is blocked until the grant is active. A separate owner-data export option may be designed later if required.
- Firestore server API / Admin SDK integrations bypass Firestore Security Rules and MUST keep least-privilege service credentials and authenticate every caller; client SDK access still follows these rules.

## Verified technical tests - November 15, 2026

Executed the **real Firebase Local Firestore Emulator**, not just text-pattern or mock checks. The isolated demo project was demo-popz-bowling-commercial-qa, localhost 127.0.0.1:9195. It used the Mac's existing Homebrew OpenJDK 26 and a temporary npm cache under ~/.cache/popz-firestore-rules-qa containing firebase-tools 15.36.0, firebase 12.19.0 and @firebase/rules-unit-testing 5.0.0. These dev dependencies were NOT installed in the website repository or published.

Result: **153 allow/deny emulator assertions passed**, covering:
- permanent Founder, complimentary, and paid Lifetime Pro owner access;
- active trial and active bounded paid Pro access;
- expired trial/active, missing entitlement, free status, malformed expiry types, and missing expiry all denied cloud access;
- unauthenticated and other-account access denied;
- direct client escalation to Founder, trial extension, and changes to billing audit records denied;
- ordinary profile, session, tombstone operations and a six-session write batch still work for authorized accounts;
- an expired user's older bowling history remains stored and readable by an isolated admin-only test fixture, not deleted by entitlement expiry.

Firebase denied-operation messages in the test log are expected because a negative access test must produce PERMISSION_DENIED. The final emulator exited successfully.

Repeat test from MacBook Stripe development worktree (requires cached dependencies and JDK):

    cd ~/popz-bowling-stripe-pro
    sh scripts/test-commercial-firestore-rules.sh

Files: emulator-tests/test-commercial-rules.mjs; firestore.commercial.rules; firebase.commercial.emulator.json. Normal static safety test: tests/test_firestore_commercial_staging.mjs checks that production firebase.json still selects the old rules, commercial test config uses localhost+demo project, no production deploy is referenced and trial writes use server-owned native timestamps.

## Release gate - DO NOT SKIP

1. Keep firestore.rules and firebase.json currently deployed with Pro Preview enabled. Only merge the commercial candidate after the owner explicitly approves a synchronized, paid launch.
2. Re-run all Node tests and the real emulator tests. Verify three live Founder grants and original bowling history are intact, and produce a recoverable copy of the current production rules and scoring database backups.
3. Configure the live merchant payment connection with least-privilege server access. Finalize tax, privacy, terms and refund policies. Independently provision production billing-review alerts and verify signed webhooks before live launch.
4. Finish/verify the Google Sync, install PWA, offline and multiple-device regressions on a staged new release (no change to tablet UX or personal bowling prototype).
5. At commercial cutover only: new application version with PRO_PREVIEW_ENABLED=false, completed Stripe $9.99 real Checkout, BILLING_TRIAL_ENABLED=true (or appropriate independently verified production flag), LIVE_SHARE_PREVIEW=false, and the approved commercial Firestore rules become effective together. Avoid a period when customers lose paid features but have no way to purchase.
6. Deploy the reviewed Firebase rules to the exact, verified popz-bowling-stats project only after explicit approval. Ensure the candidate rules replace the original production rules intentionally; never deploy using the test config or demo project.
7. Observe Firebase permission_denied telemetry, Stripe webhook and new-activated trial/Founder outcomes. Be able to roll back the original production rules and app release immediately without deleting or overwriting histories.

Current production version and customer data remain unchanged by this work. The 30-day trial endpoint is explicitly disabled in Cloudflare Preview, and production checkout remains disabled.
