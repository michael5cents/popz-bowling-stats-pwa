# Popz Bowling Stats — User Guide

Release guide: **public-v39.013**. Production verification is pending.

## Share Live Scores — Pro

On **Bowl**, complete the setup and press **Start Series**. The initial setup screen does not show Share Live Scores. After the series starts, a small **collapsed Share Live Scores** bar appears and stays visible while you score. It never opens automatically. If you want to share, tap **Open**, choose **Start Sharing**, then **Share Link** to use your phone/tablet's normal share sheet and pick Telegram, Google Messages, email, another compatible messaging app, and the person you want to send it to. If you ignore it, it simply remains collapsed. This is **live-session sharing only**: the spectator link follows the selected bowler's current series as it happens. In team mode, select the bowler you want to share before starting the link; turn rotation does not switch whose live scores are shared. Anyone with the link can watch without an account.

**Share Live Scores does not share the Stats screen, History, past series, backups, or other bowlers.** It can show the selected bowler's name, league, current game/series scores, current ball, and the final result from that same live session. Keep the scoring app open and online for updates. Offline scoring saves normally; sharing retries on reconnect. **Finish Series** sends that live session's final result; **Stop Sharing** remains on Bowl afterward. If Stop is pending, reconnect and leave the app open until it confirms. Links expire within 12 hours, and a finished live session within 2 hours. Pro Preview currently unlocks this feature. **Share / Transfer Backup** remains a separate Free feature.

Production app: https://popzbowling.com

## Install
Open `popzbowling.com`. The normal website is now an **install screen only**; the bowling app itself opens only from the installed PWA. On Android/Chrome, tap **Install Popz Bowling** and accept the browser's install prompt. On iPhone/iPad, tap **Install Popz Bowling** for the instructions, then in Safari use **Share → Add to Home Screen → Add**. After installation, launch Popz Bowling from the Home Screen or app launcher.

## Phone layout
**Automatic** is the default. If Popz Bowling is running as an installed PWA on a phone-sized screen (500 CSS pixels or less on the short side), the Bowl screen uses the simpler **Compact Phone** layout. Installed iPads and Samsung/Android tablets keep the existing **Full Layout**. A normal production browser visit does not run the bowling UI at all—it shows the install-only gate until the PWA is installed.

Open **Settings → Layout** to choose **Automatic**, **Compact Phone**, or **Full Layout**. This preference stays only on that device; it is not Google-synced and is not part of bowling backups. You can force Compact Phone on a tablet or foldable for testing.

Compact Phone keeps the main Start Series fields visible and puts secondary setup choices under **More Series Options**. During scoring, the pin buttons stay in fixed positions while impossible counts are disabled. **Miss**, **Undo**, and **Split** sit together below the keypad. The next action—Next Bowler, Start Next Game, or Finish Series—uses a full-width button when it becomes available.

Open **Game details & actions** for Ball Used, Lane Number, entering average/handicap details, New Game, Delete Current Game, and manual Finish Series. In team scoring, the active bowler tab scrolls into view after rotation. Landscape phone scoring places the scorecard and keypad side by side. Share Live Scores keeps its normal behavior: it is absent during setup, then appears collapsed after Start Series and remains available while scoring.

## Set up and start bowling
Popz Bowling opens on **Bowl** by default on phones, tablets, and Full Layout so you can get to scoring immediately. **Stats**, History, Help, and Settings remain available from the bottom navigation at any time.

1. Open **Settings** and enter your bowler name.
2. Tap **Bowl**.
3. Enter the date, league/practice name, bowling center, number of games, oil pattern, entering average, and handicap settings. If the average is blank, the app uses the running average already stored for that same league or Practice when available.
4. The default handicap is **90% of 220**; change it if your league uses another formula. The **Entering / Current Average** remains editable after the series starts, and changing it recalculates handicap immediately.
5. For normal scoring, leave **Scoring Session** on **Single Bowler**. For a spouse or team, choose **Team / Multi-Bowler — PRO**, enter 2–12 bowlers in bowling order, and give each bowler an entering average if needed. During **PRO PREVIEW** this Pro feature is unlocked for testing.
6. Tap **Start Series**.

