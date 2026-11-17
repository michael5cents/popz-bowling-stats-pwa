# Popz Bowling professional marketing website and launch gateway

Date: 2026-11-16 America/Chicago. Production release: public-v39.018. Status: **prepared for Cloudflare deployment** (see later verification entry).

## Owner-approved direction
- Publish the owner's previously approved **Professional-Website-Redesign** concept as the real site, not a generic feature sheet.
- Send visitors who arrive at https://popzbowling.com to the existing browser install gate with clear choices **Explore the Website** or **Install Popz Bowling**.
- Show the complete marketing website at https://popzbowling.com/features/ with bowling-photo hero, real app screenshots, Free and Pro walkthroughs, 30-day Pro trial, $9.99 Lifetime Pro, demo video, and links back to the existing PWA install route.
- **Do not revise the existing flyer:** its URL and QR already resolve to https://popzbowling.com.

## Source and deployment
- Cloudflare Pages project: `popzbowling`; repo: `/Users/michaelnichols/popz-bowling-stats-pwa` on macbookpro.
- Source: `marketing/professional-site/{index.html,styles.css,script.js,assets/*}`, copied from `Desktop/Popz Bowling Public Beta/YouTube Demo Draft/Professional-Website-Redesign/`.
- Static output remains exclusively the allowlisted `dist/` bundle from `scripts/build-dist.sh`. New files are precisely enumerated under `dist/features/` plus `robots.txt` and `sitemap.xml`. No repo root, secrets, admin operators, or tests are published.
- PWA start/scope and DB keys unchanged; app engine/scoring/entitlements/payment code unchanged except literal release-version synchronization to v39.018. Existing cloud-backed and local data are not migrated/reset.
- Root `index.html` install gate provides two choices only for visitors **not running in installed standalone mode**. App icon launches still go directly to their scoring app.
- Existing optional Stripe Lifetime Pro $9.99 and 30-day trial unchanged.
- SEO: canonical `/features/`, absolute Open Graph image, public sitemap, no preview-only noindex label. The marketing page is not placed in offline precache; service worker still restricts fallback to root and `/index.html`.

## Validation before deployment
- 59 Node test files, **93/93 passing** (scoring, history, persistence/backup, advanced analytics, founder/entitlement/billing tests, service worker and new marketing gate/allowlist).
- Static bundle `dist/` built through allowlist and validated with `test_dist_allowlist.mjs`.
- Browser test of exact `dist/features/index.html`: 10/10 images load; no horizontal page overflow at desktop width; correct buttons resolve to `https://popzbowling.com/`; video dialog opens and video reaches readyState 4 (no error), closes correctly.
- Baseline live production before deployment: v39.017; `/api/health` ok, `/payment/cancel/` reachable; `/features/` and `/robots.txt` previously fell back to the scoring shell.
- Backup created at `/Volumes/Popz Projects/Backups/Public Bowling/Marketing/Website-Launch-2026-11-16/`, including original source snapshots and release manifest.
- A preexisting uncommitted change to `tools/launch-qa-phone.sh` was deliberately excluded from this release.

## Rollback
Cloudflare previous Production Pages deployment ID: `339feab7-2488-4489-af35-2d7cc1417dcd`, source commit `71872f5` and deployment `https://339feab7.popzbowling.pages.dev`. Do not roll back Stripe/D1 or Firebase; rollback is site bundle only.
