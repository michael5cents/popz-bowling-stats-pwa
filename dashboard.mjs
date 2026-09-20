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
export function renderTelemetryDashboard(data,generatedAt=new Date().toISOString()){
 const cards=[
  ['Total devices',data.totalDevices],['Active devices • 7d',data.active7],['Active devices • 30d',data.active30],
  ['Completed a series • 30d',data.completedDevices30],['Series completed • 30d',data.seriesCompleted30],
  ['New devices • 7d',data.newDevices7],['New devices • 30d',data.newDevices30],['Active on 2+ days • 30d',data.returningDevices30]
 ];
 const rows=(data.daily||[]).map(r=>`<tr><td>${esc(r.day)}</td><td>${n(r.devices)}</td><td>${n(r.opens)}</td><td>${n(r.started)}</td><td>${n(r.completed)}</td></tr>`).join('');
 const events=(data.events||[]).map(r=>`<tr><td>${esc(r.event)}</td><td>${n(r.events)}</td><td>${n(r.devices)}</td></tr>`).join('');
 const platforms=(data.platforms||[]).map(r=>`<tr><td>${esc(r.platform)}</td><td>${n(r.devices)}</td></tr>`).join('');
 const modes=(data.modes||[]).map(r=>`<tr><td>${esc(r.install_mode)}</td><td>${n(r.devices)}</td></tr>`).join('');
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Popz Bowling Telemetry</title><style>
:root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f8fafc;background:#0b1020}
*{box-sizing:border-box}body{margin:0;background:#0b1020;color:#f8fafc}main{width:min(1100px,100%);margin:auto;padding:22px}
header{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:18px}h1{margin:4px 0 0;font-size:28px}
.eyebrow{font-size:12px;font-weight:800;letter-spacing:.1em;color:#38bdf8}.muted{color:#94a3b8}.btn{display:inline-block;padding:10px 14px;border-radius:10px;background:#1d4ed8;color:white;text-decoration:none;font-weight:800}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.card,.panel{background:#141c31;border:1px solid #2d3a58;border-radius:16px}
.card{padding:16px}.card span{display:block;color:#94a3b8;font-size:12px}.card strong{display:block;font-size:28px;margin-top:5px}
.panel{padding:16px;margin-top:16px}h2{font-size:18px;margin:0 0 12px}table{width:100%;border-collapse:collapse}
th,td{padding:9px 8px;border-bottom:1px solid #2d3a58;text-align:left;font-size:13px}th{color:#94a3b8;font-size:11px;text-transform:uppercase}
.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}.note{padding:14px;border-radius:12px;background:#0f172a;color:#cbd5e1;margin-top:16px;font-size:13px}
@media(max-width:800px){.grid{grid-template-columns:repeat(2,1fr)}.two{grid-template-columns:1fr}}@media(max-width:480px){.grid{grid-template-columns:1fr}header{align-items:flex-start;flex-direction:column}}
</style></head><body><main><header><div><div class="eyebrow">PRIVATE ADMIN</div><h1>Popz Bowling Telemetry</h1><div class="muted">Generated ${esc(new Date(generatedAt).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'}))}</div></div><a class="btn" href="/telemetry-dashboard">Refresh</a></header>
<div class="grid">${cards.map(([label,value])=>`<div class="card"><span>${esc(label)}</span><strong>${n(value)}</strong></div>`).join('')}</div>
<div class="note"><strong>How to read this:</strong> a device is an anonymous installation/browser profile, not guaranteed to be one unique person. Completed-series devices and repeat activity across multiple days are stronger adoption signals than raw app opens.</div>
<div class="panel"><h2>Recent daily activity</h2><table><thead><tr><th>Date</th><th>Devices</th><th>App opens</th><th>Series started</th><th>Series completed</th></tr></thead><tbody>${rows||'<tr><td colspan="5">No telemetry yet.</td></tr>'}</tbody></table></div>
<div class="two"><div class="panel"><h2>Event totals</h2><table><thead><tr><th>Event</th><th>Events</th><th>Devices</th></tr></thead><tbody>${events||'<tr><td colspan="3">No telemetry yet.</td></tr>'}</tbody></table></div>
<div><div class="panel"><h2>Devices by platform</h2><table><thead><tr><th>Platform</th><th>Devices</th></tr></thead><tbody>${platforms||'<tr><td colspan="2">No telemetry yet.</td></tr>'}</tbody></table></div>
<div class="panel"><h2>Devices by mode</h2><table><thead><tr><th>Mode</th><th>Devices</th></tr></thead><tbody>${modes||'<tr><td colspan="2">No telemetry yet.</td></tr>'}</tbody></table></div></div></div>
</main></body></html>`;
}
