import{normalizeRuntimeBatch}from'../../runtime.mjs';
import{telemetryVersionAtLeast}from'../../telemetry.mjs';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
export async function onRequestPost({request,env}){
 try{
  const size=Number(request.headers.get('content-length')||0);if(size>16384)return json({ok:false,error:'payload too large'},413);
  if(!env.RUNTIME_DB)return json({ok:false,error:'runtime reporting unavailable'},503);
  const rows=normalizeRuntimeBatch(await request.json());if(!rows.length)return json({ok:true,accepted:0,stored:0});
  const valid=rows.filter(x=>telemetryVersionAtLeast(x.appVersion));
  if(valid.length){const sql='INSERT OR IGNORE INTO runtime_events (id,runtime_id,boot_id,event,app_version,occurred_at,install_mode,platform,error_kind,error_message,source,line,col) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)';await env.RUNTIME_DB.batch(valid.map(x=>env.RUNTIME_DB.prepare(sql).bind(x.id,x.runtimeId,x.bootId,x.event,x.appVersion,x.occurredAt,x.installMode,x.platform,x.errorKind,x.errorMessage,x.source,x.line,x.col)))}
  return json({ok:true,accepted:rows.length,stored:valid.length});
 }catch{return json({ok:false,error:'invalid runtime report'},400)}
}
export function onRequest(){return json({ok:false,error:'method not allowed'},405)}
