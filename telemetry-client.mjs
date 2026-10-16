import{normalizeTelemetryEvent,telemetryPlatform}from'./telemetry.mjs';
import{buildTelemetryMilestones}from'./telemetry-milestones.mjs';

const QUEUE='popz-bowling-telemetry-queue-v2',ACKED='popz-bowling-telemetry-acked-v3',FIRST='popz-bowling-telemetry-first-v2';
const LEGACY_KEYS=['popz-bowling-telemetry-queue-v1','popz-bowling-telemetry-acked-v1','popz-bowling-telemetry-first-v1','popz-bowling-telemetry-enabled-v1'];
const MAX_QUEUE=1000,MAX_ACKED=5000,RETRY_MS=30000;
let ctx=null,flushing=false,retryTimer=null,memoryQueue=[],memoryAcked=[];
const array=v=>{try{const x=JSON.parse(v||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
const readQueue=()=>{try{const raw=localStorage.getItem(QUEUE);return raw===null?[...memoryQueue]:array(raw)}catch{return[...memoryQueue]}};
const writeQueue=q=>{
 memoryQueue=q.slice(-MAX_QUEUE);
 try{localStorage.setItem(QUEUE,JSON.stringify(memoryQueue))}catch{}
};
const readAcked=()=>{try{const raw=localStorage.getItem(ACKED);return raw===null?[...memoryAcked]:array(raw)}catch{return[...memoryAcked]}};
const writeAcked=ids=>{
 memoryAcked=ids.slice(-MAX_ACKED);
 try{localStorage.setItem(ACKED,JSON.stringify(memoryAcked))}catch{}
};
const acknowledge=ids=>{
 const next=[...readAcked(),...ids],seen=new Set(),dedup=[];
 for(let i=next.length-1;i>=0;i--)if(!seen.has(next[i])){seen.add(next[i]);dedup.push(next[i])}
 writeAcked(dedup.reverse());
};
const clearQueue=()=>{memoryQueue=[];try{localStorage.removeItem(QUEUE)}catch{}};
export const telemetryEnabled=()=>true;
export function telemetrySuppressed(){
 try{const q=new URLSearchParams(globalThis.location?.search||'');if(q.get('qa')==='1')return true}catch{}
 try{const n=globalThis.navigator;if(n?.webdriver===true||/HeadlessChrome/i.test(n?.userAgent||''))return true}catch{}
 return false;
}
const telemetryActive=()=>!telemetrySuppressed();
function clearLegacyTelemetry(){try{for(const key of LEGACY_KEYS)localStorage.removeItem(key)}catch{}}
export function configureTelemetry(config){ctx=config}
function queueTelemetry(event,meta={}){
 if(!ctx||!telemetryActive())return null;
 const id=meta.id||'evt-'+(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2));
 if(new Set(readAcked()).has(id))return id;
 const item=normalizeTelemetryEvent({id,deviceId:ctx.deviceId,event,appVersion:ctx.appVersion,occurredAt:meta.occurredAt||new Date().toISOString(),installMode:ctx.isInstalled()?'installed':'browser',platform:telemetryPlatform(navigator.userAgent)});
 if(!item)return null;
 const q=readQueue();if(q.some(x=>x.id===item.id))return item.id;
 q.push(item);writeQueue(q);return item.id;
}
export function trackTelemetry(event,meta={}){
 const id=queueTelemetry(event,meta);
 if(id&&meta.flush!==false)flushTelemetry();
 return id;
}
export function reconcileTelemetry(){
 if(!ctx||!telemetryActive()||typeof ctx.getState!=='function')return 0;
 let added=0;
 for(const m of buildTelemetryMilestones(ctx.getState()||{})){
  const before=readQueue().length;
  queueTelemetry(m.event,{id:m.id,occurredAt:m.occurredAt});
  if(readQueue().length>before)added++;
 }
 if(added)flushTelemetry();
 return added;
}
export async function flushTelemetry(){
 if(flushing||!ctx||!telemetryActive()||navigator.onLine===false)return;
 const q=readQueue();if(!q.length)return;
 flushing=true;const sent=q.slice(0,25);let again=false;
 try{
  const r=await fetch('/api/telemetry',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({events:sent}),cache:'no-store',keepalive:true});
  const body=await r.json().catch(()=>null);
  if(r.ok&&body?.ok===true&&Number(body.accepted)===sent.length&&Number(body.stored)===sent.length){
   const ids=new Set(sent.map(x=>x.id));acknowledge([...ids]);
   writeQueue(readQueue().filter(x=>!ids.has(x.id)));again=readQueue().length>0;
  }
 }catch{}finally{flushing=false;if(again)setTimeout(flushTelemetry,0)}
}
function ensureRetryTimer(){
 if(retryTimer||typeof setInterval!=='function')return;
 retryTimer=setInterval(()=>{reconcileTelemetry();flushTelemetry()},RETRY_MS);
 retryTimer?.unref?.();
}
export function setTelemetryEnabled(){
 if(telemetrySuppressed()){clearQueue();return}
 ensureRetryTimer();reconcileTelemetry();flushTelemetry();
}
export function startTelemetry(){
 if(!ctx)return;
 clearLegacyTelemetry();
 if(telemetrySuppressed()){clearQueue();return}
 ensureRetryTimer();
 try{if(!localStorage.getItem(FIRST)){localStorage.setItem(FIRST,'1');trackTelemetry('first_seen')}}catch{}
 trackTelemetry('app_open');reconcileTelemetry();flushTelemetry();
}
