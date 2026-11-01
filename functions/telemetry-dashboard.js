import{validDashboardAuth,validDashboardPassword,dashboardSessionToken,validDashboardSession,renderTelemetryDashboard}from'../dashboard.mjs';
import{TELEMETRY_BASELINE_VERSION,TELEMETRY_BASELINE_AT}from'../telemetry.mjs';
const html=(body,status=200,extra={})=>new Response(body,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow','strict-transport-security':'max-age=31536000','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",...extra}});
const SESSION_COOKIE='popz_telemetry_session';
const cookieValue=(header,name)=>String(header||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1)||'';
const loginPage=(bad=false)=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Popz Bowling Telemetry Login</title><style>:root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f8fafc;background:#0b1020}*{box-sizing:border-box}body{margin:0;background:#0b1020;color:#f8fafc;min-height:100vh;display:grid;place-items:center;padding:24px}.card{width:min(430px,100%);background:#141c31;border:1px solid #2d3a58;border-radius:18px;padding:24px}.eyebrow{font-size:12px;font-weight:800;letter-spacing:.1em;color:#38bdf8}h1{margin:6px 0 10px;font-size:26px}p{color:#cbd5e1;line-height:1.45}.error{color:#fecaca;background:#451a1a;border:1px solid #7f1d1d;padding:10px 12px;border-radius:10px}label{display:block;margin-top:18px;font-weight:700}input{width:100%;margin-top:8px;padding:12px;border-radius:10px;border:1px solid #475569;background:#0f172a;color:white;font-size:16px}button{width:100%;margin-top:16px;padding:12px;border:0;border-radius:10px;background:#1d4ed8;color:white;font-size:16px;font-weight:800;cursor:pointer}.note{font-size:12px;color:#94a3b8;margin-top:14px}</style></head><body><main class="card"><div class="eyebrow">PRIVATE ADMIN</div><h1>Popz Bowling Telemetry</h1><p>Enter the dashboard password. This page is protected by HTTPS and stores only a secure private session cookie on this browser.</p>${bad?'<p class="error">That password was not accepted.</p>':''}<form method="post" action="/telemetry-dashboard"><label>Dashboard password<input name="password" type="password" autocomplete="current-password" required autofocus></label><button type="submit">Open dashboard</button></form><div class="note">Session lasts 30 days on this browser unless the dashboard password is changed.</div></main></body></html>`;
const authorized=async(request,password)=>validDashboardAuth(request.headers.get('authorization'),password)||await validDashboardSession(cookieValue(request.headers.get('cookie'),SESSION_COOKIE),password);
export async function onRequestPost({request,env}){
 let form;try{form=await request.formData()}catch{return html(loginPage(true),400)}
 const password=String(form.get('password')||'');
 if(!validDashboardPassword(password,env.TELEMETRY_DASHBOARD_PASSWORD))return html(loginPage(true),401);
 const token=await dashboardSessionToken(env.TELEMETRY_DASHBOARD_PASSWORD);
 return new Response(null,{status:303,headers:{location:'/telemetry-dashboard','cache-control':'no-store','strict-transport-security':'max-age=31536000','set-cookie':`${SESSION_COOKIE}=${token}; Path=/telemetry-dashboard; Max-Age=2592000; HttpOnly; Secure; SameSite=Strict`}});
}
const one=r=>Number(r?.results?.[0]?.value||0);
export const currentRuntimeErrorsSql="SELECT occurred_at,event,app_version,platform,install_mode,error_kind,error_message,source,line,col FROM runtime_events WHERE event IN ('window_error','unhandled_rejection','resource_error') AND NOT (event='window_error' AND error_message='Script error.' AND COALESCE(source,'')='' AND COALESCE(line,0)=0 AND COALESCE(col,0)=0) AND NOT (event='window_error' AND platform='android' AND install_mode='browser' AND error_message LIKE '%Error invoking postMessage: Java object is gone%' AND COALESCE(source,'')='') AND occurred_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-24 hours') ORDER BY occurred_at DESC LIMIT 20";
export const invalidFunnelSql=`SELECT COUNT(*) value FROM telemetry_events e WHERE
 (e.event='bowl_viewed' AND NOT EXISTS (SELECT 1 FROM telemetry_events p WHERE p.device_id=e.device_id AND p.event='app_open'))
 OR (e.event='series_setup_viewed' AND NOT EXISTS (SELECT 1 FROM telemetry_events p WHERE p.device_id=e.device_id AND p.event='bowl_viewed'))
 OR (e.event='series_started' AND NOT EXISTS (SELECT 1 FROM telemetry_events p WHERE p.device_id=e.device_id AND p.event='series_setup_viewed'))
 OR (e.event='first_roll_recorded' AND NOT EXISTS (SELECT 1 FROM telemetry_events p WHERE p.device_id=e.device_id AND p.event='series_started'))
 OR (e.event='game_completed' AND NOT EXISTS (SELECT 1 FROM telemetry_events p WHERE p.device_id=e.device_id AND p.event='first_roll_recorded'))
 OR (e.event='series_completed'
     AND NOT EXISTS (SELECT 1 FROM telemetry_events p WHERE p.device_id=e.device_id AND p.event='game_completed')
     AND NOT (
       e.install_mode='installed'
       AND e.app_version<'${TELEMETRY_BASELINE_VERSION}'
       AND julianday(e.occurred_at)>=julianday('${TELEMETRY_BASELINE_AT}')
       AND EXISTS (SELECT 1 FROM telemetry_events p WHERE p.device_id=e.device_id AND p.event='series_started')
     )
 )`;
export async function onRequestGet({request,env}){
 if(!await authorized(request,env.TELEMETRY_DASHBOARD_PASSWORD))return html(loginPage());
 const sql=[
  "SELECT COUNT(DISTINCT device_id) value FROM telemetry_events",
  "SELECT COUNT(DISTINCT device_id) value FROM telemetry_events WHERE occurred_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-7 days')",
  "SELECT COUNT(DISTINCT device_id) value FROM telemetry_events WHERE occurred_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-30 days')",
  "SELECT COUNT(DISTINCT device_id) value FROM telemetry_events WHERE event='series_completed' AND occurred_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-30 days')",
  "SELECT COUNT(*) value FROM telemetry_events WHERE event='series_completed' AND occurred_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-30 days')",
  "SELECT COUNT(*) value FROM (SELECT device_id FROM telemetry_events GROUP BY device_id HAVING MIN(occurred_at)>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-7 days'))",
  "SELECT COUNT(*) value FROM (SELECT device_id FROM telemetry_events GROUP BY device_id HAVING MIN(occurred_at)>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-30 days'))",
  "SELECT COUNT(*) value FROM (SELECT device_id FROM telemetry_events WHERE occurred_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-30 days') GROUP BY device_id HAVING COUNT(DISTINCT substr(occurred_at,1,10))>=2)",
  invalidFunnelSql,
  "SELECT event,COUNT(*) events,COUNT(DISTINCT device_id) devices FROM telemetry_events GROUP BY event ORDER BY event",
  "SELECT platform,COUNT(DISTINCT device_id) devices FROM telemetry_events GROUP BY platform ORDER BY devices DESC,platform",
  "SELECT install_mode,COUNT(DISTINCT device_id) devices FROM telemetry_events GROUP BY install_mode ORDER BY devices DESC,install_mode",
  "SELECT event,COUNT(DISTINCT device_id) devices FROM telemetry_events WHERE occurred_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-30 days') AND event IN ('app_open','bowl_viewed','series_setup_viewed','series_started','first_roll_recorded','game_completed','series_completed') GROUP BY event",
  "SELECT substr(occurred_at,1,10) day,COUNT(DISTINCT device_id) devices,SUM(event='app_open') opens,SUM(event='bowl_viewed') bowl_views,SUM(event='series_started') started,SUM(event='first_roll_recorded') first_rolls,SUM(event='game_completed') games_completed,SUM(event='series_completed') completed FROM telemetry_events WHERE occurred_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-14 days') GROUP BY day ORDER BY day DESC"
 ];
 let r;
 try{r=await env.TELEMETRY_DB.batch(sql.map(q=>env.TELEMETRY_DB.prepare(q)))}catch{
  return html('<main style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:720px;margin:60px auto;padding:24px"><h1>Telemetry dashboard temporarily unavailable</h1><p>The private telemetry query failed. Production bowling data and scoring are not affected. Refresh this page in a moment.</p></main>',503);
 }
 let runtime={available:false,installedBoots24:0,installedReady24:0,installedStartupFailures24:0,browserBoots24:0,errors24:0,latestErrors:[]};
 if(env.RUNTIME_DB){
  try{
   const rq=[
    "SELECT COUNT(*) value FROM runtime_events WHERE event='boot_started' AND install_mode='installed' AND occurred_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-24 hours')",
    "SELECT COUNT(*) value FROM runtime_events WHERE event='app_ready' AND install_mode='installed' AND occurred_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-24 hours')",
    "SELECT COUNT(*) value FROM runtime_events b WHERE b.event='boot_started' AND b.install_mode='installed' AND b.occurred_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-24 hours') AND b.occurred_at<=strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 minutes') AND NOT EXISTS (SELECT 1 FROM runtime_events x WHERE x.boot_id=b.boot_id AND x.event='app_ready')",
    "SELECT COUNT(*) value FROM runtime_events WHERE event='boot_started' AND install_mode='browser' AND occurred_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-24 hours')",
    "SELECT COUNT(*) value FROM runtime_events WHERE event IN ('window_error','unhandled_rejection','resource_error') AND NOT (event='window_error' AND error_message='Script error.' AND COALESCE(source,'')='' AND COALESCE(line,0)=0 AND COALESCE(col,0)=0) AND NOT (event='window_error' AND platform='android' AND install_mode='browser' AND error_message LIKE '%Error invoking postMessage: Java object is gone%' AND COALESCE(source,'')='') AND occurred_at>=strftime('%Y-%m-%dT%H:%M:%fZ','now','-24 hours')",
    currentRuntimeErrorsSql
   ];
   const rr=await env.RUNTIME_DB.batch(rq.map(q=>env.RUNTIME_DB.prepare(q)));
   runtime={available:true,installedBoots24:one(rr[0]),installedReady24:one(rr[1]),installedStartupFailures24:one(rr[2]),browserBoots24:one(rr[3]),errors24:one(rr[4]),latestErrors:rr[5]?.results||[]};
  }catch{}
 }
 const data={totalDevices:one(r[0]),active7:one(r[1]),active30:one(r[2]),completedDevices30:one(r[3]),seriesCompleted30:one(r[4]),newDevices7:one(r[5]),newDevices30:one(r[6]),returningDevices30:one(r[7]),invalidFunnelEvents:one(r[8]),events:r[9]?.results||[],platforms:r[10]?.results||[],modes:r[11]?.results||[],funnel:r[12]?.results||[],daily:r[13]?.results||[],runtime};
 return html(renderTelemetryDashboard(data));
}
