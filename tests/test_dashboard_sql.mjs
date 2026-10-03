import assert from'node:assert/strict';
import{DatabaseSync}from'node:sqlite';
import{invalidFunnelSql}from'../functions/telemetry-dashboard.js';

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

insert.run('b1','broken-device','series_completed','public-v39.007','2026-10-03T12:30:00Z','installed','android');
assert.equal(stmt.get().value,1,'current completion without game_completed must be counted invalid');

console.log('telemetry dashboard invalid-funnel SQL syntax and compatibility tests passed');
