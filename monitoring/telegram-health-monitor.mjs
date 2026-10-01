#!/usr/bin/env node
import fs from'node:fs';
import path from'node:path';
import{issueKey,alertCooldownFor,shouldSendAlert}from'./alert-policy.mjs';

const BASE=(process.env.BOWLING_URL||'https://popzbowling.com').replace(/\/$/,'');
const BOT=process.env.TELEGRAM_BOT_TOKEN||'';
const CHAT=process.env.TELEGRAM_CHAT_ID||'';
const STATE=process.env.BOWLING_MONITOR_STATE||path.join(process.env.HOME||'.','.local/state/popz-bowling-health/state.json');
const COOLDOWN=Math.max(5,Number(process.env.BOWLING_ALERT_COOLDOWN_MINUTES||15))*60000;
const RUNTIME_COOLDOWN=Math.max(60,Number(process.env.BOWLING_RUNTIME_ALERT_COOLDOWN_MINUTES||60))*60000;
const TIMEOUT=Math.max(5,Number(process.env.BOWLING_HTTP_TIMEOUT_SECONDS||15))*1000;
const UA='Popz-Bowling-Health-Monitor/1.0';

const nowCt=()=>new Date().toLocaleString('en-US',{timeZone:'America/Chicago',dateStyle:'medium',timeStyle:'medium'});
const compact=v=>String(v??'').replace(/\s+/g,' ').trim().slice(0,400);

function loadState(){
 try{return JSON.parse(fs.readFileSync(STATE,'utf8'))}catch{return{lastIssues:[],lastAlertAt:0}}
}
function saveState(state){
 fs.mkdirSync(path.dirname(STATE),{recursive:true});
 const tmp=STATE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(state,null,2),{mode:0o600});fs.renameSync(tmp,STATE);
}
async function request(url,{json=false}={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),TIMEOUT);
 try{
  const res=await fetch(url,{headers:{'user-agent':UA,'cache-control':'no-cache'},cache:'no-store',signal:controller.signal});
  const body=await res.text();
  return{ok:res.ok,status:res.status,body,data:json?JSON.parse(body):null};
 }finally{clearTimeout(timer)}
}
async function sendTelegram(text){
 if(!BOT||!CHAT)throw Error('Telegram bot/chat is not configured');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),TIMEOUT);
 try{
  const res=await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`,{
   method:'POST',headers:{'content-type':'application/json'},signal:controller.signal,
   body:JSON.stringify({chat_id:CHAT,text,disable_web_page_preview:true})
  });
  if(!res.ok)throw Error(`Telegram HTTP ${res.status}: ${compact(await res.text())}`);
  return true;
 }finally{clearTimeout(timer)}
}
const add=(issues,name,message)=>issues.push({name,message:compact(message)});

async function runChecks(){
 const issues=[];let version='',n='';
 try{
  const r=await request(BASE+'/latest-version.json',{json:true});
  if(!r.ok)add(issues,'Version endpoint',`HTTP ${r.status}`);
  else if(!/^public-v\d+$/.test(String(r.data?.version||'')))add(issues,'Version endpoint','invalid version payload');
  else{version=String(r.data.version);n=version.replace('public-v','')}
 }catch(e){add(issues,'Version endpoint',e.message)}

 try{
  const r=await request(BASE+'/');
  if(!r.ok)add(issues,'Homepage',`HTTP ${r.status}`);
  else if(version&&(!r.body.includes(`runtime-monitor.js?v=${n}`)||!r.body.includes(`app.js?v=${n}`)))add(issues,'Homepage','critical asset references do not match '+version);
 }catch(e){add(issues,'Homepage',e.message)}

 if(version){
  for(const [label,url,needle]of[
   ['Runtime monitor',`${BASE}/runtime-monitor.js?v=${n}`,'boot_started'],
   ['Main app',`${BASE}/app.js?v=${n}`,`APP_VERSION='${version}'`],
   ['Service worker',BASE+'/service-worker.js',version]
  ]){
   try{const r=await request(url);if(!r.ok)add(issues,label,`HTTP ${r.status}`);else if(!r.body.includes(needle))add(issues,label,`missing expected ${needle}`)}
   catch(e){add(issues,label,e.message)}
  }
 }
 try{
  const r=await request(BASE+'/api/health',{json:true});
  if(!r.ok)add(issues,'Health API',`HTTP ${r.status}`);
  else{
   const h=r.data||{};
   if(h.ok!==true||h.status!=='ok')add(issues,'Health API',`status=${h.status||'unknown'} ok=${String(h.ok)}`);
   if(version&&h.version!==version)add(issues,'Health API',`version ${h.version||'missing'} != ${version}`);
   for(const key of['telemetry','liveSharing','runtime'])if(h.checks?.[key]!==true)add(issues,'Health dependency',key+' is unhealthy');
   if(h.runtime?.recentErrors)add(issues,'Runtime errors','recent client runtime error reported');
   if(h.runtime?.recentStartupFailures)add(issues,'Startup failures','recent client boot failed to reach app_ready');
  }
 }catch(e){add(issues,'Health API',e.message)}
 return{issues,version:version||'unknown'};
}

function alertText(version,issues){
 return ['🚨 POPZ BOWLING ALERT',`Version: ${version}`,'',...issues.map(x=>`❌ ${x.name}: ${x.message}`),'',`Time: ${nowCt()}`].join('\n');
}
function recoveryText(version,prior){
 return ['✅ POPZ BOWLING RECOVERED',`Version: ${version}`,'','Production checks are healthy again.',prior.length?`Resolved: ${prior.map(x=>x.name).join(', ')}`:'','',`Time: ${nowCt()}`].filter(Boolean).join('\n');
}

if(process.argv.includes('--test-notification')){
 await sendTelegram(['✅ POPZ BOWLING MONITOR TEST','Telegram health alerts are configured and working.','',`Time: ${nowCt()}`].join('\n'));
 console.log('Telegram test notification sent');
 process.exit(0);
}
const state=loadState(),{issues,version}=await runChecks(),now=Date.now();

if(issues.length){
 const shouldAlert=shouldSendAlert({issues,lastIssues:state.lastIssues||[],lastAlertAt:state.lastAlertAt||0,now,normalCooldown:COOLDOWN,runtimeCooldown:RUNTIME_COOLDOWN});
 if(shouldAlert){
  try{
   await sendTelegram(alertText(version,issues));
   state.lastIssues=issues;state.lastAlertAt=now;state.lastVersion=version;saveState(state);
   console.log(`ALERT sent: ${issues.length} issue(s)`);
  }catch(e){console.error('ALERT send failed:',e.message);process.exitCode=1}
 }else console.log(`Unhealthy: ${issues.length} issue(s); cooldown active (${Math.round(alertCooldownFor(issues,COOLDOWN,RUNTIME_COOLDOWN)/60000)}m)`);
}else if((state.lastIssues||[]).length){
 try{
  await sendTelegram(recoveryText(version,state.lastIssues));
  state.lastIssues=[];state.lastAlertAt=0;state.lastVersion=version;saveState(state);
  console.log('RECOVERY sent');
 }catch(e){console.error('RECOVERY send failed:',e.message);process.exitCode=1}
}else{
 state.lastVersion=version;saveState(state);console.log(`Healthy: ${version}`);
}
