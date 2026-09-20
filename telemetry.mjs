export const TELEMETRY_EVENTS=new Set([
'first_seen','app_open','app_installed','series_started','series_completed',
'stats_viewed','history_viewed','help_viewed','backup_exported','backup_share_used','backup_imported'
]);
const text=(v,n=80)=>String(v??'').trim().slice(0,n);
const safeId=v=>/^[A-Za-z0-9._:-]{8,100}$/.test(String(v||''));
export function telemetryPlatform(ua=''){
 const x=String(ua).toLowerCase();
 if(/android/.test(x))return'android';if(/iphone|ipad|ipod/.test(x))return'ios';
 if(/windows/.test(x))return'windows';if(/macintosh|mac os/.test(x))return'mac';
 if(/linux/.test(x))return'linux';return'other';
}
export function normalizeTelemetryEvent(v={}){
 const occurredAt=text(v.occurredAt,40),t=Date.parse(occurredAt);
 if(!safeId(v.id)||!safeId(v.deviceId)||!TELEMETRY_EVENTS.has(v.event)||!Number.isFinite(t))return null;
 return{id:text(v.id,100),deviceId:text(v.deviceId,100),event:v.event,
 appVersion:text(v.appVersion,32),occurredAt:new Date(t).toISOString(),
 installMode:v.installMode==='installed'?'installed':'browser',platform:text(v.platform,16)||'other'};
}
export function normalizeTelemetryBatch(body={}){
 const rows=Array.isArray(body.events)?body.events.slice(0,25):[];
 return rows.map(normalizeTelemetryEvent).filter(Boolean);
}
