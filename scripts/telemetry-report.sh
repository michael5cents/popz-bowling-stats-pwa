#!/bin/zsh
set -e
cd "$(dirname "$0")/.."
DB=popz-bowling-telemetry
SQL="SELECT
 COUNT(DISTINCT device_id) AS all_anonymous_profiles,
 COUNT(DISTINCT CASE WHEN occurred_at >= datetime('now','-7 days') THEN device_id END) AS profiles_seen_7d,
 COUNT(DISTINCT CASE WHEN occurred_at >= datetime('now','-30 days') THEN device_id END) AS profiles_seen_30d,
 COUNT(DISTINCT CASE WHEN event='series_started' AND occurred_at >= datetime('now','-30 days') THEN device_id END) AS profiles_started_series_30d,
 COUNT(DISTINCT CASE WHEN event='series_completed' AND occurred_at >= datetime('now','-30 days') THEN device_id END) AS profiles_completed_series_30d,
 SUM(CASE WHEN event='series_completed' AND occurred_at >= datetime('now','-30 days') THEN 1 ELSE 0 END) AS series_completed_30d
FROM telemetry_events;"
# Normal dashboard review does not require Wrangler/D1 authorization. Use:
#   ./scripts/telemetry-dashboard-fetch.sh > /tmp/popz-telemetry-dashboard.html
# See TELEMETRY-ACCESS.md for Keychain setup and fallback instructions.

echo "Popz Bowling telemetry summary"
npx --yes wrangler d1 execute "$DB" --remote --command "$SQL"
echo
echo "Event totals"
npx --yes wrangler d1 execute "$DB" --remote --command "SELECT event, COUNT(*) AS events, COUNT(DISTINCT device_id) AS profiles FROM telemetry_events GROUP BY event ORDER BY event;"
