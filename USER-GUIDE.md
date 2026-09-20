# Popz Bowling Stats — User Guide

Production app: https://popzbowling.com

## Install
Open `popzbowling.com`. On Android/Chrome, tap **Install App**. On iPhone/iPad, open the site in Safari and use **Share → Add to Home Screen → Add**. The app can also be used directly in the browser.

## Set up and start bowling
1. Open **Settings** and enter your bowler name.
2. Tap **Bowl**.
3. Enter the date, league/practice name, bowling center, number of games, oil pattern, entering average, and handicap settings. If the average is blank, the app uses the running average already stored for that same league or Practice when available.
4. The default handicap is **90% of 220**; change it if your league uses another formula. The **Entering / Current Average** remains editable after the series starts, and changing it recalculates handicap immediately.
5. Tap **Start Series**.

## Record a game
- Enter the ball used and lane number(s) for the game.
- During **PRO PREVIEW**, Advanced Shot Tracking is unlocked. Enter **Stand Board** and **Target Board**; Ball + Stand + Target are snapshotted with the first ball of each frame and carry forward until you change them. Spare shots do not replace the first-ball setup.
- Use the on-screen pin keypad after each roll.
- Strikes, spares, opens, 10th-frame scoring, scratch score, handicap, and handicap score are calculated automatically.
- After a first ball leaves pins standing, mark the standing pins on the pin deck and tap **Save Leave & Continue**.
- Use **Undo** for the most recent roll.
- Tap an older frame to edit it; later frames remain intact and the score recalculates.
- Tap **New Game** when the next game is ready.
- Tap **Finish Series** when the session is over. The app first shows **This Series** results for only the series you just completed; use **Continue to Overall Stats** to open cumulative stats.

## Stats and history
The **Stats** screen shows average, high game, high series, strike/spare percentages, leave conversions, and performance breakdowns. Filters include league/practice, bowling center, lane, ball used, and oil pattern.

Use **History** to review completed series and frame-by-frame game details. Expand a completed series to enter or correct its **Entering Average** later. Saving it immediately updates that series handicap and the league running-average calculations.


## League average rules
In **Settings → League Average Rule**, choose a recorded league and select how that league establishes its average. **Carry Book Average** preserves the original behavior. **Establish After X Games** uses the book/entering average until the selected number of completed actual games is reached, then switches to total actual pinfall divided by actual games with the fraction dropped. The rule is saved separately for each league and is included when backups are transferred between devices.

## Free vs Pro Preview
The header and **Settings → Account & Plan** show whether the app is running as Free, Pro Preview, or Pro. During the current public test, **Pro Preview** is enabled for everyone, so Google Sync and Advanced Shot Tracking are unlocked without payment. Core scoring, handicap, history, existing statistics, leave tracking, league-average rules, offline use, and manual backup remain the intended Free baseline.

## Back up and restore
Your scores are always stored locally on the device so scoring continues to work offline. If you enable **Google Sync**, completed series are also stored privately under your signed-in Firebase account and synchronize when internet access is available. The app still keeps Export Backup / Import JSON as an extra recovery option.

### Use your bowling history on another device
The easiest method in public-v23 and later is **Settings → Google Sync → Sign in with Google**. Sign in with the same Google account on each phone, tablet, or computer. Your completed series and stats merge automatically, along with your bowler name and per-league average rules. An unfinished series remains only on the device where you started it until you choose **Finish Series**, so another device cannot accidentally change a live game.

**Share / Transfer Backup** and **Import JSON** remain available as a manual transfer or recovery fallback. Manual import still merges rather than replaces history: unique series are kept, newer copies win, and an in-progress local series is protected.

## Updating the app
If Popz Bowling Stats is already installed, you do **not** need to uninstall or reinstall it. Updates replace the cached app files and do **not** erase your bowling history stored on the device.

- **Android:** Make sure the phone is online, fully close Popz Bowling Stats from Recent Apps, and reopen it. If the old version still appears, open `popzbowling.com` in Chrome, refresh once, then reopen the installed app.
- **iPhone/iPad:** Open `popzbowling.com` in Safari, refresh once, then close and reopen the Home Screen version of Popz Bowling Stats.
- **Computer:** Open the installed app while online and refresh once (`Ctrl+R` on Windows or `Command+R` on Mac). If needed, close it completely and reopen it.

Starting with public-v24, Popz Bowling uses two independent update signals: the live production version file and the service worker itself. If either says newer app files are ready, an **Update available** banner appears and tells you to fully close and reopen the app while online. The app rechecks at startup, shortly after startup, when it returns to the foreground, when internet returns, and periodically while open.

Check **Settings → App Version** to see the version currently running.

## Feedback
Use **Settings → Email Feedback** to report a problem or suggest an improvement. Feedback is sent to `feedback@popzbowling.com`.

## Privacy
No account is required. Without Google Sync, bowling history stays on the device. If you choose **Sign in with Google**, completed bowling history is stored in the Popz Bowling Firebase project under your Firebase user ID so it can synchronize across devices. Firestore security rules allow each authenticated user to access only their own `/users/{uid}` data. Anonymous product telemetry is separate from Google Sync and does not contain bowling scores or bowling history; it can be turned Off in Settings.

## Delete a league or category
In **Settings → Delete League / Category**, choose any recorded league or category and confirm. Every saved series under that exact name is removed. The deletion is saved in exported/shared backups so importing an older device backup does not bring those deleted series back. An in-progress series is protected from imported deletion markers.

## Grouped History
History is organized by **League / Category**, with each league containing date subgroups in newest-first order. Expand a series under its date to review games, frames, scores, and entering-average corrections.
