import assert from'node:assert/strict';
import{buildTelemetryMilestones}from'../telemetry-milestones.mjs';

const framesComplete=()=>[...Array.from({length:9},()=>({rolls:[10]})),{rolls:[10,10,10]}];
const framesStarted=()=>[{rolls:[7]},...Array.from({length:9},()=>({rolls:[]}))];
const completeGame=(id,at)=>({id,createdAt:at,updatedAt:at,_telemetryCompletedAt:at,frames:framesComplete()});
const startedGame=(id,at)=>({id,createdAt:at,updatedAt:at,frames:framesStarted()});
const meta=(device,started,first)=>({version:2,eligible:true,originDeviceId:device,startedAt:started,firstRollAt:first});
const deviceId='dev-main-12345678';

const single={
 id:'series-12345678',createdAt:'2026-09-30T10:00:00Z',updatedAt:'2026-09-30T10:20:00Z',finishedAt:'2026-09-30T10:20:00Z',
 _telemetry:meta(deviceId,'2026-09-30T10:00:00Z','2026-09-30T10:02:00Z'),
 games:[completeGame('game-12345678','2026-09-30T10:18:00Z')]
};
let events=buildTelemetryMilestones({deviceId,sessions:[single]});
assert.deepEqual(events.map(x=>x.event),['series_started','first_roll_recorded','game_completed','series_completed']);
assert.ok(events.some(x=>x.id==='milestone:series:series-12345678:series_started'));
assert.ok(events.some(x=>x.id==='milestone:game:game-12345678:game_completed'));

const foreign={...single,id:'series-foreign-123',_telemetry:{...single._telemetry,originDeviceId:'dev-other-12345678'}};
assert.equal(buildTelemetryMilestones({deviceId,sessions:[foreign]}).length,0,'synced/imported series from another device must not replay telemetry');
const groupId='group-12345678';
const teamA={id:'series-team-a-123',groupSessionId:groupId,groupOrder:0,createdAt:'2026-09-30T11:00:00Z',updatedAt:'2026-09-30T11:30:00Z',finishedAt:'2026-09-30T11:30:00Z',_telemetry:meta(deviceId,'2026-09-30T11:00:00Z','2026-09-30T11:03:00Z'),games:[completeGame('game-team-a-123','2026-09-30T11:25:00Z')]};
const teamB={id:'series-team-b-123',groupSessionId:groupId,groupOrder:1,createdAt:'2026-09-30T11:00:00Z',updatedAt:'2026-09-30T11:30:00Z',finishedAt:'2026-09-30T11:30:00Z',_telemetry:meta(deviceId,'2026-09-30T11:00:00Z','2026-09-30T11:03:00Z'),games:[completeGame('game-team-b-123','2026-09-30T11:28:00Z')]};
events=buildTelemetryMilestones({deviceId,sessions:[teamA,teamB]});
assert.deepEqual(events.map(x=>x.event),['series_started','first_roll_recorded','game_completed','series_completed']);
assert.equal(events.filter(x=>x.event==='series_started').length,1,'team start counts once, not once per bowler');
assert.ok(events.some(x=>x.id==='milestone:group:group-12345678:game:1:game_completed'));

const partialB={...teamB,finishedAt:undefined,games:[startedGame('game-team-b-123','2026-09-30T11:05:00Z')]};
events=buildTelemetryMilestones({deviceId,sessions:[teamA,partialB]});
assert.equal(events.some(x=>x.event==='game_completed'),false,'team game completes only after every bowler finishes');
assert.equal(events.some(x=>x.event==='series_completed'),false,'team series completes only after every bowler finishes');

const ineligible={...single,id:'series-ineligible-123',_telemetry:{...single._telemetry,eligible:false}};
assert.equal(buildTelemetryMilestones({deviceId,sessions:[ineligible]}).length,0,'QA-ineligible series never backfills later');
const legacy={...single,id:'series-legacy-123',_telemetry:{...single._telemetry,version:1}};
assert.equal(buildTelemetryMilestones({deviceId,sessions:[legacy]}).length,0,'pre-reset telemetry markers never replay into the fresh baseline');
console.log('telemetry milestone reconciliation tests passed');
