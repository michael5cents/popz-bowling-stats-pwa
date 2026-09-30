export const RUNTIME_EVENTS=new Set(['boot_started','app_ready','window_error','unhandled_rejection','resource_error']);
const ERROR_EVENTS=new Set(['window_error','unhandled_rejection','resource_error']);
const safeId=v=>/^[A-Za-z0-9._:-]{8,100}$/.test(String(v||''));
const text=(v,n=160)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,n);
const clamp=(v,min,max)=>{const n=Number(v||0);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.trunc(n))):0};
export function sanitizeRuntimeText(value,max=160){
 return text(value,max)
  .replace(/https?:\/\/[^\s]+/gi,'[url]')
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]')
  .replace(/\b[a-f0-9]{32,}\b/gi,'[token]');
}
export function normalizeRuntimeEvent(v={}){
 const occurredAt=text(v.occurredAt,40),t=Date.parse(occurredAt),event=text(v.event,32);
 if(!safeId(v.id)||!safeId(v.runtimeId)||!safeId(v.bootId)||!RUNTIME_EVENTS.has(event)||!Number.isFinite(t))return null;
 const out={id:text(v.id,100),runtimeId:text(v.runtimeId,100),bootId:text(v.bootId,100),event,
  appVersion:text(v.appVersion,32),occurredAt:new Date(t).toISOString(),
  installMode:v.installMode==='installed'?'installed':'browser',platform:text(v.platform,16)||'other',
  errorKind:'',errorMessage:'',source:'',line:0,col:0};
 if(ERROR_EVENTS.has(event)){
  out.errorKind=text(v.errorKind||event,48);
  out.errorMessage=sanitizeRuntimeText(v.errorMessage,180);
  out.source=sanitizeRuntimeText(v.source,100);
  out.line=clamp(v.line,0,1000000);out.col=clamp(v.col,0,1000000);
 }
 return out;
}
export function normalizeRuntimeBatch(body={}){
 const rows=Array.isArray(body.events)?body.events.slice(0,20):[];
 return rows.map(normalizeRuntimeEvent).filter(Boolean);
}
export const isRuntimeErrorEvent=event=>ERROR_EVENTS.has(event);
