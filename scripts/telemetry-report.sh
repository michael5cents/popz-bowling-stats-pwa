#!/bin/zsh
set -e
cd "$(dirname "$0")/.."
DB=popz-bowling-telemetry
SQL="SELECT 'all_devices' AS metric, COUNT(DISTINCT device_id) AS value FROM telemetry_events
UNION ALL SELECT 'active_devices_7d', COUNT(DISTINCT device_id) FROM telemetry_events WHERE occurred_at >= datetime('now','-7 days')
UNION ALL SELECT 'active_devices_30d', COUNT(DISTINCT device_id) FROM telemetry_events WHERE occurred_at >= datetime('now','-30 days')
UNION ALL SELECT 'devices_completed_series_30d', COUNT(DISTINCT device_id) FROM telemetry_events WHERE event='series_completed' AND occurred_at >= datetime('now','-30 days')
UNION ALL SELECT 'series_completed_30d', COUNT(*) FROM telemetry_events WHERE event='series_completed' AND occurred_at >= datetime('now','-30 days');"
echo "Popz Bowling telemetry summary"
npx --yes wrangler d1 execute "$DB" --remote --command "$SQL"
echo
echo "Event totals"
npx --yes wrangler d1 execute "$DB" --remote --command "SELECT event, COUNT(*) AS events, COUNT(DISTINCT device_id) AS devices FROM telemetry_events GROUP BY event ORDER BY event;"
