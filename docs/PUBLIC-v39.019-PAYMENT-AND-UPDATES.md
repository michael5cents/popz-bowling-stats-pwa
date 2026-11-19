# Public Bowling v39.019 — verified payment metrics and safe updates
Prepared 2026-11-19 after checking matching GitHub/Gitea main commits, Collective, Obsidian and generated Wiki.
Private dashboard now reports unique paid lifetime accounts, successful transactions, gross paid, refunds, gross-minus-refunds and disputes from verified live Stripe payment intents, excluding free/trial/Founder/test traffic and unrelated products. Read-only; if history or Stripe cannot be fully verified, status reads unavailable rather than fabricated zero.
iOS update: relative imported modules are pinned to 39.019 consistently, preventing an older SW cache from providing an obsolete unversioned scoring module to newer app.js.
Stale worker update notices no longer trump the current manifest; the Help page and notice distinguish Popz app updates from Chrome/browser or iOS system updates. Preserve customer IndexedDB, scoring data, Stripe, Firebase entitlements and configured price.
Original unrelated tools/launch-qa-phone.sh worktree change is excluded.
