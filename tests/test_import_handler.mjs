import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {emptyFrames} from '../scoring.mjs';
import {prepareBackupImport} from '../backup-validation.mjs';
import {resetRollUndo} from '../roll-undo.mjs';

const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8').split('\n').find(line=>line.startsWith('async function importBackup('));
const session=id=>({id,updatedAt:'2026-10-01T00:00:00Z',games:[{id:id+'-game',frames:emptyFrames()}]});
function harness({failRender=false,failSave=false}={}){
 const original={version:2,deviceId:'local-device',settings:{},activeSessionId:null,activeGroup:null,sessions:[session('local')],deletedSessions:[]};
 const messages=[],events=[],saved=[];let renderCount=0;
 const context={state:original,prepareBackupImport,resetRollUndo,nowIso:()=> '2026-11-01T00:00:00Z',saveState:async()=>{if(failSave)throw Error('Synthetic storage failure');saved.push(structuredClone(context.state))},renderAll:()=>{renderCount++;if(failRender&&context.state!==original)throw Error('Synthetic render failure')},trackTelemetry:name=>events.push(name),cloudUser:()=>null,toast:message=>messages.push(message)};
 vm.createContext(context);vm.runInContext(source,context);
 const importData=data=>context.importBackup({text:async()=>typeof data==='string'?data:JSON.stringify(data)});
 return {context,original,messages,events,saved,importData,get renderCount(){return renderCount}};
}

test('actual import rejects malformed games and invalid JSON before changing or saving state',async()=>{
 for(const input of [{sessions:[{id:'bad',games:[{}]}]},'{bad-json']){
  const h=harness(),before=structuredClone(h.original);await h.importData(input);
  assert.equal(h.context.state,h.original);assert.deepEqual(h.context.state,before);
  assert.equal(h.saved.length,0);assert.equal(h.events.length,0);assert.equal(h.renderCount,0);
  assert.ok(h.messages.length);
 }
});

test('actual import accepts valid older backups, merges history and keeps undo local',async()=>{
 const h=harness(),before=structuredClone(h.original);
 await h.importData({version:2,deviceId:'sender',activeSessionId:'incoming',activeGroup:{sessionIds:['incoming','other']},rollUndo:{deviceId:'sender',actions:[{sessionId:'incoming'}]},sessions:[session('incoming')]});
 assert.deepEqual(h.original,before);
 assert.deepEqual(h.context.state.sessions.map(item=>item.id),['local','incoming']);
 assert.equal(h.context.state.deviceId,'local-device');assert.equal(h.context.state.activeSessionId,null);assert.equal(h.context.state.activeGroup,null);
 assert.equal(h.context.state.rollUndo.deviceId,'local-device');assert.deepEqual(h.context.state.rollUndo.actions,[]);
 assert.equal(h.saved.length,1);assert.deepEqual(h.events,['backup_imported']);
});

test('unexpected candidate render failure leaves persistence and original state intact',async()=>{
 const h=harness({failRender:true}),before=structuredClone(h.original);await h.importData({sessions:[session('incoming')]});
 assert.equal(h.context.state,h.original);assert.deepEqual(h.context.state,before);
 assert.equal(h.saved.length,0);assert.equal(h.events.length,0);assert.equal(h.renderCount,2);
 assert.match(h.messages.at(-1),/render failure/);
});

test('storage failure restores original state and view without reporting a successful import',async()=>{
 const h=harness({failSave:true}),before=structuredClone(h.original);await h.importData({sessions:[session('incoming')]});
 assert.equal(h.context.state,h.original);assert.deepEqual(h.context.state,before);
 assert.equal(h.saved.length,0);assert.equal(h.events.length,0);assert.equal(h.renderCount,2);
 assert.match(h.messages.at(-1),/storage failure/);
});
