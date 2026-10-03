import{validDashboardAuth,renderTelemetryDashboard}from'../dashboard.mjs';
import{TELEMETRY_BASELINE_VERSION,TELEMETRY_BASELINE_AT}from'../telemetry.mjs';
const html=(body,status=200,extra={})=>new Response(body,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",...extra}});
const one=r=>Number(r?.results?.[0]?.value||0);
export const invalidFunnelSql=`SELECT COUNT(*) value FROM telemetry_events e WHERE
 (e.event='bowl_viewed' AND NOT EXISTS (SELECT 1 FROM telemetry_events p WHERE p.device_id=e.device_id AND p.event='app_open' AND julianday(p.occurred_at)<=julianday(e.occurred_at)))
 OR (e.event='series_setup_viewed' AND NOT EXISTS (SELECT 1 FROM telemetry_events p WHERE p.device_id=e.device_id AND p.event='bowl_viewed' AND julianday(p.occurred_at)<=julianday(e.occurred_at)))
 OR (e.event='series_started' AND NOT EXISTS (SELECT 1 FROM telemetry_events p WHERE p.device_id=e.device_id AND p.event='series_setup_viewed' AND julianday(p.occurred_at)<=julianday(e.occurred_at)))
 OR (e.event='first_roll_recorded' AND NOT EXISTS (SELECT 1 FROM telemetry_events p WHERE p.device_id=e.device_id AND p.event='series_started' AND julianday(p.occurred_at)<=julianday(e.occurred_at)))
 OR (e.event='game_completed' AND NOT EXISTS (SELECT 1 FROM telemetry_events p WHERE p.device_id=e.device_id AND p.event='first_roll_recorded' AND julianday(p.occurred_at)<=julianday(e.occurred_at)))
 OR (e.event='series_completed'
     AND NOT EXISTS (SELECT 1 FROM telemetry_events p WHERE p.device_id=e.device_id AND p.event='game_completed' AND julianday(p.occurred_at)<=julianday(e.occurred_at))
     AND NOT (
       e.install_mode='installed'
       AND e.app_version<'${TELEMETRY_BASELINE_VERSION}'
       AND julianday(e.occurred_at)>=julianday('${TELEMETRY_BASELINE_AT}')
       AND EXISTS (SELECT 1 FROM telemetry_events p WHERE p.device_id=e.device_id AND p.event='series_started' AND julianday(p.occurred_at)<=julianday(e.occurred_at))
     )
 )`;
export async function onRequestGet({request,env}){
 if(!validDashboardAuth(request.headers.get('authorization'),env.TELEMETRY_DASHBOARD_PASSWORD)){
  return html('<h1>Authentication required</h1>',401,{'www-authenticate':'Basic realm="Popz Bowling Telemetry", charset="UTF-8"'});
 }
 const sql=[
  "SELECT COUNT(DISTINCT device_id) value FROM telemetry_events",
  "SELECT COUNT(DISTINCT device_id) value FROM telemetry_events WHERE julianday(occurred_at)>=julianday('now','-7 days')",
  "SELECT COUNT(DISTINCT device_id) value FROM telemetry_events WHERE julianday(occurred_at)>=julianday('now','-30 days')",
  "SELECT COUNT(DISTINCT device_id) value FROM telemetry_events WHERE event='series_completed' AND julianday(occurred_at)>=julianday('now','-30 days')",
  "SELECT COUNT(*) value FROM telemetry_events WHERE event='series_completed' AND julianday(occurred_at)>=julianday('now','-30 days')",
  "SELECT COUNT(*) value FROM (SELECT device_id FROM telemetry_events GROUP BY device_id HAVING MIN(julianday(occurred_at))>=julianday('now','-7 days'))",
  "SELECT COUNT(*) value FROM (SELECT device_id FROM telemetry_events GROUP BY device_id HAVING MIN(julianday(occurred_at))>=julianday('now','-30 days'))",
  "SELECT COUNT(*) value FROM (SELECT device_id FROM telemetry_events WHERE julianday(occurred_at)>=julianday('now','-30 days') GROUP BY device_id HAVING COUNT(DISTINCT substr(occurred_at,1,10))>=2)",
  invalidFunnelSql,
  "SELECT event,COUNT(*) events,COUNT(DISTINCT device_id) devices FROM telemetry_events GROUP BY event ORDER BY event",
  "SELECT platform,COUNT(DISTINCT device_id) devices FROM telemetry_events GROUP BY platform ORDER BY devices DESC,platform",
  "SELECT install_mode,COUNT(DISTINCT device_id) devices FROM telemetry_events GROUP BY install_mode ORDER BY devices DESC,install_mode",
  "SELECT event,COUNT(DISTINCT device_id) devices FROM telemetry_events WHERE julianday(occurred_at)>=julianday('now','-30 days') AND event IN ('app_open','bowl_viewed','series_setup_viewed','series_started','first_roll_recorded','game_completed','series_completed') GROUP BY event",
  "SELECT substr(occurred_at,1,10) day,COUNT(DISTINCT device_id) devices,SUM(event='app_open') opens,SUM(event='bowl_viewed') bowl_views,SUM(event='series_started') started,SUM(event='first_roll_recorded') first_rolls,SUM(event='game_completed') games_completed,SUM(event='series_completed') completed FROM telemetry_events WHERE julianday(occurred_at)>=julianday('now','-14 days') GROUP BY day ORDER BY day DESC"
 ];
 let r;
 try{r=await env.TELEMETRY_DB.batch(sql.map(q=>env.TELEMETRY_DB.prepare(q)))}catch{
  return html('<main style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:720px;margin:60px auto;padding:24px"><h1>Telemetry dashboard temporarily unavailable</h1><p>The private telemetry query failed. Production bowling data and scoring are not affected. Refresh this page in a moment.</p></main>',503);
 }
 let runtime={available:false,installedBoots24:0,installedReady24:0,installedStartupFailures24:0,browserBoots24:0,errors24:0,latestErrors:[]};
 if(env.RUNTIME_DB){
  try{
   const rq=[
    "SELECT COUNT(*) value FROM runtime_events WHERE event='boot_started' AND install_mode='installed' AND julianday(occurred_at)>=julianday('now','-24 hours')",
    "SELECT COUNT(*) value FROM runtime_events WHERE event='app_ready' AND install_mode='installed' AND julianday(occurred_at)>=julianday('now','-24 hours')",
    "SELECT COUNT(*) value FROM runtime_events b WHERE b.event='boot_started' AND b.install_mode='installed' AND julianday(b.occurred_at)>=julianday('now','-24 hours') AND julianday(b.occurred_at)<=julianday('now','-2 minutes') AND NOT EXISTS (SELECT 1 FROM runtime_events x WHERE x.boot_id=b.boot_id AND x.event='app_ready')",
    "SELECT COUNT(*) value FROM runtime_events WHERE event='boot_started' AND install_mode='browser' AND julianday(occurred_at)>=julianday('now','-24 hours')",
    "SELECT COUNT(*) value FROM runtime_events WHERE event IN ('window_error','unhandled_rejection','resource_error') AND julianday(occurred_at)>=julianday('now','-24 hours')",
    "SELECT occurred_at,event,app_version,platform,install_mode,error_kind,error_message,source,line,col FROM runtime_events WHERE event IN ('window_error','unhandled_rejection','resource_error') ORDER BY julianday(occurred_at) DESC LIMIT 20"
   ];
   const rr=await env.RUNTIME_DB.batch(rq.map(q=>env.RUNTIME_DB.prepare(q)));
   runtime={available:true,installedBoots24:one(rr[0]),installedReady24:one(rr[1]),installedStartupFailures24:one(rr[2]),browserBoots24:one(rr[3]),errors24:one(rr[4]),latestErrors:rr[5]?.results||[]};
  }catch{}
 }
 const data={totalDevices:one(r[0]),active7:one(r[1]),active30:one(r[2]),completedDevices30:one(r[3]),seriesCompleted30:one(r[4]),newDevices7:one(r[5]),newDevices30:one(r[6]),returningDevices30:one(r[7]),invalidFunnelEvents:one(r[8]),events:r[9]?.results||[],platforms:r[10]?.results||[],modes:r[11]?.results||[],funnel:r[12]?.results||[],daily:r[13]?.results||[],runtime};
 return html(renderTelemetryDashboard(data));
}
