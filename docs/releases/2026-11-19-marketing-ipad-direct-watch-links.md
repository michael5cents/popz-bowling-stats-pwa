# Popz Bowling marketing - real direct Watch links for older iPads

Date: November 19, 2026. Affects only the public marketing website at https://popzbowling.com/features/.

## Decisive user evidence
After two attempted site/video fixes, the owner confirmed the 1280x720 MP4 video DOES play on their older iPad when navigating to the video directly. The Watch the commercial buttons on the website still failed in both Chrome and Safari. Therefore the bottleneck is the page's link/JavaScript presentation, not the video resolution. Do not reduce quality or substitute the experimental 480p transcode.

## Small, verified change
- Replace all four JavaScript-only Watch commercial buttons (navigation menu, hero, poster preview, footer) with actual HTML anchor hrefs pointing directly at the proven full-resolution video:
  https://popzbowling.com/features/assets/Popz-Bowling-League-Night-Safari-Compatible.mp4
- In Safari and Chrome on iPad/iPhone and touch-enabled Mac-style iPad UAs, do NOT cancel the anchor click and do NOT call window.location.assign. Let the browser follow the real link and use the exact media player that the owner already verified.
- Desktop browsers that support the dialog continue to open the embedded modal after intentionally preventing the link default. If JavaScript is blocked, missing, or showModal fails, the actual anchor is still usable on all devices.
- Retain original movie, approved imagery/audio and full 1280x720 dimensions. No scaling, no video re-encoding, no bitrate reduction and no HLS substitute. Discarded the uncommitted 480p MP4 and generated HLS test files from this incident.
- CSS preserves the clickability and existing visual design of the poster preview link.
- Update only marketing/professional-site HTML/JS/CSS and marketing tests; leave product PWA build/runtime, payment logic, telemetry and customer data untouched.

## Tests / rollout
- The clean MP4 is H264/AAC 1280x720 and is served with video/mp4, HTTP 200 and 206 range support.
- Unit tests assert four real Watch anchors, preventDefault is not used for iPads, desktop retains modal, and ffprobe confirms 1280x720.
- Isolated browser tests: iPad Safari, iPad Safari with JS disabled, iPad Chrome, iPad desktop-style UA, and desktop Safari with working embedded video.
- Run full Node test suite, Cloudflare Functions compilation, dist-only allowlist and live video link/health checks before calling production done.
- Physical old iPad after deploy is the final confirmation. The owner should refresh https://popzbowling.com/features/ once and click Watch commercial; the site should open the same video previously seen working by direct navigation. If not, the separate direct link is a fallback.
- Preserve the unrelated MacBook local tools/launch-qa-phone.sh worktree edit. Sync release documentation to GitHub/Gitea, Collective, Obsidian and Popz Wiki after verification.
