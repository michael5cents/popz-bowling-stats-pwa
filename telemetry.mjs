export const TELEMETRY_EVENTS=new Set([
'first_seen','app_open','app_installed','bowl_viewed','series_setup_viewed','series_started','first_roll_recorded','game_completed','series_completed',
'stats_viewed','history_viewed','help_viewed','settings_viewed','backup_exported','backup_share_used','backup_imported','cloud_sign_in','cloud_sync'
]);
export const TELEMETRY_BASELINE_VERSION='public-v39.004';
export const TELEMETRY_BASELINE_AT='2026-10-02T14:45:00.000Z';
export const LEGACY_INSTALLED_MIN_VERSION='public-v31';
export const TELEMETRY_PREREQUISITES={
 bowl_viewed:'app_open',series_setup_viewed:'bowl_viewed',series_started:'series_setup_viewed',first_roll_recorded:'series_started',game_completed:'first_roll_recorded',series_completed:'game_completed'
};
const text=(v,n=80)=>String(v??'').trim().slice(0,n);
const safeId=v=>/^[A-Za-z0-9._:-]{8,100}$/.test(String(v||''));
const versionParts=v=>{const m=String(v||'').match(/^public-v(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);return m?[Number(m[1]||0),Number(m[2]||0),Number(m[3]||0)]:null};
export function telemetryVersionAtLeast(version,baseline=TELEMETRY_BASELINE_VERSION){const a=versionParts(version),b=versionParts(baseline);if(!a||!b)return false;for(let i=0;i<3;i++){if(a[i]>b[i])return true;if(a[i]<b[i])return false}return true}
export const telemetryPrerequisite=event=>TELEMETRY_PREREQUISITES[event]||'';
export function telemetryFreshBaselineEligible(row={}){
 if(telemetryVersionAtLeast(row.appVersion))return true;
 if(row.installMode!=='installed'||!telemetryVersionAtLeast(row.appVersion,LEGACY_INSTALLED_MIN_VERSION))return false;
 return Date.parse(row.occurredAt)>=Date.parse(TELEMETRY_BASELINE_AT);
}
export function telemetryPrerequisiteFor(row={}){
 if(row.event==='series_completed'&&!telemetryVersionAtLeast(row.appVersion,'public-v33'))return'series_started';
 return telemetryPrerequisite(row.event);
}
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
