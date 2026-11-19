(function(){
'use strict';
const $=id=>document.getElementById(id);
let deferredInstallPrompt=null;
const isInstalled=()=>{try{return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}catch{return false}};
const isProductionWebHost=()=>/^(?:www\.)?popzbowling\.com$/i.test(location.hostname);
const qaPhoneMode=()=>{try{const q=new URLSearchParams(location.search);return q.get('qa')==='1'&&q.get('phone')==='1'}catch{return false}};
const qaTabletMode=()=>{try{const q=new URLSearchParams(location.search);return q.get('qa')==='1'&&q.get('tablet')==='1'}catch{return false}};
const qaSimulatorMode=()=>qaPhoneMode()||qaTabletMode();
// This is an explicit separate iPad QA installation, not a normal customer PWA.
// Safari reads this manifest when the owner uses Add to Home Screen.  Its own
// start_url reopens with qa=1&tablet=1 so telemetry remains suppressed.
if(qaTabletMode()){
 const link=document.getElementById('popzAppManifest');
 if(link)link.href='./qa-tablet.webmanifest';
 const appleTitle=document.querySelector('meta[name="apple-mobile-web-app-title"]');
 if(appleTitle)appleTitle.content='Popz Bowling QA';
 document.title='Popz Bowling QA - iPad';
 const qaIndicator=document.getElementById('qaTabletIndicator');
 if(qaIndicator)qaIndicator.classList.remove('hidden');
 const telemetryBadge=[...document.querySelectorAll('#settingsView .version-badge')]
  .find(el=>el.textContent.trim()==='Beta telemetry: On');
 if(telemetryBadge)telemetryBadge.textContent='QA · telemetry off';
}

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
 if(/CriOS/i.test(ua))return notice('On iPad/iPhone using Chrome:\n1. Stay in Chrome on this page.\n2. Tap Chrome’s Share icon to the right of the address bar.\n3. Choose Add to Home Screen.\n4. Confirm Add on the final screen.\nThen find the icon on your Home Screen. For owner QA, open it and verify OWNER QA · TELEMETRY OFF. Do not score without that label.');
 if(/iphone|ipad|ipod/i.test(ua))return notice('On iPhone/iPad using Safari:\n1. Tap Share.\n2. Tap Add to Home Screen.\n3. Confirm Add.\nOpen the new Home Screen icon. For owner QA, verify OWNER QA · TELEMETRY OFF before scoring.');
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
 script.src='./app.js?v=39.021';
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