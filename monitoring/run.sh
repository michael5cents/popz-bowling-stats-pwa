#!/bin/sh
set -a
. /home/michael5cents/.config/popz-bowling-monitor/telegram.env
set +a
exec /usr/bin/node /home/michael5cents/.local/lib/popz-bowling-monitor/telegram-health-monitor.mjs