## Record a game
- Enter the ball used and lane number(s) for the game. In Compact Phone, open **Game details & actions** to find these fields.
- **Advanced Shot Tracking is off by default.** During **PRO PREVIEW** it is unlocked, but you must first open **Settings -> Advanced Shot Tracking** and turn it on. Then Stand Board and Target Board appear while bowling and Ball + Stand + Target are snapshotted with the first ball of each frame and carry forward until you change them. Spare shots do not replace the first-ball setup. Turning the setting off hides those inputs and stops new frame-level setup recording without deleting existing tracked history.
- **Quick Scoring is the default.** Use the on-screen pin keypad after each roll and enter only how many pins fell. Strikes, spares, opens, 10th-frame scoring, scratch score, handicap, and handicap score are calculated automatically. If the first ball leaves a split, tap **Split** in Compact Phone or **Mark Split** in Full Layout before entering the second ball so Split Conversion % stays accurate.
- To collect the exact standing-pin pattern and per-leave conversion analytics, open **Settings -> Scoring Mode** and choose **Detailed Scoring**. After a non-strike first ball, mark the exact pins still standing and tap **Save Leave & Continue**.
- Quick Scoring skips the standing-pin step. It still records the score and spare result; if you mark the split, that frame counts in overall Split Conversion %. Quick mode does not invent the exact split pattern, single-pin leave, or 10-pin leave. You can correct a forgotten Split flag later by editing the frame.
- Use **Undo** for the most recent recorded roll. In Team / Multi-Bowler mode it returns to the bowler who recorded that roll, even if the app has already advanced to the next bowler or you selected a different bowler. You can undo more than one recent roll, and that order survives closing and reopening the app. Editing a frame, starting/deleting a game, finishing/starting a series, or successfully importing a backup starts a new Undo boundary. To correct earlier rolls, select the bowler and tap the frame. Team rolls entered before the v39.012 update use that frame-editing method because their earlier turn order was not recorded.
- Tap an older frame to edit it; later frames remain intact and the score recalculates.
- Tap **New Game** when the next game is ready. Compact Phone also offers a full-width **Start Next Game** after completion; the manual New Game control is inside **Game details & actions**.
- In **Team / Multi-Bowler** mode, Popz advances to the next bowler after each completed frame. The bowler tabs show the current order and score, and you can tap another bowler between frames if the lane order changes. **Start Next Team Game** creates the next game for every bowler together.
- Tap **Finish Series** when the session is over. In Compact Phone, it appears at series completion or inside **Game details & actions**. In team mode this finishes every linked bowler series together and shows a team summary. The app then lets you continue to Overall Stats or History.

## Stats and history
The **Stats** screen keeps the main summary visible at the top: average, high game, high series, games, strike/spare percentages, and leave-conversion summary. Detailed sections below it—league/category stats, league running average, performance breakdowns, first-ball leave stats, and recent series—start collapsed. Tap **Show** only for the detail you want; the app remembers each panel's Show/Hide choice on that device. League/category rows inside the detailed Stats view also start collapsed. Filters include bowler, league/practice, bowling center, lane, ball used, and oil pattern. Team-scored bowlers remain separate: choose **My Bowling**, a spouse/teammate, or **All Bowlers**. Quick-mode frames contribute normal scoring/spare statistics and any manually flagged split attempts/conversions. Exact standing-pin patterns, single-pin/10-pin stats, and per-leave conversion rows come from Detailed Scoring.

In Compact Phone, the summary cards appear before the collapsed **Filters** button. Tap **Filters** to choose the bowler, league/practice, bowling center, lane, ball, or oil pattern. The selected-filter summary stays visible while closed, and closing the panel keeps your selections. Full Layout retains its existing filter arrangement.

Use **History** to review completed bowling grouped by league/category. Those league/category groups start collapsed so a large history stays easy to scan; open the group you want, then expand an individual completed series for frame-by-frame game details or to enter/correct its **Entering Average**. Saving an entering-average correction immediately updates that series handicap and the league running-average calculations.


## Whole-number averages and handicap
All bowling averages are shown as whole numbers, dropping the fractional portion (181.9 displays as **181**, not 182). **Handicap is also calculated from that whole-number average**: 90% of 220 with 180.8 uses 180 and gives **36 pins/game**. This applies to single/team bowling, the Stats and History views, saved entering averages, and the live spectator final result. Strike/spare percentages can still include one decimal place.

## League average rules
In **Settings → League Average Rule**, choose a recorded league and select how that league establishes its average. **Carry Book Average** preserves the original behavior. **Establish After X Games** uses the book/entering average until the selected number of completed actual games is reached, then switches to total actual pinfall divided by actual games with the fraction dropped. A blank saved entering average does not count as zero when the app looks for the league's book average; it skips that blank entry and uses a valid saved entering average when available. The rule is saved separately for each league and is included when backups are transferred between devices.

