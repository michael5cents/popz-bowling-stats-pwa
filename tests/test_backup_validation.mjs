import assert from 'node:assert/strict';
import {test} from 'node:test';
import {emptyFrames,addRoll,scoreGame,summarizeSessions} from '../scoring.mjs';
import {validateBowlingBackup,prepareBackupImport} from '../backup-validation.mjs';
import {buildTelemetryMilestones} from '../telemetry-milestones.mjs';

const game=(id='game-1',rolls=[])=>{const g={id,frames:emptyFrames()};for(const pins of rolls)addRoll(g,pins);return g};
const series=(id='series-1',extra={})=>({id,league:'League',date:'2026-10-31',createdAt:'2026-10-31T10:00:00Z',updatedAt:'2026-10-31T10:00:00Z',games:[game(id+'-game')],...extra});
const state=(sessions=[])=>({version:2,deviceId:'receiver',activeSessionId:null,activeGroup:null,settings:{bowlerName:'Receiver',leagueAverageRules:{}},sessions,deletedSessions:[]});

test('accepts valid legacy, detailed, team, partial and perfect-game backups without changing them',()=>{
 const legacy=series('legacy',{enteringAverage:180.8,games:[game('perfect',Array(12).fill(10))]});
 const detailed=series('detailed',{groupSessionId:'team',groupOrder:0,games:[game('partial',[7])]});
 detailed.games[0].frames[0].leave=[6,7,10];detailed.games[0].frames[0].split=true;
 detailed.games[0].frames[0].firstBallSetup={ballUsed:'Ball',standBoard:28.5,targetBoard:13};
 const incoming={sessions:[legacy,detailed],settings:{bowlerProfiles:[{id:'partner',name:'Partner'}],leagueAverageRules:{league:{mode:'establish',games:9}}}};
 const before=structuredClone(incoming),local=state();
 const merged=prepareBackupImport(local,incoming);
 assert.deepEqual(incoming,before);assert.deepEqual(local,state());
 assert.equal(merged.summary.added,2);assert.equal(merged.state.sessions[0].enteringAverage,180.8);
 assert.equal(scoreGame(merged.state.sessions[0].games[0]).final,300);
 assert.doesNotThrow(()=>summarizeSessions(merged.state.sessions));
 assert.equal(merged.state.settings.leagueAverageRules.league.games,9);
});

test('rejects malformed history before merge and never changes existing scores',()=>{
 const current=state([series('keep',{games:[game('keep-game',[10])]})]),saved=structuredClone(current);
 const invalids=[
  {sessions:[{id:'bad',games:[{}]}]},
  {sessions:[{id:'bad',games:[{id:'bad-game',frames:[]}]}]},
  {sessions:[null]},
  {sessions:[series('duplicate'),series('duplicate')]},
  {sessions:[series('bad',{games:[game('same'),game('same')]})]},
  {sessions:[],settings:{bowlerProfiles:{bad:true}}},
  {sessions:[],settings:{leagueAverageRules:{league:null}}},
  {sessions:[],deletedSessions:[{id:'keep'}]}
 ];
 for(const incoming of invalids){
  assert.throws(()=>prepareBackupImport(current,incoming),/Invalid bowling backup:/);
  assert.deepEqual(current,saved);
 }
});

test('rejects impossible pinfall and malformed optional frame fields',()=>{
 for(const rolls of [[10,1],[8,3],[-1],[2.5],['7']]){
  const s=series();s.games[0].frames[0].rolls=rolls;
  assert.throws(()=>validateBowlingBackup({sessions:[s]}),/Invalid bowling backup/);
 }
 for(const rolls of [[7,2,1],[10,7,4],[8,3],[10,10,10,0]]){
  const s=series();s.games[0].frames[9].rolls=rolls;
  assert.throws(()=>validateBowlingBackup({sessions:[s]}),/Invalid bowling backup/);
 }
 for(const extra of [{leave:{}},{leave:[7,7]},{split:'yes'},{firstBallSetup:[]}]) {
  const s=series();Object.assign(s.games[0].frames[0],extra);
  assert.throws(()=>validateBowlingBackup({sessions:[s]}),/Invalid bowling backup/);
 }
});

test('valid tenth-frame fills and incomplete frames survive import',()=>{
 for(const rolls of [[],[10],[10,7],[10,7,3],[10,10,10],[7,3,10],[0,0]]){
  const s=series();s.games[0].frames[9].rolls=rolls;
  assert.doesNotThrow(()=>validateBowlingBackup({sessions:[s]}));
 }
});

test('keeps receiving-device active team and undo order; respects completed-history tombstones',()=>{
 const a=series('a'),b=series('b'),gone=series('gone');
 const current=state([a,b,gone]);current.activeSessionId='a';
 current.activeGroup={id:'local-team',sessionIds:['a','b'],activeIndex:0};
 current.rollUndo={version:1,deviceId:'receiver',scope:'local',actions:[]};
 const incoming={sessions:[series('a',{updatedAt:'2026-11-01T10:00:00Z',games:[game('replacement',[10])]})],
  activeSessionId:'sender',activeGroup:{id:'sender-team',sessionIds:['sender']},rollUndo:{deviceId:'sender',actions:[{}]},
  deletedSessions:[{id:'b',deletedAt:'2026-11-01T10:00:00Z'},{id:'gone',deletedAt:'2026-11-01T10:00:00Z'}]};
 const merged=prepareBackupImport(current,incoming);
 assert.equal(merged.state.sessions.some(s=>s.id==='gone'),false);
 assert.deepEqual(merged.state.sessions.find(s=>s.id==='a'),a);
 assert.ok(merged.state.sessions.some(s=>s.id==='b'));
 assert.deepEqual(merged.state.activeGroup,current.activeGroup);
 assert.deepEqual(merged.state.rollUndo,current.rollUndo);
 const noLocalUndo=prepareBackupImport(state(),{sessions:[],rollUndo:{deviceId:'sender'}});
 assert.equal(noLocalUndo.state.rollUndo,null);assert.equal(noLocalUndo.state.activeGroup,null);
});

test('retains local-only history, selects newer completed copies and is idempotent',()=>{
 const current=state([series('local'),series('shared')]);
 const incoming={sessions:[series('shared',{updatedAt:'2026-11-01T10:00:00Z',games:[game('updated',[10])]}),series('remote')]};
 const first=prepareBackupImport(current,incoming),second=prepareBackupImport(first.state,incoming);
 assert.equal(first.summary.updated,1);assert.equal(first.summary.added,1);
 assert.equal(first.state.sessions.length,3);assert.equal(second.summary.added,0);
 assert.deepEqual(first.state.sessions,second.state.sessions);
});

// Malformed metadata must not survive import and crash reconciliation at next boot.
test('validates telemetry fields used during post-import startup',()=>{
 for(const bad of [{startedAt:{toString:null}},{firstRollAt:[]},{originDeviceId:{}},{eligible:'yes'},{version:{}}]){
  const incoming={sessions:[series('metadata',{_telemetry:{version:2,eligible:true,originDeviceId:'receiver',...bad}})]};
  assert.throws(()=>prepareBackupImport(state(),incoming),/Invalid bowling backup/);
 }
 const incoming={sessions:[series('valid-metadata',{_telemetry:{version:2,eligible:true,originDeviceId:'receiver',startedAt:'2026-10-31T10:00:00Z'},games:[game('metadata-game',[10])]})]};
 const merged=prepareBackupImport(state(),incoming);
 assert.doesNotThrow(()=>buildTelemetryMilestones(merged.state));
 assert.ok(buildTelemetryMilestones(merged.state).some(event=>event.event==='series_started'));
});
