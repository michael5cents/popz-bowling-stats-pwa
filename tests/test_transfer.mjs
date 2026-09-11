import assert from'node:assert/strict';
import{mergeBowlingStates}from'../transfer.mjs';
const s=(id,updatedAt,extra={})=>({id,updatedAt,games:[],...extra});
const base={version:2,deviceId:'tablet',settings:{bowlerName:'Mike',statsFilter:'all'},settingsUpdatedAt:'2026-09-08T01:00:00Z',storagePersistent:true,activeSessionId:null,lastBackupAt:null,sessions:[]};

let local={...base,sessions:[s('old','2026-09-08T01:00:00Z'),s('tablet-only','2026-09-08T03:00:00Z')]};
let remote={...base,deviceId:'phone',settings:{bowlerName:'Mike'},sessions:[s('old','2026-09-08T01:00:00Z'),s('phone-only','2026-09-08T04:00:00Z')]};
let out=mergeBowlingStates(local,remote,'2026-09-09T00:00:00Z');
assert.deepEqual(out.state.sessions.map(x=>x.id),['old','tablet-only','phone-only']);
assert.equal(out.summary.added,1);assert.equal(out.summary.updated,0);assert.equal(out.state.deviceId,'tablet');

local={...base,sessions:[s('same','2026-09-08T02:00:00Z',{name:'local'})]};
remote={...base,sessions:[s('same','2026-09-08T05:00:00Z',{name:'remote'})]};
out=mergeBowlingStates(local,remote);
assert.equal(out.state.sessions[0].name,'remote');assert.equal(out.summary.updated,1);

local={...base,activeSessionId:'active',sessions:[s('active','2026-09-08T02:00:00Z',{name:'local active'})]};
remote={...base,sessions:[s('active','2026-09-08T09:00:00Z',{name:'remote newer'})]};
out=mergeBowlingStates(local,remote);
assert.equal(out.state.sessions[0].name,'local active');assert.equal(out.state.activeSessionId,'active');

local={...base,settings:{bowlerName:''},sessions:[]};
remote={...base,deviceId:'phone',settings:{bowlerName:'Imported Bowler'},sessions:[s('one','2026-09-08T05:00:00Z')]};
out=mergeBowlingStates(local,remote);
assert.equal(out.state.settings.bowlerName,'Imported Bowler');assert.equal(out.state.deviceId,'tablet');
console.log('device-transfer merge tests passed');

local={...base,sessions:[s('common','2026-09-01T01:00:00Z'),s('tablet-new','2026-09-08T20:00:00Z')]};
remote={...base,deviceId:'phone',sessions:[s('common','2026-09-01T01:00:00Z'),s('phone-new','2026-09-08T21:00:00Z')]};
out=mergeBowlingStates(local,remote);
assert.deepEqual(new Set(out.state.sessions.map(x=>x.id)),new Set(['common','tablet-new','phone-new']));
const twice=mergeBowlingStates(out.state,remote);
assert.equal(twice.summary.added,0);assert.equal(twice.state.sessions.length,3);

local={...base,sessions:[s('same','2026-09-08T08:00:00Z',{name:'local newer'})]};
remote={...base,sessions:[s('same','2026-09-08T07:00:00Z',{name:'remote older'})]};
out=mergeBowlingStates(local,remote);
assert.equal(out.state.sessions[0].name,'local newer');
console.log('two-device and idempotency tests passed');

// A deleted arbitrary league/session must not return from an older device backup.
local={...base,deletedSessions:[{id:'league-old',deletedAt:'2026-09-10T22:00:00Z'}],sessions:[s('keep','2026-09-10T21:00:00Z',{league:'Thursday Trios Fall'})]};
remote={...base,deviceId:'phone',deletedSessions:[],sessions:[s('league-old','2026-09-10T20:00:00Z',{league:'Tuesday Night Open'}),s('keep','2026-09-10T21:00:00Z',{league:'Thursday Trios Fall'})]};
out=mergeBowlingStates(local,remote,'2026-09-10T23:00:00Z');
assert.deepEqual(out.state.sessions.map(x=>x.id),['keep']);
assert.equal(out.state.deletedSessions.some(x=>x.id==='league-old'),true);

// A deletion marker imported from another device removes the matching completed local session.
local={...base,deletedSessions:[],sessions:[s('gone','2026-09-10T20:00:00Z',{league:'League A'}),s('stay','2026-09-10T20:00:00Z',{league:'League B'})]};
remote={...base,deviceId:'phone',deletedSessions:[{id:'gone',deletedAt:'2026-09-10T22:00:00Z'}],sessions:[]};
out=mergeBowlingStates(local,remote,'2026-09-10T23:00:00Z');
assert.deepEqual(out.state.sessions.map(x=>x.id),['stay']);

// An active receiving-device series is never removed by an imported tombstone.
local={...base,activeSessionId:'active-delete',deletedSessions:[],sessions:[s('active-delete','2026-09-10T20:00:00Z',{league:'League A'})]};
remote={...base,deviceId:'phone',deletedSessions:[{id:'active-delete',deletedAt:'2026-09-10T22:00:00Z'}],sessions:[]};
out=mergeBowlingStates(local,remote,'2026-09-10T23:00:00Z');
assert.equal(out.state.sessions.length,1);
assert.equal(out.state.sessions[0].id,'active-delete');
assert.equal(out.state.deletedSessions.some(x=>x.id==='active-delete'),false);
console.log('deleted-league tombstone tests passed');