## Free vs Pro Preview
The header and **Settings -> Account & Plan** show whether the app is running as Free, Pro Preview, or Pro. During the current public test, **Pro Preview** is enabled for everyone, so Google Sync, Advanced Shot Tracking, Team / Multi-Bowler scoring, and Share Live Scores are available without payment. Advanced Shot Tracking still requires an explicit device-local opt-in in Settings. Core scoring, handicap, history, existing statistics, leave tracking, league-average rules, offline use, and manual backup remain the intended Free baseline.

## Back up and restore
Your scores are always stored locally on the device so scoring continues to work offline. If you enable **Google Sync**, completed series are also stored privately under your signed-in Firebase account and synchronize when internet access is available. The Stats opening card shows that protection state: signed-in users see Google Sync status, while signed-out users see **Protect My Data**. **Export Backup / Import JSON** remains an extra manual recovery option rather than the primary sync method.

### Use your bowling history on another device
The easiest method in public-v23 and later is **Settings → Google Sync → Sign in with Google**. Sign in with the same Google account on each phone, tablet, or computer. Your completed series and stats merge automatically, along with your bowler name, saved team-bowler profiles, and per-league average rules. An unfinished series remains only on the device where you started it until you choose **Finish Series**, so another device cannot accidentally change a live game.

**Share / Transfer Backup** and **Import JSON** remain available as a manual transfer or recovery fallback. Manual import still merges rather than replaces history: unique series are kept, newer copies win, and an in-progress local series is protected. The app checks the entire backup before importing it. If the file has an invalid structure or invalid bowling data, the import is rejected without changing your existing history or settings; choose a valid exported backup and try again.

## Updating the app
If Popz Bowling Stats is already installed, you do **not** need to uninstall or reinstall it. Updates replace the cached app files and do **not** erase your bowling history stored on the device. After an update has loaded while online, close and reopen the app to use the new version. The installed app can still open for scoring while offline after its files have been cached.

- **Android:** Make sure the phone is online, fully close Popz Bowling Stats from Recent Apps, and reopen it. If the old version still appears, open `popzbowling.com` in Chrome, refresh once, then reopen the installed app.
- **iPhone/iPad:** Open `popzbowling.com` in Safari, refresh once, then close and reopen the Home Screen version of Popz Bowling Stats.
- **Computer:** Open the installed app while online and refresh once (`Ctrl+R` on Windows or `Command+R` on Mac). If needed, close it completely and reopen it.

Starting with public-v24, Popz Bowling uses two independent update signals: the live production version file and the service worker itself. If either says newer app files are ready, an **Update available** banner appears and tells you to fully close and reopen the app while online. The app rechecks at startup, shortly after startup, when it returns to the foreground, when internet returns, and periodically while open.

Check **Settings → App Version** to see the version currently running.

## Feedback
Use **Settings → Email Feedback** to report a problem or suggest an improvement. Feedback is sent to `feedback@popzbowling.com`.

## Privacy
No account is required. Without Google Sync, bowling history stays on the device. If you choose **Sign in with Google**, completed bowling history is stored in the Popz Bowling Firebase project under your Firebase user ID so it can synchronize across devices. Firestore security rules allow each authenticated user to access only their own `/users/{uid}` data. During the public beta, **Beta usage & diagnostics** is always on and is separate from Google Sync. It never includes bowling scores, bowler names, leagues, centers, balls, oil patterns, leaves, frames, backups, or Google identity. Anonymous usage events can queue during a dead spot and send after connectivity returns; privacy-safe runtime diagnostics use a separate database and contain only app version, coarse platform/mode, sanitized error details, source filename/line, and anonymous runtime/boot IDs. Internal automated/QA sessions are excluded. If the main app cannot finish loading, a recovery message appears without deleting saved bowling data.

## Delete a league or category
In **Settings → Delete League / Category**, choose any recorded league or category and confirm. Every saved series under that exact name is removed. The deletion is saved in exported/shared backups so importing an older device backup does not bring those deleted series back. An in-progress series is protected from imported deletion markers.

## Grouped History
History is organized by **League / Category**, with each league containing date subgroups in newest-first order. Expand a series under its date to review games, frames, scores, and entering-average corrections.
