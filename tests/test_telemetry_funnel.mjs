import assert from'node:assert/strict';
import{onRequestPost}from'../functions/api/telemetry.js';

const stored=[];
const db={
 prepare(sql){return{bind(...values){return{
  sql,values,
  async first(){
   if(!sql.startsWith('SELECT 1'))return null;
   const[device,event,at]=values;
   return stored.some(r=>r[1]===device&&r[2]===event&&Date.parse(r[4])<=Date.parse(at))?{ok:1}:null;
  }
 }}}},
 async batch(statements){
  for(const s of statements)if(s.sql.startsWith('INSERT'))stored.push(s.values);
  return statements.map(()=>({success:true}));
 }
};
const event=(i,name,{version='public-v39.004',device='dev-funnel-12345678',at,mode='installed'}={})=>({
 id:`evt-funnel-${String(i).padStart(3,'0')}-${device.slice(-4)}`,deviceId:device,event:name,appVersion:version,
 occurredAt:at||`2026-10-02T15:${String(i).padStart(2,'0')}:00Z`,installMode:mode,platform:'android'
});
const post=async events=>{
 const request=new Request('https://example.test/api/telemetry',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({events})});
 const response=await onRequestPost({request,env:{TELEMETRY_DB:db}});
 return{status:response.status,body:await response.json()};
};

let result=await post([event(1,'app_open',{version:'public-v39.003',device:'dev-old-before-12345678',at:'2026-10-02T14:44:59Z'})]);
assert.equal(result.status,200);
assert.deepEqual(result.body,{ok:true,accepted:1,stored:0});
assert.equal(stored.length,0,'pre-reset legacy installed events stay excluded');

result=await post([event(2,'app_open',{version:'public-v39.003',device:'dev-old-browser-12345678',mode:'browser'})]);
assert.deepEqual(result.body,{ok:true,accepted:1,stored:0});
assert.equal(stored.length,0,'fresh legacy browser traffic stays excluded');

result=await post([event(3,'series_completed')]);
assert.deepEqual(result.body,{ok:true,accepted:1,stored:0});
assert.equal(stored.length,0,'current completion without prerequisites is dropped');

const chain=['app_open','bowl_viewed','series_setup_viewed','series_started','first_roll_recorded','game_completed','series_completed'];
result=await post(chain.map((name,i)=>event(i+10,name)));
assert.deepEqual(result.body,{ok:true,accepted:7,stored:7});
assert.deepEqual(stored.map(r=>r[2]),chain);

const legacyDevice='dev-legacy-installed-12345678';
const legacy=['app_open','bowl_viewed','series_setup_viewed','series_started','first_roll_recorded','series_completed'];
result=await post(legacy.map((name,i)=>event(i+30,name,{version:'public-v32',device:legacyDevice})));
assert.deepEqual(result.body,{ok:true,accepted:6,stored:6},'fresh legacy installed scoring is retained even though v32 did not emit game_completed');
assert.deepEqual(stored.slice(-6).map(r=>r[2]),legacy);

result=await post([event(60,'game_completed',{device:'dev-bad-chain-12345678',at:'2026-10-02T16:00:00Z'})]);
assert.deepEqual(result.body,{ok:true,accepted:1,stored:0});
assert.equal(stored.length,13,'orphan current game completion is not stored');

console.log('telemetry fresh-baseline, stale-installed compatibility, and prerequisite-chain tests passed');
