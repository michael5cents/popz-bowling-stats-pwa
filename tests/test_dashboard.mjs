import assert from'node:assert/strict';
import{validDashboardAuth,renderTelemetryDashboard,formatDashboardGeneratedAt}from'../dashboard.mjs';
const basic=(u,p)=>'Basic '+Buffer.from(u+':'+p).toString('base64');
assert.equal(validDashboardAuth(basic('michael','secret123'),'secret123'),true);
assert.equal(validDashboardAuth(basic('michael','wrong'),'secret123'),false);
assert.equal(validDashboardAuth(basic('other','secret123'),'secret123'),false);
assert.equal(validDashboardAuth('', 'secret123'),false);
const page=renderTelemetryDashboard({
 totalDevices:12,active7:8,active30:11,completedDevices30:6,seriesCompleted30:14,
 newDevices7:3,newDevices30:9,returningDevices30:5,
 events:[{event:'series_completed',events:14,devices:6}],
 platforms:[{platform:'android',devices:9}],modes:[{install_mode:'installed',devices:7}],
 daily:[{day:'2026-09-20',devices:4,opens:5,started:3,completed:2}]
},'2026-09-20T21:00:00Z');
assert.match(page,/Popz Bowling Telemetry/);
assert.match(page,/Active devices • 7d/);
assert.match(page,/http-equiv="refresh" content="60"/);
assert.match(page,/Auto-refreshes every 60 seconds/);
assert.equal(formatDashboardGeneratedAt('2026-09-21T01:00:00Z'),'Sep 20, 2026, 8:00 PM');
assert.match(page,/Generated Sep 20, 2026, 4:00 PM CT/);
assert.match(page,/series_completed/);
assert.doesNotMatch(page,/device_id/);
assert.doesNotMatch(page,/dev-/);
console.log('telemetry dashboard auth and aggregate-render tests passed');
