import{normalizeTelemetryBatch,telemetryFreshBaselineEligible,telemetryPrerequisiteFor}from'../../telemetry.mjs';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function onRequestPost({request,env}){
 try{
  const size=Number(request.headers.get('content-length')||0);if(size>16384)return json({ok:false,error:'payload too large'},413);
  const rows=normalizeTelemetryBatch(await request.json());if(!rows.length)return json({ok:true,accepted:0,stored:0});
  const eligible=rows.filter(telemetryFreshBaselineEligible),seen=new Map(),valid=[];
  for(const row of eligible){
   const need=telemetryPrerequisiteFor(row);let ok=!need;
   if(need){ok=(seen.get(row.deviceId)||new Set()).has(need);if(!ok){const found=await env.TELEMETRY_DB.prepare('SELECT 1 ok FROM telemetry_events WHERE device_id=? AND event=? LIMIT 1').bind(row.deviceId,need).first();ok=!!found}}
   if(!ok)continue;valid.push(row);if(!seen.has(row.deviceId))seen.set(row.deviceId,new Set());seen.get(row.deviceId).add(row.event);
  }
  if(valid.length){const sql='INSERT OR IGNORE INTO telemetry_events (id,device_id,event,app_version,occurred_at,install_mode,platform) VALUES (?,?,?,?,?,?,?)';await env.TELEMETRY_DB.batch(valid.map(x=>env.TELEMETRY_DB.prepare(sql).bind(x.id,x.deviceId,x.event,x.appVersion,x.occurredAt,x.installMode,x.platform)))}
  return json({ok:true,accepted:rows.length,stored:valid.length});
 }catch{return json({ok:false,error:'invalid telemetry request'},400)}
}
export function onRequest(){return json({ok:false,error:'method not allowed'},405)}
