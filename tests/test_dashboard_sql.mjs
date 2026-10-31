import assert from'node:assert/strict';
import{DatabaseSync}from'node:sqlite';
import{invalidFunnelSql,currentRuntimeErrorsSql}from'../functions/telemetry-dashboard.js';

const db=new DatabaseSync(':memory:');
db.exec(`CREATE TABLE telemetry_events(
 id TEXT PRIMARY KEY,
 device_id TEXT,
 event TEXT,
 app_version TEXT,
 occurred_at TEXT,
 install_mode TEXT,
 platform TEXT
)`);

const stmt=db.prepare(invalidFunnelSql);
assert.equal(stmt.get().value,0,'empty telemetry table must report zero invalid funnel events');

const insert=db.prepare('INSERT INTO telemetry_events(id,device_id,event,app_version,occurred_at,install_mode,platform) VALUES(?,?,?,?,?,?,?)');
insert.run('a0','legacy-device','app_open','public-v32','2026-10-03T11:55:00Z','installed','android');
insert.run('a1','legacy-device','bowl_viewed','public-v32','2026-10-03T11:56:00Z','installed','android');
insert.run('a2','legacy-device','series_setup_viewed','public-v32','2026-10-03T11:57:00Z','installed','android');
insert.run('a3','legacy-device','series_started','public-v32','2026-10-03T12:00:00Z','installed','android');
insert.run('a4','legacy-device','first_roll_recorded','public-v32','2026-10-03T12:01:00Z','installed','android');
insert.run('a5','legacy-device','series_completed','public-v32','2026-10-03T12:30:00Z','installed','android');
assert.equal(stmt.get().value,0,'fresh legacy installed completion is valid without game_completed when its older funnel stages exist');

insert.run('b1','broken-device','series_completed','public-v39.011','2026-10-03T12:30:00Z','installed','android');
assert.equal(stmt.get().value,1,'current completion without game_completed must be counted invalid');



const rdb=new DatabaseSync(':memory:');
rdb.exec(`CREATE TABLE runtime_events(
 occurred_at TEXT,event TEXT,app_version TEXT,platform TEXT,install_mode TEXT,
 error_kind TEXT,error_message TEXT,source TEXT,line INTEGER,col INTEGER
)`);
rdb.exec(`INSERT INTO runtime_events VALUES(datetime('now','-1 hour'),'window_error','public-v39.011','android','installed','js','recent problem','app.js',10,2)`);
rdb.exec(`INSERT INTO runtime_events VALUES(datetime('now','-30 hours'),'window_error','public-v39.011','android','installed','js','stale problem','app.js',9,2)`);
const runtimeRows=rdb.prepare(currentRuntimeErrorsSql).all();
assert.equal(runtimeRows.length,1,'Latest runtime errors must exclude stale rows outside the current 24-hour health window');
assert.equal(runtimeRows[0].error_message,'recent problem');

console.log('telemetry dashboard invalid-funnel SQL syntax and compatibility tests passed');
