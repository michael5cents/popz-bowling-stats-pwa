#!/bin/sh
# PRODUCTION billing alerts. NOT INSTALLED OR ENABLED by this source file.
# Requires a separate scoped production monitor token and explicit launch gate.
set -eu
set -a
. /home/michael5cents/.config/popz-bowling-monitor/telegram.env
set +a
export POPZ_BILLING_ALERT_ENV=production
exec /usr/bin/node /home/michael5cents/.local/lib/popz-bowling-monitor/billing-telegram-alerts.mjs
