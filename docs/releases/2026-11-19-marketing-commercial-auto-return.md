# Popz Bowling marketing commercial - return to website after playback
Date: 2026-11-19. Marketing-only change at https://popzbowling.com/features/. The owner verified the full 1280x720 MP4 now works when opened directly on their older iPad and requested that the site return automatically once the commercial finishes, so browsing can continue.

## Technical boundary
A direct raw MP4 URL is played by Safari's own media document, which does not expose a usable HTMLMediaElement ended event to our website. Waiting for a timer would be wrong because users can pause or seek. The site must own a normal HTML page containing its own full-resolution video element to receive real playback events and return after completion.

## Implemented
- All four public Watch links now point directly to the canonical /features/watch path (the Cloudflare clean URL for watch.html), a simple standalone dark video viewing page without the old backdrop blur, transforms or dialog. It references the same proven 1280x720 H.264/AAC MP4. No bitrate/resolution reduction, re-encoding or replacement of the movie.
- Video player contains native controls, a visible Play commercial button, a prominent Back to Popz Bowling website link, and a direct full-resolution MP4 link as fallback if an older iPad displays a dark/black image in the embedded player.
- When the video's real ended event fires, watch.js returns to /features/#demo. An older Safari webkitendfullscreen event can also return to the site if the playhead is within 0.35s of the movie's actual end, but not when the viewer exits fullscreen early. The redirect is idempotent.
- Desktop browsers retain the marketing modal; when that modal's video finishes, it now closes automatically, revealing the website. If JavaScript or showModal is unavailable, literal Watch hyperlinks still work.
- Added watch.html/watch.css/watch.js to the exact dist allowlist. Added no-store/noindex headers for the dedicated viewing page and canonical clean URL. No changes to customer scoring app, PWA SW or version, Stripe, database, telemetry or public adoption data.
- The playback page may require an extra tap to start the movie because iPad Safari prevents audible autoplay without a user gesture. The fallback Back to website action remains available even if the older device doesn't deliver the ended event.

## QA
- Browser integration exercises iPad Safari, Chrome on iPad, touch-enabled desktop user-agent iPad, desktop modal, and JavaScript-disabled iPad Safari. Loads actual 1280x720 MP4 and checks auto return on completion, with real playback seek-to-end for one scenario.
- Unit test tests ended/webkitendfullscreen behavior, early fullscreen exit, no duplicate redirects, four literal link hrefs, native playback and direct MP4 fallback.
- Before release: pass full Node suite, Cloudflare Pages Functions compile, strict dist allowlist, deploy marketing-only, verify live Watch page, movie dimensions/200/206 response, automatic return and production app /api/health.
- This has NOT been verified on the actual owner's iPad yet. If native fullscreen behaves differently, fallback Back to website remains and direct MP4 route still works.
- Preserve unrelated MacBook uncommitted tools/launch-qa-phone.sh change and keep the marketing source under GitHub/Gitea, Obsidian/Collective/Wiki documentation.
