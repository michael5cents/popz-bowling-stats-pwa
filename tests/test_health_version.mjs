import assert from'node:assert/strict';
import{onRequestGet}from'../functions/api/health.js';

function envFor({errorCount=0,startupCount=0,failQuery=''}={}){
  const db={prepare(sql){return{async first(){
    if(sql.includes("event IN ('window_error'")){if(failQuery==='errors')throw Error('injected error-count query failure');assert.doesNotMatch(sql,/julianday\(occurred_at\)/,'health error query must use the runtime time index');assert.match(sql,/strftime\('%Y-%m-%dT%H:%M:%fZ'/);assert.match(sql,/Script error\./,'opaque source-less Script error noise must be excluded from health');assert.match(sql,/COALESCE\(source/);assert.match(sql,/Java object is gone/,'Android in-app WebView bridge teardown noise must be excluded from health');return{value:errorCount};}
    if(sql.includes("b.event='boot_started'")){if(failQuery==='startups')throw Error('injected startup-count query failure');assert.doesNotMatch(sql,/julianday\(b\.occurred_at\)/,'startup query must use the runtime event/time index');assert.match(sql,/strftime\('%Y-%m-%dT%H:%M:%fZ'/);assert.match(sql,/-15 minutes/,'startup-failure health window must stay at 15 minutes');assert.match(sql,/install_mode='installed'/,'browser install-gate boots must never count as app startup failures');return{value:startupCount};}
    return{value:1};
  }}}};
  return{TELEMETRY_DB:db,LIVE_SHARE_DB:db,RUNTIME_DB:db,ASSETS:{async fetch(){return new Response(JSON.stringify({version:'public-v39.012'}),{status:200,headers:{'content-type':'application/json'}})}}};
}
async function health(options){
  const res=await onRequestGet({request:new Request('https://popzbowling.com/api/health'),env:envFor(options)});
  return{res,body:await res.json()};
}

let x=await health();
assert.equal(x.res.status,200);
assert.equal(x.body.version,'public-v39.012');
assert.equal(x.body.ok,true);
assert.equal(x.body.status,'ok');
assert.equal(x.body.runtime.recentStartupFailureCount,0);
assert.equal(x.body.runtime.startupFailureAlertThreshold,2);
assert.equal(x.body.runtime.startupFailureWindowMinutes,15);

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

for(const failQuery of['errors','startups']){
  x=await health({failQuery});
  assert.equal(x.res.status,503,failQuery+' query failure must make monitoring unavailable');
  assert.equal(x.body.ok,false);
  assert.equal(x.body.status,'down');
  assert.equal(x.body.checks.telemetry,true);
  assert.equal(x.body.checks.liveSharing,true);
  assert.equal(x.body.checks.runtime,false,'SELECT 1 alone must not mark runtime diagnostics healthy');
  assert.equal(x.body.runtime.recentErrors,null,'unknown errors must not be reported as a clean false');
  assert.equal(x.body.runtime.recentStartupFailures,null);
  assert.equal(x.body.runtime.recentStartupFailureCount,null,'unknown count must not be reported as zero');
}
for(const options of[{errorCount:null},{startupCount:null},{errorCount:-1},{startupCount:'invalid'}]){
  x=await health(options);
  assert.equal(x.res.status,503,'invalid or missing COUNT results must not look healthy');
  assert.equal(x.body.checks.runtime,false);
  assert.equal(x.body.runtime.recentErrors,null);
  assert.equal(x.body.runtime.recentStartupFailureCount,null);
}
console.log('Health endpoint reports current version, tolerates one unmatched boot, and fails closed on unavailable diagnostics');
