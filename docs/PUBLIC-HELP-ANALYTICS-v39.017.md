# Public Bowling v39.017 — In-App Help Completion

**Release scope:** Help, wording and versioned offline PWA assets only. It follows the verified public-v39.016 analytics launch on November 15, 2026. No payment, Founder, Firebase, scoring, analytics algorithm, or customer-history logic changes.

## Customer-visible Help improvements

- Expanded **Help #4, Record Ball, Lane & Line**: when/how to enable Pro Advanced Shot Tracking; phone Game details & actions; enter lane pair 21-22; set the actual game starting lane before the first roll; independent stand/target per physical lane; Save Setup; lane alternation; new game starts opposite lane; preserved first-ball snapshots; unchanged single-lane option.
- Expanded **Help #9, Use Stats**: select an individual Bowler before drawing personal conclusions; explain Show/collapsed panels and core Free full-game results; identify three premium analytics panels; retain scoring/leave/average-rule directions.
- Added **Help #10, Read Advanced Ball & Line Results — PRO**: how to navigate, filter by actual ball/lane/line, differentiate tracked frames from fully credited complete games, mixed-ball correctness, strikes, first-ball pins, sample confidence and legacy data caveats.
- Added **Help #11, Understand Lane Transition Analysis — PRO**: save change before first ball; compare before/after on same physical lane; strike rate, first-ball pins, ten-pin leaves; Early/Building/Useful/Strong sample stages; recent events; correlation not proof.
- Added **Help #12, Use Bowling Performance Evaluations — PRO**: overall, ball/line, lane transition, leave and recent form results, sample limits, single-bowler selection, fully local offline calculations, explicitly not a paid AI coach.
- Preserved the rest of the guide in order and renumbered older Help cards 10–16 to 13–19. Help has **19 complete printable cards**; same cards accessible from the installed Help tab and Print / Save Guide button.

## Quality and deployment safeguards

- PWA version bumped atomically to **public-v39.017** in app, entry, live module query strings, service worker/cache, manifest, update manifest and version-pinned tests. Installed users must come online and reopen once to receive the new cached Help; no reinstall or clearing app data.
- Isolated **92 Node regression tests** passed, including the new `tests/test_analytics_help.mjs` verifying all 19 Help cards, chapter ordering, correct meaning and paired cache version. The unchanged public billing/Founder/Google Sync checks also passed.
- Chrome Help UI checks passed at **390x844 compact phone** and **820x1180 full tablet**. Every Help card appeared in both, and browser print successfully produced a full PDF for each layout (no blank content). Test code: `tools/test-help-v39-017-browser.mjs`.
- Existing full scoring/Pro/Free fallback QA in `tools/test-advanced-analytics-browser.mjs` is run again with v39.017 before publication. Production Functions build and allowlist build to be verified prior to publishing.
- Launch command remains `wrangler pages deploy dist --project-name popzbowling --branch main ...` after dual repo push; never deploy the root directory.
- Verify `https://popzbowling.com/latest-version.json` reports v39.017 and repeat Help browser QA on the production domain. Stripe checkout amount and 30-day trial config must remain unchanged; unsigned Stripe webhook must remain rejected.

**Status:** Candidate prepared and tested locally. Add verified live publication and source hash after smoke checks. The previous deployed runtime is **public-v39.016**.
