// Standalone read-only viewer: no Firebase, telemetry, IndexedDB, or app service worker registration.
const token=location.hash.slice(1),$=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const pct=v=>v==null?'—':Number(v).toFixed(1)+'%';
let timer=null,inFlight=false,terminal=false,rendered=false,expiresAt=0,finished=false;
function boards(games) {
  return games.map(g=>`<section class="game-panel"><div class="game-heading"><strong>Game ${esc(g.gameNumber)}</strong><span>${g.complete?'Final':'In progress'} ${esc(g.score)}</span></div><div class="frames">${g.frames.map((f,i)=>`<div class="frame"><div class="frame-no">${i+1}</div><div class="rolls">${f.marks.map(mark=>`<div class="roll">${esc(mark)}</div>`).join('')}</div><div class="cum">${esc(f.cumulative)}</div></div>`).join('')}</div></section>`).join('');
}
function clear(message) {
  terminal=true;clearTimeout(timer);$('live').classList.add('hidden');$('message').classList.remove('hidden');$('message').textContent=message;
  // Remove already-rendered scores from the DOM on confirmed revocation/expiry.
  $('gameBoards').replaceChildren();$('finalGrid').replaceChildren();
  for(const id of ['bowler','meta','score','series','ball','gameNo','updated'])$(id).textContent='';
}
function render(data) {
  const s=data.snapshot;finished=data.status==='final';expiresAt=data.expiresAt;rendered=true;
  $('message').classList.add('hidden');$('live').classList.remove('hidden');
  $('bowler').textContent=s.bowlerName;
  $('meta').textContent=[s.date,s.league,s.seriesName].filter(Boolean).join(' • ');
  $('gameNo').textContent=`${s.gameNumber} / ${s.gameCount}`;
  $('score').textContent=s.currentScore;$('series').textContent=s.seriesScratch;$('ball').textContent=s.currentBall||'—';
  const waiting=Date.now()-Date.parse(data.updatedAt)>90000;
  $('status').textContent=finished?'FINAL':waiting?'WAITING':'LIVE';
  $('status').className='badge '+(finished?'final':waiting?'stale':'');
  $('gameBoards').innerHTML=boards(s.games);
  $('finalSummary').classList.toggle('hidden',!finished);
  if(finished&&s.finalStats) {
    const st=s.finalStats;
    const metrics=[['Games',st.games],['Scratch',st.seriesTotal],['Average',st.average==null?'—':Number(st.average).toFixed(1)],['High Game',st.highGame],['HDCP Series',st.handicapSeries],['Strike %',pct(st.strikePct)],['Spare %',pct(st.sparePct)],['Split Conv %',pct(st.splitPct)],['Single Pin %',pct(st.singlePinPct)],['10-Pin %',pct(st.tenPinPct)]];
    $('finalGrid').innerHTML=metrics.map(([label,value])=>`<div class="metric"><span>${esc(label)}</span><strong>${esc(value??'—')}</strong></div>`).join('');
  }
  $('updated').textContent=`${finished?'Series complete. ':''}Last received ${new Date(data.updatedAt).toLocaleTimeString()} • link expires ${new Date(expiresAt).toLocaleTimeString()}`;
}
async function poll() {
  if(terminal||inFlight)return;
  clearTimeout(timer);
  if(!/^[a-f0-9]{64}$/.test(token)){clear('This spectator link is incomplete. Ask the bowler to share it again.');return;}
  if(expiresAt&&expiresAt<=Date.now()){clear('This link has expired.');return;}
  inFlight=true;
  try {
    const response=await fetch('/api/live/'+token,{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(8000)});
    if([404,410].includes(response.status)){clear('This link has stopped or expired.');return;}
    if(!response.ok)throw Error('Live scores are temporarily unavailable. Retrying…');
    render(await response.json());
  } catch {
    if(rendered){$('status').textContent='WAITING';$('status').className='badge stale';$('updated').textContent='Connection interrupted — showing the last received scores.';}
    else $('message').textContent='Unable to connect. Retrying…';
  } finally {
    inFlight=false;
    if(!terminal)timer=setTimeout(poll,document.hidden?30000:finished?15000:3000);
  }
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});
window.addEventListener('online',poll);
poll();
