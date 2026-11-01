const VERSION_RE=/^public-v\d+(?:\.\d+)*$/;
const STARTUP_FAILURE_ALERT_THRESHOLD=2;
const STARTUP_FAILURE_WINDOW_MINUTES=15;
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store, max-age=0','x-robots-tag':'noindex, nofollow'}});
const probe=async db=>{if(!db)throw Error('missing binding');await db.prepare('SELECT 1 value').first();return true};
async function currentVersion(request,env){
 try{
  const url=new URL('/latest-version.json',request.url),assetRequest=new Request(url,{headers:{'cache-control':'no-cache'}});
  const res=env?.ASSETS?.fetch?await env.ASSETS.fetch(assetRequest):await fetch(assetRequest);
  if(!res.ok)return'unknown';
  const version=String((await res.json())?.version||'').trim();
  return VERSION_RE.test(version)?version:'unknown';
 }catch{return'unknown'}
}
export async function onRequestGet({request,env}){
 const checkedAt=new Date().toISOString(),checks={telemetry:false,liveSharing:false,runtime:false},version=await currentVersion(request,env);
 let recentErrors=null,recentStartupFailures=null,recentStartupFailureCount=null;
 try{await probe(env.TELEMETRY_DB);checks.telemetry=true}catch{}
 try{await probe(env.LIVE_SHARE_DB);checks.liveSharing=true}catch{}
 try{
  await probe(env.RUNTIME_DB);
  const err=await env.RUNTIME_DB.prepare("SELECT COUNT(*) value FROM runtime_events WHERE event IN ('window_error','unhandled_rejection','resource_error') AND NOT (event='window_error' AND error_message='Script error.' AND COALESCE(source,'')='' AND COALESCE(line,0)=0 AND COALESCE(col,0)=0) AND NOT (event='window_error' AND platform='android' AND install_mode='browser' AND error_message LIKE '%Error invoking postMessage: Java object is gone%' AND COALESCE(source,'')='') AND occurred_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-60 minutes')").first();
  const fail=await env.RUNTIME_DB.prepare(`SELECT COUNT(*) value FROM runtime_events b WHERE b.event='boot_started' AND b.install_mode='installed' AND b.occurred_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-${STARTUP_FAILURE_WINDOW_MINUTES} minutes') AND b.occurred_at<=strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 minutes') AND NOT EXISTS (SELECT 1 FROM runtime_events r WHERE r.boot_id=b.boot_id AND r.event='app_ready')`).first();
  const errorCount=Number(err?.value),startupCount=Number(fail?.value);
  if(err?.value==null||fail?.value==null||!Number.isSafeInteger(errorCount)||errorCount<0||!Number.isSafeInteger(startupCount)||startupCount<0)throw Error('invalid runtime diagnostic counts');
  recentErrors=errorCount>0;recentStartupFailureCount=startupCount;recentStartupFailures=startupCount>=STARTUP_FAILURE_ALERT_THRESHOLD;
  checks.runtime=true;
 }catch{}
 const dependenciesOk=checks.telemetry&&checks.liveSharing&&checks.runtime,issues=recentErrors===true||recentStartupFailures===true;
 return reply({ok:dependenciesOk&&!issues,status:!dependenciesOk?'down':issues?'degraded':'ok',version,checkedAt,checks,runtime:{recentErrors,recentStartupFailures,recentStartupFailureCount,startupFailureAlertThreshold:STARTUP_FAILURE_ALERT_THRESHOLD,startupFailureWindowMinutes:STARTUP_FAILURE_WINDOW_MINUTES}},dependenciesOk?200:503);
}
export function onRequest(){return reply({ok:false,status:'method_not_allowed'},405)}
