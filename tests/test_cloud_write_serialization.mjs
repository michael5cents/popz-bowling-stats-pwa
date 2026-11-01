import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {emptyFrames,wholeBowlingAverage} from '../scoring.mjs';
import {stateForCloud,cloudDocForSession,normalizeCloudDocument} from '../cloud-sync-core.mjs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const source=app.split('\n').find(line=>line.startsWith('function buildSeries('));
const meta={gameCount:3,league:'Synthetic',date:'2026-11-01',center:'',oilPattern:'',handicapPct:90,handicapBase:220,name:''};
function build(groupId=''){
 const context={wholeBowlingAverage,nowIso:()=> '2026-11-01T00:00:00Z',uuid:()=> 'synthetic',state:{deviceId:'test-device'},cleanEntry:value=>String(value||'').trim(),makeGame:()=>({id:'game',frames:emptyFrames()})};
 vm.createContext(context);vm.runInContext(source,context);
 return structuredClone(context.buildSeries(meta,'owner','Test',180,groupId,2));
}
function assertNoUndefined(value){
 assert.notEqual(value,undefined);
 if(value&&typeof value==='object')for(const item of Object.values(value))assertNoUndefined(item);
}

test('actual single-bowler series omits group properties and team series preserves them',()=>{
 const single=build(),team=build('team');
 assert.equal(Object.hasOwn(single,'groupSessionId'),false);
 assert.equal(Object.hasOwn(single,'groupOrder'),false);
 assertNoUndefined(cloudDocForSession(single));
 assert.equal(team.groupSessionId,'team');assert.equal(team.groupOrder,2);
});

test('legacy local records are normalized without mutating them or shifting arrays',()=>{
 const legacy=build();legacy.groupSessionId=undefined;legacy.groupOrder=undefined;
 legacy.games[0].frames[0].firstBallSetup={ballUsed:'Ball',targetBoard:undefined};
 legacy.extra={optional:undefined,items:[1,undefined,3]};
 const before=structuredClone(legacy),document=cloudDocForSession(legacy);
 assertNoUndefined(document);
 assert.equal(Object.hasOwn(document.data,'groupSessionId'),false);
 assert.deepEqual(document.data.extra.items,[1,null,3]);
 assert.deepEqual(document.data.games[0].frames[0].firstBallSetup,{ballUsed:'Ball'});
 assert.deepEqual(legacy,before);
 assert.notEqual(document.data,legacy);
 assert.notEqual(document.data.games,legacy.games);
});

test('actual commit boundary normalizes session, profile and deletion documents',async()=>{
 const cloudSource=fs.readFileSync(new URL('../cloud-sync.mjs',import.meta.url),'utf8');
 const start=cloudSource.indexOf('async function commitOps('),end=cloudSource.indexOf('\n}\n',start)+2;
 assert.ok(start>=0&&end>start);
 const writes=[],deletes=[];let committed=0;
 const storeApi={writeBatch:()=>({set:(ref,data)=>{assertNoUndefined(data);writes.push({ref,data})},delete:ref=>deletes.push(ref),commit:async()=>{committed++}})};
 const context={normalizeCloudDocument,storeApi,db:{}};
 vm.createContext(context);vm.runInContext(cloudSource.slice(start,end),context);
 const ops=[{kind:'set',ref:'session',data:{data:{groupSessionId:undefined,games:[]}}},{kind:'set',ref:'profile',data:{settings:{bowlerProfiles:[{id:'p',name:'P',optional:undefined}]}}},{kind:'set',ref:'tomb',data:{id:'old',deletedAt:'2026-11-01T00:00:00Z',optional:undefined}},{kind:'delete',ref:'removed'}];
 const before=structuredClone(ops);await context.commitOps(ops);
 assert.equal(writes.length,3);assert.deepEqual(deletes,['removed']);assert.equal(committed,1);
 assert.deepEqual(ops,before);
});

test('device-local roll history never enters cloud state',()=>{
 const output=stateForCloud({deviceId:'test',rollUndo:{actions:[{sessionId:'s'}]},settings:{},sessions:[],deletedSessions:[]});
 assert.equal(Object.hasOwn(output,'rollUndo'),false);
});
