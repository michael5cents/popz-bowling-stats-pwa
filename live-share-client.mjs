import {buildLiveSnapshot} from './live-share.mjs?v=39';

export const LIVE_STORAGE_KEY = 'popz-bowling-public-live-v1';
const LIFE = 12*60*60*1000;
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');

// One device owns one selected bowler's link. Credentials are device-local, never in backups/cloud sync.
// All requests serialize; every intent is persisted before networking. Local scoring never awaits this queue.
export function createLiveShareClient({storage,request,allowed,changed=()=>{},now=Date.now,makeToken=token}) {
  let record = null, running = null;
  try { record=JSON.parse(storage.getItem(LIVE_STORAGE_KEY)||'null'); } catch {}
  if (record && (!record.viewerToken || !record.publisherSecret || !record.snapshot || !record.sessionId)) record=null;
  const persist = () => {
    storage.setItem(LIVE_STORAGE_KEY,JSON.stringify(record));
    changed(record);
  };
  const mutate = fn => {
    const previous=record?structuredClone(record):null;
    try {fn();persist();} catch(e) {record=previous;throw e;}
  };
  const current = () => record ? structuredClone(record) : null;
  function reconcile(state,nameForSession) {
    if (!record || record.stopping || record.snapshot.finished || record.terminal) return;
    const session=state.sessions?.find(s=>s.id===record.sessionId);
    if (!session || !allowed()) {mutate(()=>{record.stopping=true;});return;}
    const snapshot=buildLiveSnapshot(session,nameForSession(session),!!session.finishedAt);
    if (JSON.stringify(snapshot)!==JSON.stringify(record.snapshot)) {
      mutate(()=>{record.snapshot=snapshot;record.revision++;});
    }
  }
  function start(session,name) {
    if (!allowed()) throw Error('Share Live Scores requires Popz Bowling Pro');
    if (!session || session.finishedAt) throw Error('Start a bowling series first');
    if (record) throw Error('Stop or clear the existing link before sharing another bowler');
    mutate(()=>{record={sessionId:session.id,viewerToken:makeToken(),publisherSecret:makeToken(),
      snapshot:buildLiveSnapshot(session,name),revision:1,ackRevision:0,createdAt:now(),
      expiresAt:now()+LIFE,stopping:false,created:false,error:''};});
  }
  function stop() {
    if (!record) return;
    if(record.terminal || record.expiresAt<=now()) {mutate(()=>{record=null;});return;}
    mutate(()=>{record.stopping=true;record.error='';});
  }
  async function drain() {
    while (record) {
      if (record.expiresAt<=now()) {
        mutate(()=>{record.terminal=true;record.error='Link expired. Clear it to start a new share.';});return;
      }
      if(record.terminal)return;
      if(!allowed()&&!record.stopping)mutate(()=>{record.stopping=true;});
      const sent=current();
      try {
        if(sent.stopping) {
          // DELETE is also required after an uncertain POST response: the server may have created the link.
          await request('DELETE',sent,null);
          mutate(()=>{record=null;});return;
        }
        const dirty=sent.ackRevision<sent.revision;
        if(sent.created&&!dirty&&(sent.snapshot.finished||now()-(sent.lastPushAt||0)<60000))return;
        const result=await request(sent.created?'PUT':'POST',sent,{snapshot:sent.snapshot,revision:sent.revision});
        mutate(()=>{
          record.created=true;record.ackRevision=sent.revision;record.lastPushAt=now();
          record.expiresAt=result.expiresAt;record.error='';
        });
        // Loop handles a roll, final result, or Stop queued while that request was in flight.
      } catch(e) {
        if([404,410].includes(e.status)) {
          if(record.stopping){mutate(()=>{record=null;});return;}
          mutate(()=>{record.terminal=true;record.error='This link has expired or been stopped.';});
        } else {
          mutate(()=>{record.error=record.stopping?'Stop pending — the link may still be visible. Reconnect to retry.':e.message||'Waiting for connection';});
        }
        return;
      }
    }
  }
  return {current,start,stop,reconcile,
    flush(){if(!running)running=drain().finally(()=>{running=null;});return running;}
  };
}
