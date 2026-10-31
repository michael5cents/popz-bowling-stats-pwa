(function(){
'use strict';
const ENDPOINT='/api/runtime',QUEUE_KEY='popz-bowling-runtime-queue-v2',RID_KEY='popz-bowling-runtime-id-v1',LEGACY_QUEUE_KEY='popz-bowling-runtime-queue-v1',MAX_QUEUE=60;
let memoryQueue=[],ready=false,flushing=false;
const qa=()=>{
 try{const q=new URLSearchParams(location.search);if(q.get('qa')==='1')return true}catch{}
 try{if(navigator.webdriver===true||/HeadlessChrome/i.test(navigator.userAgent||''))return true}catch{}
 return false;
};
const randomId=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const getRuntimeId=()=>{
 try{let id=localStorage.getItem(RID_KEY);if(!id){id='run-'+randomId();localStorage.setItem(RID_KEY,id)}return id}catch{return'run-'+randomId()}
};
try{localStorage.removeItem(LEGACY_QUEUE_KEY);localStorage.removeItem('popz-bowling-telemetry-enabled-v1')}catch{}
const runtimeId=getRuntimeId(),bootId='boot-'+randomId(),appVersion=document.querySelector('meta[name="popz-app-version"]')?.content||'unknown';
const platform=()=>{const x=(navigator.userAgent||'').toLowerCase();if(/android/.test(x))return'android';if(/iphone|ipad|ipod/.test(x))return'ios';if(/windows/.test(x))return'windows';if(/macintosh|mac os/.test(x))return'mac';if(/linux/.test(x))return'linux';return'other'};
const installed=()=>{try{return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}catch{return false}};
const CRITICAL_RESOURCES=new Set(['entry.js','app.js','style.css']);
const criticalResource=v=>{try{const u=new URL(String(v||''),location.href),name=u.pathname.split('/').pop()||'';return u.origin===location.origin&&CRITICAL_RESOURCES.has(name)}catch{return false}};
const clean=(v,n=180)=>String(v??'').replace(/\s+/g,' ').replace(/https?:\/\/[^\s]+/gi,'[url]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/\b[a-f0-9]{32,}\b/gi,'[token]').trim().slice(0,n);
const sourceName=v=>{try{return(new URL(String(v||''),location.href).pathname.split('/').pop()||'').slice(0,100)}catch{return clean(v,100)}};
const readQueue=()=>{try{const x=JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]');return Array.isArray(x)?x:[...memoryQueue]}catch{return[...memoryQueue]}};
const writeQueue=q=>{memoryQueue=q.slice(-MAX_QUEUE);try{localStorage.setItem(QUEUE_KEY,JSON.stringify(memoryQueue))}catch{}};
const clearQueue=()=>{memoryQueue=[];try{localStorage.removeItem(QUEUE_KEY)}catch{}};
function enqueue(event,extra={}){
 if(qa())return;
 const q=readQueue(),item={id:'rte-'+randomId(),runtimeId,bootId,event,appVersion,occurredAt:new Date().toISOString(),installMode:installed()?'installed':'browser',platform:platform(),
  errorKind:clean(extra.errorKind,48),errorMessage:clean(extra.errorMessage,180),source:sourceName(extra.source),line:Number(extra.line||0),col:Number(extra.col||0)};
 q.push(item);writeQueue(q);flush();
}
async function flush(){
 if(flushing||qa()||navigator.onLine===false)return;
 const q=readQueue();if(!q.length)return;flushing=true;const sent=q.slice(0,20);
 try{
  const r=await fetch(ENDPOINT,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({events:sent}),cache:'no-store',keepalive:true});
  const body=await r.json().catch(()=>null);
  if(r.ok&&body?.ok===true&&Number(body.accepted)===sent.length){
   const ids=new Set(sent.map(x=>x.id));writeQueue(readQueue().filter(x=>!ids.has(x.id)));
   if(readQueue().length)setTimeout(flush,0);
  }
 }catch{}finally{flushing=false}
}
window.addEventListener('error',e=>{
 const target=e.target;
 if(target&&target!==window){
  const tag=String(target.tagName||'').toUpperCase(),rel=String(target.rel||'').toLowerCase(),source=target.src||target.href;
  if((tag==='SCRIPT'||(tag==='LINK'&&rel.includes('stylesheet')))&&criticalResource(source))enqueue('resource_error',{errorKind:tag==='SCRIPT'?'script_load':'stylesheet_load',errorMessage:'Critical application resource failed to load',source});
  return;
 }
 const message=e.message||e.error?.message||'Unhandled application error',source=e.filename||'',line=Number(e.lineno||0),col=Number(e.colno||0);
 if(message==='Script error.'&&!source&&!line&&!col)return;
 if(!installed()&&platform()==='android'&&message.includes('Error invoking postMessage: Java object is gone')&&!source)return;
 enqueue('window_error',{errorKind:e.error?.name||'Error',errorMessage:message,source,line,col});
},true);
window.addEventListener('unhandledrejection',e=>enqueue('unhandled_rejection',{errorKind:e.reason?.name||'PromiseRejection',errorMessage:e.reason?.message||e.reason||'Unhandled promise rejection'}));
window.addEventListener('online',flush);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)flush()});
function showLoadFailure(){
 if(ready||qa())return;
 let el=document.getElementById('popzLoadFailure');if(el)return;
 el=document.createElement('div');el.id='popzLoadFailure';el.setAttribute('role','alert');
 el.style.cssText='position:fixed;z-index:99999;inset:18px 18px auto;background:#7f1d1d;color:white;border:1px solid #fecaca;border-radius:14px;padding:16px;font:600 15px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.35)';
 el.innerHTML='<strong>Popz Bowling did not finish loading.</strong><div style="margin-top:6px;font-weight:400">Your saved bowling data has not been erased. Close the app completely and reopen it while online. A privacy-safe startup report was sent automatically when diagnostics are enabled.</div>';
 (document.body||document.documentElement).appendChild(el);
}
window.PopzRuntimeMonitor={
 ready(){if(ready)return;ready=true;document.getElementById('popzLoadFailure')?.remove();enqueue('app_ready')},
 setEnabled(){flush()},
 flush
};
enqueue('boot_started');
setTimeout(showLoadFailure,8000);
setTimeout(flush,1500);
})();
