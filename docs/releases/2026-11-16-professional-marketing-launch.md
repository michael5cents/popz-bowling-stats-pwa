# Popz Bowling professional marketing website and launch gateway

Date: 2026-11-16 America/Chicago. Production release: public-v39.018. Status: **PRODUCTION LIVE AND VERIFIED**.

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

## Cloudflare production publication and final checks (November 16, 2026)
- Production deployment ID: `9b6c73fe-d6ca-4a76-9152-23a39cb36efe` (`https://9b6c73fe.popzbowling.pages.dev`); Cloudflare branch `main`; source commit `e9c292d`.
- Cloudflare Pages preview deployment first verified with a complete Functions bundle, then production deployment uploaded the exact verified dist bundle.
- Live root `https://popzbowling.com/`: HTTP 200, `public-v39.018`, verified welcome heading and both Explore the Website + Install Popz Bowling choices; Chrome confirmed `body.install-required` in browser mode with no horizontal overflow.
- Live marketing `https://popzbowling.com/features/`: HTTP 200, real professional title, no draft `noindex` flag, canonical link, stylesheet/JS/photography/MP4 200. Chrome confirmed visual headline and no overflow. Local dist browser QA confirmed all 10 images and video preview dialog playback.
- Live `/latest-version.json`: `public-v39.018`. `/api/health`: HTTP 200, `ok:true`, `status:ok`, `version:public-v39.018`.
- Live PWA service worker and bootstrap/app JavaScript at new version: HTTP 200; manifest `start_url` and `scope` remain `./`.
- Live Stripe payment success and cancel pages: HTTP 200. There were **no new test charges**, no changes to live subscription/entitlement operations, and no modifications to D1/Firebase/Stripe.
- SEO `/robots.txt`, `/sitemap.xml` both HTTP 200 and list the new marketing route.
- **The existing flyer remains valid and unchanged.** No redesign is needed to reach the new landing experience.
- A pre-existing dirty `tools/launch-qa-phone.sh` remains unmodified and outside the release.

## APPROVED COMMERCIAL REPLACEMENT — November 16, 2026
The website first published with an obsolete 2:29 demonstration. The owner rejected that and directed its immediate removal. Replaced it with the exact approved official 52.88-second league-night commercial (original ClaviCrazy music, Ryan narration) from `Social-Launch-2026-11-16/Popz-Bowling-League-Night-Official-Commercial.mp4`, SHA-256 `7694dbc41dc17d25be73b569e79625c1b3d9567b4c3bed8a6e0f7b804fcc4f40`.
- Website bundle now includes `features/assets/Popz-Bowling-League-Night-Official-Commercial.mp4` and a new frame-extracted `features/assets/Popz-Bowling-League-Night-Poster.jpg`.
- The old `Popz-Bowling-Demo.mp4` and `YouTube-Pro-Focused-Thumbnail.png` are no longer in the website source or Cloudflare deploy allowlist; original copies were archived at `/Volumes/Popz Projects/Backups/Public Bowling/Marketing/Website-Launch-2026-11-16/Video-Commercial-Repair/` for disaster recovery only.
- Updated marketing CTA, video description, duration (0:53), thumbnail, accessible labels, modal player, video source and JS playback fallback.
- Existing flyer, scoring app, PWA service worker, app version, Stripe/Firebase, and payment/Pro access are untouched.
- Rebuilt exact `dist/` allowlist and ran 93/93 passing Node tests, including absence of obsolete video/thumbnail from dist.
