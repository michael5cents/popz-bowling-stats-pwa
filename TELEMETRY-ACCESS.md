# Telemetry Dashboard Access Runbook

## Private dashboard
- URL: `https://popzbowling.com/telemetry-dashboard`
- HTTP Basic Auth username: `michael`
- Cloudflare Pages secret name: `TELEMETRY_DASHBOARD_PASSWORD`
- macOS Keychain service used by the repo scripts: `popzbowling-telemetry-dashboard`
- Keychain account: `michael`

## Normal assistant/operator workflow
From the public Bowling repo:

```bash
./scripts/telemetry-dashboard-fetch.sh > /tmp/popz-telemetry-dashboard.html
```

Then inspect `/tmp/popz-telemetry-dashboard.html`. No Wrangler/D1 access is required for the normal dashboard review.

## One-time Keychain setup
If the fetch script says the credential is missing:

```bash
./scripts/telemetry-dashboard-init.sh
```

Enter the current dashboard password once. The initializer stores it in macOS Keychain only.

## Production QA rule
Automated browser tests must not contaminate adoption telemetry. public-v32 automatically suppresses WebDriver and HeadlessChrome sessions. For any manual production QA browser/profile, open `https://popzbowling.com/?qa=1` (or add `?telemetry=off`) before testing. QA suppression does not change the user's saved Anonymous usage statistics preference; it only prevents that QA session from queuing/sending adoption events.

## Security rule
Never put the dashboard password itself in GitHub, Gitea, Markdown, Obsidian, Collective, Wiki, shell scripts, or chat handoff notes. Those locations should store only the URL, username, Cloudflare secret name, Keychain service name, and access procedure.

## Fallback checkout
The fallback public repo on `.56` is:
`/Users/michaelnichols/popz-bowling-stats-pwa`

It uses the same scripts. If its Keychain entry is absent, run the initializer once on that machine.

## Raw D1 report
`scripts/telemetry-report.sh` remains useful when Wrangler has valid Cloudflare/D1 authorization. If that path fails, use the Keychain-backed dashboard fetch script instead of searching old chats or reconstructing credentials.
