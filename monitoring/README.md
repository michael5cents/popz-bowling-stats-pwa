# Popz Bowling Telegram health monitor

The production health monitor runs outside Cloudflare on the always-on PopzVPS and checks the public app every five minutes. It verifies the dynamic production version, homepage asset references, runtime monitor, main app, service worker, and /api/health. Version validation accepts both whole releases such as `public-v37` and numeric patch releases such as `public-v37.002`.

Alerts use the same Telegram bot/chat as the call-forwarding health monitor. Telegram credentials are never stored in this repository. PopzVPS keeps only TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in a mode-600 file at ~/.config/popz-bowling-monitor/telegram.env.

Alert behavior:
- alert immediately when a new issue appears;
- repeat the same unresolved **availability/dependency** issue after a 15-minute cooldown;
- repeat a runtime-diagnostic-only incident no sooner than 60 minutes, so one client error inside the 60-minute health window does not spam duplicate Telegram alerts;
- send a recovery message when all checks become healthy;
- stay silent during normal healthy checks.

PopzVPS runtime:
- monitor: ~/.local/lib/popz-bowling-monitor/telegram-health-monitor.mjs
- wrapper: ~/.local/lib/popz-bowling-monitor/run.sh
- credentials: ~/.config/popz-bowling-monitor/telegram.env
- state/logs: ~/.local/state/popz-bowling-health/
- cron: */5 * * * * run.sh >> cron.log 2>&1

Use `node telegram-health-monitor.mjs --test-notification` with the Telegram environment loaded to verify delivery without creating a fake outage. The previous ChatGPT hourly Popz Bowling Health task is disabled so Telegram is the authoritative alert path.
