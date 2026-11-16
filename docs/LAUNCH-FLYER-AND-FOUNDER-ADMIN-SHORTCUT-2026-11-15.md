# Public Bowling - Commercial launch flyer, free-tier clarity, and Founder Admin shortcuts

**Recorded November 15, 2026 (America/Chicago).** This documents promotional and owner-Mac workflow changes made AFTER the public-v39.017 website deployment. The flyer/shortcut work DOES NOT change the public PWA, Stripe, Firebase, trial, customer access, or scoring history.

## Production context

- Installed app: **https://popzbowling.com**, verified **public-v39.017**, installed PWA from the website (not a Google Play Store application).
- Local Free scoring, regular statistics and recorded bowling history remain available after the 30-day full-Pro trial ends; there is NO requirement to buy.
- **Lifetime Pro is optional and $9.99 once**, with no subscription or automatic trial-to-purchase charge.
- Current features and guide: public-v39.016 added independent lane Stand/Target, Pro ball/line/lane transition analytics and corrected mixed-ball attribution. Public-v39.017 added the complete 19-section in-app Help and printable guide.
- Owner-approved free Lifetime Founder grants are managed by the private macOS Founder Admin described in `docs/FOUNDER-ADMIN-MAC-2026-11-15.md`.

## Updated promotional flyer - FINAL copy

Located on the MacBook at `~/Desktop/Popz Bowling Public Beta/` (the folder retains its old name as a locator; its current flyers are NOT beta flyers).

- **Print-quality flyer:** `Popz-Bowling-Live-Launch-Flyer.png` (1060 x 1484 PNG)
- **Facebook/groups flyer:** `Popz-Bowling-Live-Launch-Flyer-Facebook.jpg` (1060 x 1484 JPEG)
- Source build script: `build_live_flyer.py` in the same desktop folder, also committed at `marketing/launch-2026-11-15/build_live_flyer.py`. It expects the original archived beta PNG on the owner Mac; the complete originals and script are also backed up to the Popz Projects drive.
- Version-controlled copies of these two FINAL promotional images are in `marketing/launch-2026-11-15/` in the public source repository. This marketing directory is not part of the Cloudflare Pages production allowlist.
- Previous launch flyers and the original Public Beta flyers are separately preserved under `Archive - Previous Launch Flyer/` and `Archive - Original Beta Flyers/` inside the same desktop folder.

Original promotional terms "PUBLIC BETA", "TESTERS WANTED", "Pro Preview" and "Scan to try the beta" were replaced by current live-launch language such as "NOW AVAILABLE", "BOWL SMARTER" and "SCAN TO INSTALL FREE". After the owner's follow-up, the final flyer footer prominently says:

> **BASIC VERSION STAYS FREE**

> **30-DAY PRO TRIAL - OPTIONAL $9.99 LIFETIME PRO**

This clarifies that the optional Lifetime Pro upgrade is NOT necessary to keep using the basic bowling app. The existing QR bitmap was retained unchanged and decoded to `https://popzbowling.com` after saving, including in the updated Facebook image. The app's customer-facing terms and trial policy remain authoritative if promotional space requires shorter text.

## Founder Admin desktop launcher

- Actual signed macOS app: `~/Desktop/Popz Bowling Founder Admin.app`
- Additional Finder-launchable icon: `~/Desktop/Popz Bowling Public Beta/Popz Bowling Founder Admin.app`
- The icon in the flyers folder is a **symbolic link** to `../Popz Bowling Founder Admin.app`, not a second installation. Double-clicking it was verified to start the same running app.
- The owner enters a recipient's exact verified Google email, checks eligibility, and deliberately confirms a permanent free Founder grant. There is no automatic public Founder enrollment.
- The compiled app and its private credential context stay on the authorized owner Mac. Git stores only the reviewed Mac source/build scripts in `mac-founder-admin/` and `scripts/founder-admin*.mjs`, **not** private Google OAuth tokens, real customer emails, audit logs or Firebase keys.
- No new Founder grants were issued in the course of adding the launcher; no scoring or payment records were changed.

## Backups and publishing scope

- The Mac's `/Volumes/Popz Projects/Backups/Public Bowling/` is the designated offline backup area for the final flyer files and preserved earlier flyer versions. Keep the owner-only audit log and credential files out of public Git.
- The two FINAL promotional image files are source-versioned in GitHub and Gitea. The full Mac flyer folder, including archived originals, can be backed up to the Popz Projects drive separately.
- The public repository documentation, Popz Collective, the Bowling Obsidian vault and the generated Popz Wiki should link to this record.
- A pre-existing local modification to `tools/launch-qa-phone.sh` in the MacBook public repository is intentionally UNCOMMITTED and not a part of this marketing documentation sync; preserve it. Avoid falsely calling that worktree completely clean.
- Do NOT redeploy the public website or bump `public-v39.017` solely for this non-runtime record.

## Verification

Public source, personal prototype source and Collective `main` were compared to both GitHub and Gitea, and were equal on November 15, 2026 before this documentation follow-up. Personal Bowling v49.10 and its repository are unchanged. After doc/asset commit and dual push, verify final GitHub and Gitea heads again.
## 5x7 borderless photo-print footer safety (November 15, 2026)

The first proof of the final artwork on the owner's **HP ENVY 6400** using **5x7 Full Bleed, glossy photo paper, High-quality RGB, one-sided** showed about **1/16 inch** of trimming of the bottom price line. The printer's borderless bleed expands/crops the original outer edge; this is a physical print condition, not a web-site or PNG corruption.

- The original requested six-copy CUPS job **#130** was canceled to avoid printing further copies with clipped price text. The number of sheets that physically emerged before cancellation was not confirmed.
- **Corrected the actual footer geometry** in `marketing/launch-2026-11-15/build_live_flyer.py` and regenerated both PNG and Facebook JPG. The full-bleed navy background remains edge-to-edge, while footer text is moved higher and slightly resized, leaving at least approximately 1/8 inch safe clearance from the 5x7 paper cut edge. The original valid `popzbowling.com` QR bitmap is unchanged.
- One corrected **borderless 5x7 High-quality glossy print proof, CUPS job #131**, was sent to the HP ENVY. The physical sheet has NOT yet been inspected by the owner in this record. Do not send another six without confirming the proof and knowing how many earlier sheets have printed.
- Original public Beta artwork and previous launch flyer versions remain archived on the owner's Mac, including the `Archive - Previous Launch Flyer/` and `Archive - Original Beta Flyers/` folders. The updated final PNG, JPG and regenerating script are copied to the public Git repository and the Popz Projects backup drive. No customer app code or production deployment changes.
