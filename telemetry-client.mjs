import{normalizeTelemetryEvent,telemetryPlatform}from'./telemetry.mjs';
const QUEUE='popz-bowling-telemetry-queue-v1',ENABLED='popz-bowling-telemetry-enabled-v1',FIRST='popz-bowling-telemetry-first-v1';
let ctx=null,flushing=false;
const read=()=>{try{const q=JSON.parse(localStorage.getItem(QUEUE)||'[]');return Array.isArray(q)?q:[]}catch{return[]}};
const write=q=>{try{localStorage.setItem(QUEUE,JSON.stringify(q.slice(-200)))}catch{}};
export const telemetryEnabled=()=>{try{return localStorage.getItem(ENABLED)!=='off'}catch{return true}};
export function setTelemetryEnabled(on){try{localStorage.setItem(ENABLED,on?'on':'off');if(!on)localStorage.removeItem(QUEUE)}catch{};if(on)flushTelemetry()}
export function configureTelemetry(config){ctx=config}
export function trackTelemetry(event){
 if(!ctx||!telemetryEnabled())return;
 const id='evt-'+(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2));
 const item=normalizeTelemetryEvent({id,deviceId:ctx.deviceId,event,appVersion:ctx.appVersion,occurredAt:new Date().toISOString(),installMode:ctx.isInstalled()?'installed':'browser',platform:telemetryPlatform(navigator.userAgent)});
 if(!item)return;const q=read();q.push(item);write(q);flushTelemetry();
}
export async function flushTelemetry(){
 if(flushing||!ctx||!telemetryEnabled()||navigator.onLine===false)return;const q=read();if(!q.length)return;
 flushing=true;const sent=q.slice(0,25);let again=false;
 try{const r=await fetch('/api/telemetry',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({events:sent}),cache:'no-store',keepalive:true});if(r.ok){const ids=new Set(sent.map(x=>x.id));write(read().filter(x=>!ids.has(x.id)));again=read().length>0}}catch{}finally{flushing=false;if(again)setTimeout(flushTelemetry,0)}
}
export function startTelemetry(){
 if(!ctx||!telemetryEnabled())return;
 try{if(!localStorage.getItem(FIRST)){localStorage.setItem(FIRST,'1');trackTelemetry('first_seen')}}catch{}
 trackTelemetry('app_open');flushTelemetry();
}
