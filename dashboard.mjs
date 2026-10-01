const enc=new TextEncoder();
function safeEqual(a,b){
 const x=enc.encode(String(a??'')),y=enc.encode(String(b??''));let diff=x.length^y.length,n=Math.max(x.length,y.length);
 for(let i=0;i<n;i++)diff|=(x[i]??0)^(y[i]??0);return diff===0;
}
export function validDashboardAuth(header,password,user='michael'){
 if(!password||!header?.startsWith('Basic '))return false;
 try{
  const raw=atob(header.slice(6)),i=raw.indexOf(':');if(i<0)return false;
  return safeEqual(raw.slice(0,i),user)&&safeEqual(raw.slice(i+1),password);
 }catch{return false}
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Number(v||0).toLocaleString('en-US');
const inferredSeriesStarts=(started,completed)=>Math.max(Number(started||0),Number(completed||0));
export const formatDashboardGeneratedAt=value=>new Date(value).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Chicago'});
export function renderTelemetryDashboard(data,generatedAt=new Date().toISOString()){
 const cards=[
  ['Total anonymous profiles',data.totalDevices],['Profiles seen • 7d',data.active7],['Profiles seen • 30d',data.active30],
  ['Completed a series • 30d',data.completedDevices30],['Series completed • 30d',data.seriesCompleted30],
  ['New profiles • 7d',data.newDevices7],['New profiles • 30d',data.newDevices30],['Seen on 2+ days • 30d',data.returningDevices30]
 ];
 const rows=(data.daily||[]).map(r=>`<tr><td>${esc(r.day)}</td><td>${n(r.devices)}</td><td>${n(r.opens)}</td><td>${n(r.bowl_views)}</td><td>${n(inferredSeriesStarts(r.started,r.completed))}</td><td>${n(r.first_rolls)}</td><td>${n(r.games_completed)}</td><td>${n(r.completed)}</td></tr>`).join('');
 const events=(data.events||[]).map(r=>`<tr><td>${esc(r.event)}</td><td>${n(r.events)}</td><td>${n(r.devices)}</td></tr>`).join('');
 const platforms=(data.platforms||[]).map(r=>`<tr><td>${esc(r.platform)}</td><td>${n(r.devices)}</td></tr>`).join('');
 const modes=(data.modes||[]).map(r=>`<tr><td>${esc(r.install_mode)}</td><td>${n(r.devices)}</td></tr>`).join('');
 const funnelOrder=[['app_open','App opened'],['bowl_viewed','Bowl viewed'],['series_setup_viewed','Series setup shown'],['series_started','Series started'],['first_roll_recorded','First roll recorded'],['game_completed','Game completed'],['series_completed','Series completed']],funnelMap=new Map((data.funnel||[]).map(r=>[r.event,Number(r.devices||0)]));funnelMap.set('series_started',inferredSeriesStarts(funnelMap.get('series_started'),funnelMap.get('series_completed')));const funnelRows=funnelOrder.map(([event,label])=>`<tr><td>${esc(label)}</td><td>${n(funnelMap.get(event)||0)}</td></tr>`).join('');
 const runtime=data.runtime||{},runtimeBad=Number(runtime.errors24||0)>0||Number(runtime.startupFailures24||0)>0;
 const runtimeCards=[['Runtime status',runtime.available===false?'Unavailable':runtimeBad?'ATTENTION':'Healthy'],['Boots • 24h',runtime.boots24],['App ready • 24h',runtime.ready24],['Startup failures • 24h',runtime.startupFailures24],['Runtime errors • 24h',runtime.errors24]];
 const runtimeErrors=(runtime.latestErrors||[]).map(r=>`<tr><td>${esc(formatDashboardGeneratedAt(r.occurred_at))}</td><td>${esc(r.event)}</td><td>${esc(r.app_version)}</td><td>${esc(r.platform)}</td><td>${esc(r.install_mode)}</td><td>${esc(r.error_kind)}</td><td>${esc(r.error_message)}</td><td>${esc(r.source)}${r.line?`:${n(r.line)}`:''}</td></tr>`).join('');
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="60"><title>Popz Bowling Telemetry</title><style>
:root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f8fafc;background:#0b1020}
*{box-sizing:border-box}body{margin:0;background:#0b1020;color:#f8fafc}main{width:min(1200px,100%);margin:auto;padding:22px}
header{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:18px}h1{margin:4px 0 0;font-size:28px}
.eyebrow{font-size:12px;font-weight:800;letter-spacing:.1em;color:#38bdf8}.muted{color:#94a3b8}.btn{display:inline-block;padding:10px 14px;border-radius:10px;background:#1d4ed8;color:white;text-decoration:none;font-weight:800}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.runtime-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.card,.panel{background:#141c31;border:1px solid #2d3a58;border-radius:16px}
.card{padding:16px}.card span{display:block;color:#94a3b8;font-size:12px}.card strong{display:block;font-size:28px;margin-top:5px}
.panel{padding:16px;margin-top:16px;overflow:auto}h2{font-size:18px;margin:0 0 12px}table{width:100%;border-collapse:collapse}
th,td{padding:9px 8px;border-bottom:1px solid #2d3a58;text-align:left;font-size:13px;vertical-align:top}th{color:#94a3b8;font-size:11px;text-transform:uppercase}
.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}.note{padding:14px;border-radius:12px;background:#0f172a;color:#cbd5e1;margin-top:16px;font-size:13px}
@media(max-width:900px){.runtime-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:800px){.grid{grid-template-columns:repeat(2,1fr)}.two{grid-template-columns:1fr}}@media(max-width:480px){.grid,.runtime-grid{grid-template-columns:1fr}header{align-items:flex-start;flex-direction:column}}
</style></head><body><main><header><div><div class="eyebrow">PRIVATE ADMIN</div><h1>Popz Bowling Telemetry</h1><div class="muted">Generated ${esc(formatDashboardGeneratedAt(generatedAt))} CT • Auto-refreshes every 60 seconds</div></div><a class="btn" href="/telemetry-dashboard">Refresh now</a></header>
<div class="runtime-grid">${runtimeCards.map(([label,value])=>`<div class="card"><span>${esc(label)}</span><strong>${typeof value==='number'?n(value):esc(value??0)}</strong></div>`).join('')}</div>
<div class="note"><strong>Runtime health:</strong> a boot is recorded by a tiny reporter loaded before the main app. <strong>App ready</strong> is recorded only after IndexedDB, rendering, event binding, live-share mounting, and normal startup complete. Startup failures count mature boots that never reached ready. Runtime reports follow the same Anonymous usage setting and are suppressed for automated/QA sessions. Error reports contain only app version, platform/mode, a sanitized error category/message, source filename and line/column — never bowling scores, names, leagues or history.</div>
<div class="panel"><h2>Latest runtime errors</h2><table><thead><tr><th>Time CT</th><th>Event</th><th>Version</th><th>Platform</th><th>Mode</th><th>Kind</th><th>Sanitized message</th><th>Source</th></tr></thead><tbody>${runtimeErrors||'<tr><td colspan="8">No runtime errors reported.</td></tr>'}</tbody></table></div>
<div class="grid">${cards.map(([label,value])=>`<div class="card"><span>${esc(label)}</span><strong>${n(value)}</strong></div>`).join('')}</div>
<div class="note"><strong>How to read adoption:</strong> each profile is an anonymous installation/browser profile, not guaranteed to be one unique person. <strong>Seen</strong> means at least one accepted telemetry event during the period; simply opening the app qualifies and does not mean a series was started. Completed-series profiles and repeat activity across multiple days are stronger adoption signals than raw opens.<br><br><strong>QA protection:</strong> automated WebDriver/HeadlessChrome sessions and explicit <code>?qa=1</code> production checks are excluded from telemetry and runtime diagnostics. Historical owner/manual QA may still exist in the early baseline unless positively identified and removed.</div>
<div class="panel"><h2>Activation funnel • 30d</h2><p class="muted">New funnel stages begin with public-v30 and cannot be backfilled for earlier visits. For reporting, every recorded series completion counts as at least one series start when an older retained telemetry slice is missing its start milestone.</p><table><thead><tr><th>Stage</th><th>Profiles</th></tr></thead><tbody>${funnelRows||'<tr><td colspan="2">No funnel telemetry yet.</td></tr>'}</tbody></table></div>
<div class="panel"><h2>Recent daily activity</h2><table><thead><tr><th>Date</th><th>Profiles</th><th>App opens</th><th>Bowl views</th><th>Series started</th><th>First rolls</th><th>Games completed</th><th>Series completed</th></tr></thead><tbody>${rows||'<tr><td colspan="8">No telemetry yet.</td></tr>'}</tbody></table></div>
<div class="two"><div class="panel"><h2>Event totals</h2><table><thead><tr><th>Event</th><th>Events</th><th>Profiles</th></tr></thead><tbody>${events||'<tr><td colspan="3">No telemetry yet.</td></tr>'}</tbody></table></div>
<div><div class="panel"><h2>Profiles by platform</h2><table><thead><tr><th>Platform</th><th>Profiles</th></tr></thead><tbody>${platforms||'<tr><td colspan="2">No telemetry yet.</td></tr>'}</tbody></table></div>
<div class="panel"><h2>Profiles by mode</h2><table><thead><tr><th>Mode</th><th>Profiles</th></tr></thead><tbody>${modes||'<tr><td colspan="2">No telemetry yet.</td></tr>'}</tbody></table></div></div></div>
</main></body></html>`;
}
