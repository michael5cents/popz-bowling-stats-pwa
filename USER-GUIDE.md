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

## Back up and restore
Your scores are stored on the device. The app requests persistent browser storage and automatically downloads a JSON safety backup whenever you finish a series. Keep those backup files somewhere safe. You can also use **Export Backup** anytime and **Import JSON** in Settings to restore a backup.

### Move your bowling history to another device
On the device that already has your history, use **Settings → Share / Transfer Backup**. Choose Quick Share, AirDrop, Google Drive, email, Messages, or another available sharing option. On the other phone or tablet, open Popz Bowling Stats and use **Settings → Import JSON** to select the transferred backup. Import **merges** histories rather than replacing the receiving device: series unique to either device are kept, and when the same series exists on both devices, the newer copy is kept. Any series currently in progress on the receiving device is protected from being overwritten. The backup includes saved games and frame-by-frame history. If the browser cannot share files directly, the app downloads the backup instead so you can send that file manually.

## Updating the app
If Popz Bowling Stats is already installed, you do **not** need to uninstall or reinstall it. Updates replace the cached app files and do **not** erase your bowling history stored on the device.

- **Android:** Make sure the phone is online, fully close Popz Bowling Stats from Recent Apps, and reopen it. If the old version still appears, open `popzbowling.com` in Chrome, refresh once, then reopen the installed app.
- **iPhone/iPad:** Open `popzbowling.com` in Safari, refresh once, then close and reopen the Home Screen version of Popz Bowling Stats.
- **Computer:** Open the installed app while online and refresh once (`Ctrl+R` on Windows or `Command+R` on Mac). If needed, close it completely and reopen it.

Starting with public-v15, Popz Bowling checks the live production version automatically. If a newer version exists, an **Update available** banner appears and tells you to fully close and reopen the app while online. The banner disappears only after the running app successfully confirms it matches production. If it remains after reopening, refresh `popzbowling.com` once in Chrome or Safari, then reopen the installed app.

Check **Settings → App Version** to see the version currently running.

## Feedback
Use **Settings → Email Feedback** to report a problem or suggest an improvement. Feedback is sent to `feedback@popzbowling.com`.

## Privacy
No account is required. Bowling scores are not uploaded to Popz. Your bowling history remains on the device unless you choose to export a backup.

## Delete a league or category
In **Settings → Delete League / Category**, choose any recorded league or category and confirm. Every saved series under that exact name is removed. The deletion is saved in exported/shared backups so importing an older device backup does not bring those deleted series back. An in-progress series is protected from imported deletion markers.
