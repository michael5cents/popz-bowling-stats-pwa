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
 funnel:[{event:'app_open',devices:8},{event:'bowl_viewed',devices:5},{event:'first_roll_recorded',devices:2},{event:'game_completed',devices:1}],
 daily:[{day:'2026-09-20',devices:4,opens:5,bowl_views:4,started:3,first_rolls:2,games_completed:1,completed:1}],
 runtime:{available:true,boots24:9,ready24:8,startupFailures24:1,errors24:2,latestErrors:[{occurred_at:'2026-09-20T20:30:00Z',event:'window_error',app_version:'public-v35',platform:'android',install_mode:'installed',error_kind:'TypeError',error_message:'QA sanitized error',source:'app.js',line:77,col:9}]}
},'2026-09-20T21:00:00Z');
assert.match(page,/Popz Bowling Telemetry/);
assert.match(page,/Profiles seen • 7d/);
assert.match(page,/Activation funnel/);
assert.match(page,/First roll recorded/);
assert.match(page,/QA protection/);
assert.match(page,/Runtime health/);
assert.match(page,/Startup failures • 24h/);
assert.match(page,/Runtime errors • 24h/);
assert.match(page,/QA sanitized error/);
assert.match(page,/source filename and line\/column/);
assert.match(page,/simply opening the app qualifies/);
assert.match(page,/http-equiv="refresh" content="60"/);
assert.match(page,/Auto-refreshes every 60 seconds/);
assert.equal(formatDashboardGeneratedAt('2026-09-21T01:00:00Z'),'Sep 20, 2026, 8:00 PM');
assert.match(page,/Generated Sep 20, 2026, 4:00 PM CT/);
assert.doesNotMatch(page,/device_id/);
assert.doesNotMatch(page,/dev-/);
console.log('telemetry dashboard auth and activation-funnel tests passed');
