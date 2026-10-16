import assert from'node:assert/strict';
import{configureTelemetry,reconcileTelemetry,flushTelemetry}from'../telemetry-client.mjs';

const store=new Map();
globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
Object.defineProperty(globalThis,'location',{configurable:true,value:{search:''}});
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:false,userAgent:'Android',webdriver:false}});
const deviceId='dev-main-12345678';
const state={deviceId,sessions:[{
 id:'series-delivery-123',createdAt:'2026-09-30T12:00:00Z',updatedAt:'2026-09-30T12:00:00Z',
 _telemetry:{version:2,eligible:true,originDeviceId:deviceId,startedAt:'2026-09-30T12:00:00Z'},
 games:[{id:'game-delivery-123',createdAt:'2026-09-30T12:00:00Z',frames:Array.from({length:10},()=>({rolls:[]}))}]
}]};
configureTelemetry({deviceId,appVersion:'public-v39.004',isInstalled:()=>true,getState:()=>state});
const queue=()=>JSON.parse(store.get('popz-bowling-telemetry-queue-v2')||'[]');
const acked=()=>JSON.parse(store.get('popz-bowling-telemetry-acked-v3')||'[]');

assert.equal(reconcileTelemetry(),1);
assert.equal(queue().length,1);
assert.equal(queue()[0].id,'milestone:series:series-delivery-123:series_started');
assert.equal(reconcileTelemetry(),0,'same milestone is locally deduplicated while queued');
assert.equal(queue().length,1);
let badAck=false,requests=0;
globalThis.fetch=async(url,options)=>{
 requests++;
 const sent=JSON.parse(options.body).events;
 return new Response(JSON.stringify({ok:true,accepted:badAck?0:sent.length,stored:badAck?0:sent.length}),{status:200,headers:{'content-type':'application/json'}});
};
navigator.onLine=true;
await flushTelemetry();
assert.equal(queue().length,0);
assert.ok(acked().includes('milestone:series:series-delivery-123:series_started'));
assert.equal(reconcileTelemetry(),0,'server-acknowledged milestone is not requeued on later reconciliation');

navigator.onLine=false;
state.sessions[0]._telemetry.firstRollAt='2026-09-30T12:02:00Z';
state.sessions[0].games[0].updatedAt='2026-09-30T12:02:00Z';
state.sessions[0].games[0].frames[0].rolls=[7];
assert.equal(reconcileTelemetry(),1);
assert.equal(queue().length,1);
assert.equal(queue()[0].event,'first_roll_recorded');

badAck=true;navigator.onLine=true;
await flushTelemetry();
assert.equal(queue().length,1,'HTTP 200 without a complete telemetry acknowledgement must not drop queued data');
badAck=false;
await flushTelemetry();
assert.equal(queue().length,0);
assert.ok(requests>=3);
console.log('telemetry durable queue, acknowledgement, and replay-deduplication tests passed');
