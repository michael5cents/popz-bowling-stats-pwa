#!/bin/sh
# Separate sandbox billing alert job; does not replace the existing health monitor.
set -eu
set -a
. /home/michael5cents/.config/popz-bowling-monitor/telegram.env
set +a
exec /usr/bin/node /home/michael5cents/.local/lib/popz-bowling-monitor/billing-telegram-alerts.mjs
