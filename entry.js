(function(){
'use strict';
const $=id=>document.getElementById(id);
let deferredInstallPrompt=null;
const isInstalled=()=>{try{return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}catch{return false}};
const isProductionWebHost=()=>/^(?:www\.)?popzbowling\.com$/i.test(location.hostname);
const qaPhoneMode=()=>{try{const q=new URLSearchParams(location.search);return q.get('qa')==='1'&&q.get('phone')==='1'}catch{return false}};
const qaTabletMode=()=>{try{const q=new URLSearchParams(location.search);return q.get('qa')==='1'&&q.get('tablet')==='1'}catch{return false}};
const qaSimulatorMode=()=>qaPhoneMode()||qaTabletMode();
const installGateRequired=()=>isProductionWebHost()&&!isInstalled()&&!qaSimulatorMode();
function setHelp(message=''){const el=$('installGateHelp');if(!el)return;el.textContent=message;el.classList.toggle('hidden',!message)}
function showGate(){document.body.classList.remove('install-check');document.body.classList.add('install-required');$('installGate')?.classList.remove('hidden');setHelp('')}
function releaseGate(){document.body.classList.remove('install-check','install-required')}
function updateInstallButton(){const b=$('installGateBtn');if(b&&!b.disabled)b.textContent='Install Popz Bowling'}
function notice(message){setHelp(message)}
async function installApp(){
 if(deferredInstallPrompt){
  const prompt=deferredInstallPrompt;deferredInstallPrompt=null;prompt.prompt();
  const choice=await prompt.userChoice;
  if(choice.outcome==='accepted')notice('Installation accepted. When it finishes, open Popz Bowling from your Home Screen or app launcher.');
  else notice('Install canceled. Tap Install Popz Bowling whenever you are ready.');
  updateInstallButton();return;
 }
 const ua=navigator.userAgent||'';
 if(/iphone|ipad|ipod/i.test(ua))return notice('On iPhone/iPad:\n1. Open this page in Safari.\n2. Tap Share.\n3. Tap Add to Home Screen.\n4. Tap Add.\nThen open Popz Bowling from the new Home Screen icon.');
 if(/android/i.test(ua))return notice('On Android, open this page in Chrome. If the install prompt is not ready yet, use Chrome menu > Install app / Add to Home screen, then open Popz Bowling from your Home Screen.');
 notice('Use your browser’s Install App / Add to Home Screen option, then launch Popz Bowling from the installed app icon.');
}
async function prepareInstallability(){
 if(!('serviceWorker'in navigator)||!window.isSecureContext)return;
 try{const reg=await navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'});reg.update().catch(()=>{})}catch{}
}
function loadApp(){
 const script=document.createElement('script');
 script.type='module';
 script.src='./app.js?v=39.013';
 document.body.appendChild(script);
}
if(installGateRequired()){
 showGate();
 $('installGateBtn')?.addEventListener('click',installApp);
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;updateInstallButton()});
 window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;const b=$('installGateBtn');if(b)b.classList.add('hidden');notice('Popz Bowling is installed. Open it from your Home Screen or app launcher.')});
 prepareInstallability();
 window.PopzRuntimeMonitor?.ready();
 return;
}
releaseGate();
loadApp();
})();