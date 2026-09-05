# Popz Bowling Stats — Public PWA

A one-device-per-bowler, offline-first bowling scoring and statistics app.

## Privacy and storage
- All bowling data is stored locally in IndexedDB on the bowler’s device.
- No account, login, LAN server, cloud database, or PopzPlace score storage is used.
- The installed PWA works offline after its files have been cached.
- Users protect their history with **Export Backup** and restore with **Import JSON**.

## Feedback
The Settings screen includes **Share Feedback**. It uses the device share sheet when available and otherwise copies the feedback text for the user to send by text or email. No feedback server is required.

## Install
Open the GitHub Pages URL in a modern mobile browser. Android users can choose Install App. iPhone/iPad users can use Safari → Share → Add to Home Screen.

## Development
```bash
./start-local.sh
```
Then open `http://localhost:8080`.
