import{normalizeTelemetryBatch}from'../../telemetry.mjs';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function onRequestPost({request,env}){
 try{
  const size=Number(request.headers.get('content-length')||0);if(size>16384)return json({ok:false,error:'payload too large'},413);
  const rows=normalizeTelemetryBatch(await request.json());if(!rows.length)return json({ok:true,accepted:0});
  const sql='INSERT OR IGNORE INTO telemetry_events (id,device_id,event,app_version,occurred_at,install_mode,platform) VALUES (?,?,?,?,?,?,?)';
  await env.TELEMETRY_DB.batch(rows.map(x=>env.TELEMETRY_DB.prepare(sql).bind(x.id,x.deviceId,x.event,x.appVersion,x.occurredAt,x.installMode,x.platform)));
  return json({ok:true,accepted:rows.length});
 }catch{return json({ok:false,error:'invalid telemetry request'},400)}
}
export function onRequest(){return json({ok:false,error:'method not allowed'},405)}
