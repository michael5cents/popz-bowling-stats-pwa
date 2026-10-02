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
const event=(i,name,version='public-v39.004',device='dev-funnel-12345678')=>({
 id:`evt-funnel-${String(i).padStart(3,'0')}`,deviceId:device,event:name,appVersion:version,
 occurredAt:`2026-10-02T14:${String(i).padStart(2,'0')}:00Z`,installMode:'installed',platform:'android'
});
const post=async events=>{
 const request=new Request('https://example.test/api/telemetry',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({events})});
 const response=await onRequestPost({request,env:{TELEMETRY_DB:db}});
 return{status:response.status,body:await response.json()};
};
let result=await post([event(1,'app_open','public-v39.003','dev-old-12345678')]);
assert.equal(result.status,200);
assert.deepEqual(result.body,{ok:true,accepted:1,stored:0});
assert.equal(stored.length,0,'old-version queue cannot repopulate the reset baseline');

result=await post([event(2,'series_completed')]);
assert.deepEqual(result.body,{ok:true,accepted:1,stored:0});
assert.equal(stored.length,0,'completion without prerequisites is dropped');

const chain=['app_open','bowl_viewed','series_setup_viewed','series_started','first_roll_recorded','game_completed','series_completed'];
result=await post(chain.map((name,i)=>event(i+10,name)));
assert.deepEqual(result.body,{ok:true,accepted:7,stored:7});
assert.deepEqual(stored.map(r=>r[2]),chain);

result=await post([event(30,'game_completed','public-v39.004','dev-bad-chain-12345678')]);
assert.deepEqual(result.body,{ok:true,accepted:1,stored:0});
assert.equal(stored.length,7,'orphan game completion is not stored');

console.log('telemetry fresh-baseline and prerequisite-chain tests passed');
