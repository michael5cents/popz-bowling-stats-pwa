import assert from'node:assert/strict';
import{mergeCloudBowlingState,stateForCloud,cloudSnapshotToState}from'../cloud-sync-core.mjs';

const frame=()=>({rolls:[]});
const session=(id,updatedAt,extra={})=>({id,updatedAt,createdAt:'2026-09-01T00:00:00Z',games:[{id:id+'g',frames:Array.from({length:10},frame)}],...extra});
const base=(deviceId='dev-local')=>({version:2,deviceId,updatedAt:'2026-09-20T20:00:00Z',settingsUpdatedAt:'2026-09-20T20:00:00Z',settings:{bowlerName:'Local'},activeSessionId:null,sessions:[],deletedSessions:[],lastBackupAt:null,storagePersistent:true});

const local={...base(),sessions:[session('a','2026-09-20T20:00:00Z')]};
const emptyRemote=cloudSnapshotToState({},[],[]);
let merged=mergeCloudBowlingState(local,emptyRemote,'2026-09-20T21:00:00Z').state;
assert.equal(merged.sessions.length,1);
assert.equal(merged.deviceId,'dev-local');

const second=base('dev-second');
const remote=cloudSnapshotToState({settings:{bowlerName:'Cloud'},settingsUpdatedAt:'2026-09-20T20:30:00Z'},[session('a','2026-09-20T20:00:00Z')],[]);
merged=mergeCloudBowlingState(second,remote,'2026-09-20T21:00:00Z').state;
assert.equal(merged.sessions[0].id,'a');
assert.equal(merged.settings.bowlerName,'Cloud');

const fresh={...base('fresh-device'),settingsUpdatedAt:'2026-09-20T23:59:00Z',settings:{bowlerName:'',leagueAverageRules:{}}};
merged=mergeCloudBowlingState(fresh,remote,'2026-09-21T00:00:00Z').state;
assert.equal(merged.settings.bowlerName,'Cloud','empty fresh install must not overwrite existing cloud profile');

const older={...base(),sessions:[session('a','2026-09-20T19:00:00Z',{name:'Old'})]};
const newer=cloudSnapshotToState({},[session('a','2026-09-20T22:00:00Z',{name:'New'})],[]);
merged=mergeCloudBowlingState(older,newer,'2026-09-20T23:00:00Z').state;
assert.equal(merged.sessions[0].name,'New');

const active={...base(),activeSessionId:'a',sessions:[session('a','2026-09-20T23:00:00Z',{name:'Active'})]};
merged=mergeCloudBowlingState(active,newer,'2026-09-20T23:30:00Z').state;
assert.equal(merged.sessions[0].name,'Active');

const deleted=cloudSnapshotToState({},[session('x','2026-09-20T18:00:00Z')],[{id:'x',deletedAt:'2026-09-20T19:00:00Z'}]);
merged=mergeCloudBowlingState(base(),deleted,'2026-09-20T20:00:00Z').state;
assert.equal(merged.sessions.some(s=>s.id==='x'),false);
assert.equal(merged.deletedSessions.some(x=>x.id==='x'),true);

const withActive={...local,activeSessionId:'a'};
assert.equal(stateForCloud(withActive).sessions.length,0);
const grouped={...base(),activeSessionId:'b',activeGroup:{id:'g',sessionIds:['a','b'],activeIndex:1},sessions:[session('a','2026-09-20T23:00:00Z'),session('b','2026-09-20T23:00:00Z'),session('c','2026-09-20T22:00:00Z')]};
assert.deepEqual(stateForCloud(grouped).sessions.map(s=>s.id),['c'],'active team series stay local until the team session is finished');
console.log('cloud sync merge and active-series protection tests passed');
