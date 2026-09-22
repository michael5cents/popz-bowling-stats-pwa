import{validDashboardAuth,renderTelemetryDashboard}from'../dashboard.mjs';
const html=(body,status=200,extra={})=>new Response(body,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",...extra}});
const one=r=>Number(r?.results?.[0]?.value||0);
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
  "SELECT event,COUNT(*) events,COUNT(DISTINCT device_id) devices FROM telemetry_events GROUP BY event ORDER BY event",
  "SELECT platform,COUNT(DISTINCT device_id) devices FROM telemetry_events GROUP BY platform ORDER BY devices DESC,platform",
  "SELECT install_mode,COUNT(DISTINCT device_id) devices FROM telemetry_events GROUP BY install_mode ORDER BY devices DESC,install_mode",
  "SELECT event,COUNT(DISTINCT device_id) devices FROM telemetry_events WHERE julianday(occurred_at)>=julianday('now','-30 days') AND event IN ('app_open','bowl_viewed','series_setup_viewed','series_started','first_roll_recorded','game_completed','series_completed') GROUP BY event",
  "SELECT substr(occurred_at,1,10) day,COUNT(DISTINCT device_id) devices,SUM(event='app_open') opens,SUM(event='bowl_viewed') bowl_views,SUM(event='series_started') started,SUM(event='first_roll_recorded') first_rolls,SUM(event='game_completed') games_completed,SUM(event='series_completed') completed FROM telemetry_events WHERE julianday(occurred_at)>=julianday('now','-14 days') GROUP BY day ORDER BY day DESC"
 ];
 const r=await env.TELEMETRY_DB.batch(sql.map(q=>env.TELEMETRY_DB.prepare(q)));
 const data={totalDevices:one(r[0]),active7:one(r[1]),active30:one(r[2]),completedDevices30:one(r[3]),seriesCompleted30:one(r[4]),newDevices7:one(r[5]),newDevices30:one(r[6]),returningDevices30:one(r[7]),events:r[8]?.results||[],platforms:r[9]?.results||[],modes:r[10]?.results||[],funnel:r[11]?.results||[],daily:r[12]?.results||[]};
 return html(renderTelemetryDashboard(data));
}