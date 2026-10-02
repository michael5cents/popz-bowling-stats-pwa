import {createLiveShareClient} from './live-share-client.mjs?v=39.007';
import {PRO_FEATURES} from './entitlements.mjs?v=39.007';

export function mountLiveShare({getState,getSession,nameForSession,hasFeature,getIdToken,toast,onContinue}) {
  const panel=document.createElement('section');
  panel.className='live-share-panel';panel.id='liveSharePanel';
  panel.innerHTML=`<button id="liveShareToggleBtn" class="live-share-toggle" type="button" aria-expanded="false">
      <span><strong>Share Live Scores</strong> <span class="pro-pill" data-pro-badge>PRO</span></span>
      <span id="liveShareToggleState" class="live-share-toggle-state">Open</span>
    </button>
    <div id="liveShareDetails" class="live-share-details hidden">
      <p class="fineprint"><strong>Live session only.</strong> This link follows the selected bowler's current series as it happens. It does not share the Stats screen, History, past series, backups, or other bowlers. Tap <strong>Start Sharing</strong>, then <strong>Share Link</strong> to choose Telegram, Google Messages, email, another compatible app, and the person you want to send it to.</p>
      <p id="liveShareStatus" class="live-share-status" role="status" aria-live="polite"></p>
      <div class="live-share-actions"><button id="startLiveShareBtn" class="primary" type="button">Start Sharing</button><button id="shareLiveLinkBtn" class="secondary hidden" type="button">Share Link</button><button id="retryLiveShareBtn" class="secondary hidden" type="button">Retry</button><button id="stopLiveShareBtn" class="danger hidden" type="button">Stop Sharing</button><button id="closeLiveShareBtn" class="text-button" type="button">Not Now</button></div>
      <label id="liveShareLinkLabel" class="hidden">Read-only spectator link<input id="liveShareLink" type="text" readonly autocomplete="off"></label>
      <p class="fineprint">Keep the scoring app open to send updates. Internet is needed to share, not to bowl. Links expire within 12 hours; final results remain available for up to 2 hours. Stop Sharing removes server access, but cannot erase screenshots or scores already seen.</p>
    </div>`;
  (document.getElementById('phoneScoringHeader')||document.getElementById('seriesSetup')).after(panel);
  const el=id=>panel.querySelector('#'+id);
  const allowed=()=>hasFeature(PRO_FEATURES.LIVE_SCORE_SHARING);
  let client,busy=false,timer,expanded=false;
  const url=r=>`${location.origin}/live/#${r.viewerToken}`;
  function render() {
    const r=client?.current(),s=getSession(),ready=r?.created&&!r.stopping&&!r.terminal;
    panel.classList.toggle('sharing',!!r&&!r.terminal);
    panel.classList.toggle('hidden',!s&&!r);
    el('liveShareDetails').classList.toggle('hidden',!expanded);
    el('liveShareToggleBtn').setAttribute('aria-expanded',String(expanded));
    const toggleState=r?(r.terminal?'Expired':r.stopping?'Stopping':!r.created?'Starting':r.snapshot.finished?'Final':'LIVE'):(expanded?'Close':'Open');
    el('liveShareToggleState').textContent=toggleState;
    el('liveShareToggleState').classList.toggle('live',!!r?.created&&!r.stopping&&!r.terminal&&!r.snapshot.finished);
    el('startLiveShareBtn').classList.toggle('hidden',!!r);
    el('startLiveShareBtn').disabled=busy||!allowed()||!s;
    el('startLiveShareBtn').textContent=s?`Share ${nameForSession(s)}'s Live Scores`:'Start a Series to Share Live Scores';
    el('shareLiveLinkBtn').classList.toggle('hidden',!ready);
    el('liveShareLinkLabel').classList.toggle('hidden',!ready);
    el('liveShareLink').value=ready?url(r):'';
    el('retryLiveShareBtn').classList.toggle('hidden',!r||r.terminal||!r.error);
    el('stopLiveShareBtn').classList.toggle('hidden',!r);
    el('stopLiveShareBtn').disabled=busy||!!r?.stopping;
    el('stopLiveShareBtn').textContent=r?.terminal?'Clear Expired Link':r?.stopping?'Stop Pending':'Stop Sharing';
    el('closeLiveShareBtn').textContent=r?'Hide':'Not Now';
    el('liveShareStatus').textContent=r?(r.error||(r.stopping?'Stopping…':!r.created?'Starting…':r.snapshot.finished?(r.ackRevision<r.revision?'Final scores waiting to send':'Final results shared'):`Sharing ${r.snapshot.bowlerName} • ${r.ackRevision<r.revision?'sending latest score':'link ready'}`)):
      allowed()?'Off — nothing is shared until you choose Start Sharing. In team mode, select the bowler you want to share first.':'Requires Popz Bowling Pro. Normal scoring stays free.';
  }
  client=createLiveShareClient({storage:{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)},allowed,changed:render,request:async(method,r,body)=>{
    if(navigator.onLine===false)throw Error('Offline — scores saved locally. Sharing will retry when online.');
    const headers={'Content-Type':'application/json','Authorization':`Bearer ${r.publisherSecret}`};
    if(method==='POST'){const idToken=await getIdToken();if(idToken)headers['X-Firebase-Token']=idToken;}
    const response=await fetch('/api/live/'+r.viewerToken,{method,headers,cache:'no-store',signal:AbortSignal.timeout(8000),body:body?JSON.stringify(body):undefined});
    const data=await response.json();
    if(!response.ok){const error=Error(data.error||'Live sharing unavailable');error.status=response.status;throw error;}
    return data;
  }});
  const flush=()=>client.flush().catch(()=>toast('Live-sharing settings could not be saved. Scores are still on this device.'));
  function saved() {
    try{client.reconcile(getState(),nameForSession);render();clearTimeout(timer);timer=setTimeout(flush,150);}
    catch{toast('Live sharing could not update. Local scoring is unaffected.');}
  }
  function continueToScoring(){if(getSession())onContinue?.();}
  el('liveShareToggleBtn').onclick=()=>{expanded=!expanded;render();};
  el('closeLiveShareBtn').onclick=()=>{expanded=false;render();continueToScoring();};
  el('startLiveShareBtn').onclick=async()=>{
    if(busy)return;busy=true;expanded=true;
    try{client.start(getSession(),nameForSession(getSession()));render();await flush();saved();}
    catch(e){toast(e.message);}finally{busy=false;render();}
  };
  el('stopLiveShareBtn').onclick=async()=>{
    if(busy)return;busy=true;
    try{client.stop();render();await flush();if(!client.current())expanded=false;}catch(e){toast(e.message);}finally{busy=false;render();}
  };
  el('retryLiveShareBtn').onclick=()=>{saved();};
  el('shareLiveLinkBtn').onclick=async()=>{
    const r=client.current();if(!r?.created||r.stopping||r.terminal)return;
    const link=url(r);
    try{if(navigator.share){await navigator.share({title:`${r.snapshot.bowlerName}'s live bowling scores`,url:link});expanded=false;render();continueToScoring();return;}}
    catch(e){if(e.name==='AbortError')return;}
    try{await navigator.clipboard.writeText(link);toast('Spectator link copied');}
    catch{el('liveShareLink').focus();el('liveShareLink').select();toast('Select and copy the spectator link');}
  };
  window.addEventListener('online',saved);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)saved();});
  setInterval(()=>{if(!document.hidden)saved();},15000);
  saved();return {saved,render};
}
