import assert from'node:assert/strict';
import{onRequestGet}from'../functions/api/health.js';

function envFor({errorCount=0,startupCount=0}={}){
  const db={prepare(sql){return{async first(){
    if(sql.includes("event IN ('window_error'"))return{value:errorCount};
    if(sql.includes("b.event='boot_started'"))return{value:startupCount};
    return{value:1};
  }}}};
  return{TELEMETRY_DB:db,LIVE_SHARE_DB:db,RUNTIME_DB:db,ASSETS:{async fetch(){return new Response(JSON.stringify({version:'public-v39.007'}),{status:200,headers:{'content-type':'application/json'}})}}};
}
async function health(options){
  const res=await onRequestGet({request:new Request('https://popzbowling.com/api/health'),env:envFor(options)});
  return{res,body:await res.json()};
}

let x=await health();
assert.equal(x.res.status,200);
assert.equal(x.body.version,'public-v39.007');
assert.equal(x.body.ok,true);
assert.equal(x.body.status,'ok');
assert.equal(x.body.runtime.recentStartupFailureCount,0);
assert.equal(x.body.runtime.startupFailureAlertThreshold,2);

x=await health({startupCount:1});
assert.equal(x.body.ok,true,'one abandoned/interrupted boot must not degrade production');
assert.equal(x.body.status,'ok');
assert.equal(x.body.runtime.recentStartupFailures,false);
assert.equal(x.body.runtime.recentStartupFailureCount,1);

x=await health({startupCount:2});
assert.equal(x.body.ok,false,'repeated startup failures must degrade production');
assert.equal(x.body.status,'degraded');
assert.equal(x.body.runtime.recentStartupFailures,true);
assert.equal(x.body.runtime.recentStartupFailureCount,2);

x=await health({errorCount:1,startupCount:0});
assert.equal(x.body.ok,false,'a real recent runtime error must still degrade immediately');
assert.equal(x.body.status,'degraded');
assert.equal(x.body.runtime.recentErrors,true);

console.log('Health endpoint reports current version and ignores only a single unmatched startup boot');
