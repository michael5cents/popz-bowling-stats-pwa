# Public Popz Bowling marketing commercial - iPad Safari playback repair
Date: 2026-11-19. Affects marketing website only: https://popzbowling.com/features/. Does not modify scoring PWA or its service worker, customer data, user entitlements, telemetry or Stripe checkout.

## User report and investigation
The commercial audio played in Safari on the owner's iPad but no video appeared, only a dark/dimmed backdrop. The current page used an HTML dialog with backdrop-filter blur and autoplay on video.play(). The original MP4 was 1280x720, 24fps, H.264 Constrained Baseline level 3.1 with AAC LC, plus an extra bin_data/text track; this is broadly compatible video coding but contains nonessential QuickTime/text metadata. Chrome desktop had previously played correctly. Apple's Safari guide recommends H.264/AAC MP4 for static video, and WebKit has documented cases of blank/black video surfaces with separate audio playback. This report does not prove which iPad WebKit rendering or container issue triggered the failure.

## Fix
- Source commercial retained at marketing/professional-site/assets/Popz-Bowling-League-Night-Official-Commercial.mp4, original SHA-256 7694dbc41dc17d25be73b569e79625c1b3d9567b4c3bed8a6e0f7b804fcc4f40.
- Losslessly remuxed (no re-encoding) to Popz-Bowling-League-Night-Safari-Compatible.mp4, video H.264 and audio AAC only, no text/data/QuickTime chapter track, metadata and chapters dropped, faststart moov before mdat. Duration 52.875s, 1280x720. SHA-256 91f9a34db4af747d855095a6eb98ddba5b87b183535d34011d3f92fd07c96d96. ffmpeg decoded video successfully without errors.
- Marketing Watch buttons on iPhone/iPad and touch-enabled Apple desktop-style UA now navigate directly to this MP4, delegating presentation to the browser's native video player; this avoids the blurred dialog/backdrop composition entirely. Use browser Back to return to marketing site.
- Desktop and non-Apple browsers retain the current dialog experience, now using the cleaned MP4. A plain direct-video fallback link inside that dialog remains available if any desktop browser renders a blank surface.
- Updated only marketing/professional-site HTML/JS/CSS and the corresponding dist media filename allowlist; no changes to application runtime modules, PWA version, data or checkout.
- Old commercial remains in canonical source as historical owner asset but is no longer referenced in the deployed HTML, JS or dist allowlist. The approved footage and original music/narration are unchanged.

## Validation and rollout
- Node unit test inspects MP4 container and H264/AAC streams; tests native Apple touch route vs desktop dialog, fallback source and media existence.
- Browser integration via isolated Chromium with iPad Safari, iPad Chrome, desktop-style iPad Safari (maxTouchPoints>1), and desktop Safari UAs verified the route chooses native media on iPad and the modal with valid 1280x720 video on desktop. Physical Safari iPad still requires owner's verification.
- Run full Node suite, Cloudflare Pages Functions build and strict dist allowlist tests before commit/deploy; verify production /features/ HTML, asset 200/206 byte range, correct video/mp4 Content-Type, file length, health and live media playback after atomic main branch Pages deploy.
- Preserve unrelated MacBook tools/launch-qa-phone.sh worktree changes. Keep customer HTML, app SW and telemetry unchanged.
