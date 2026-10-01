import {PRO_PREVIEW_ENABLED,entitlementIsActive} from './entitlements.mjs';

export const ACTIVE_TTL=12*60*60*1000, FINAL_TTL=2*60*60*1000;
const TOKEN=/^[a-f0-9]{64}$/;
const HEADERS={'Content-Type':'application/json','Cache-Control':'no-store, max-age=0',
  'X-Robots-Tag':'noindex, nofollow, noarchive','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:HEADERS});
const fail=(status,message)=>Object.assign(Error(message),{status});
const text=v=>typeof v==='string'?v.trim().slice(0,120):'';
const number=(v,min,max,nullable=false)=>{
  if(nullable&&v==null)return null;
  if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw fail(400,'Invalid score snapshot');
  return v;
};
export async function hash(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');
}
export function sanitizeLiveSnapshot(raw) {
  if(!raw||raw.schemaVersion!==2||!Array.isArray(raw.games)||raw.games.length<1||raw.games.length>12||typeof raw.finished!=='boolean')throw fail(400,'Invalid score snapshot');
  const games=raw.games.map((g,i)=>{
    if(!g||!Array.isArray(g.frames)||g.frames.length!==10)throw fail(400,'Invalid game');
    return {gameNumber:i+1,complete:g.complete===true,score:number(g.score,0,300),frames:g.frames.map((f,j)=>{
      if(!f||!Array.isArray(f.marks)||f.marks.length!==(j===9?3:2)||f.marks.some(v=>!['','-','X','/','0','1','2','3','4','5','6','7','8','9'].includes(v)))throw fail(400,'Invalid frame');
      return {marks:[...f.marks],cumulative:number(f.cumulative,0,300,true)};
    })};
  });
  let finalStats=null;
  if(raw.finished) {
    const s=raw.finalStats;if(!s)throw fail(400,'Final statistics missing');
    finalStats={};
    for(const [key,max] of Object.entries({games:12,seriesTotal:3600,average:300,highGame:300,handicapPerGame:1000,handicapSeries:15600,strikePct:100,sparePct:100,splitPct:100,singlePinPct:100,tenPinPct:100}))finalStats[key]=number(s[key],0,max,true);
  }
  return {schemaVersion:2,bowlerName:text(raw.bowlerName)||'Bowler',league:text(raw.league),seriesName:text(raw.seriesName),date:text(raw.date),
    gameNumber:number(raw.gameNumber,1,12),gameCount:number(raw.gameCount,1,12),games,currentScore:number(raw.currentScore,0,300),
    currentBall:text(raw.currentBall),seriesScratch:number(raw.seriesScratch,0,3600),finalStats,finished:raw.finished};
}

// Server-controlled preview, or a verified Firebase identity and owner-readable entitlement.
// Never trust a client-provided plan or merely decode an unsigned JWT.
export async function authorizeLiveCreate(request,env,fetcher=fetch) {
  if(PRO_PREVIEW_ENABLED && env.LIVE_SHARE_PREVIEW==='true')return true;
  const idToken=request.headers.get('X-Firebase-Token');
  if(!idToken||!env.LIVE_FIREBASE_WEB_API_KEY)return false;
  const auth=await fetcher('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(env.LIVE_FIREBASE_WEB_API_KEY),{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken}),signal:AbortSignal.timeout(5000)});
  if(!auth.ok)return false;
  const uid=(await auth.json()).users?.[0]?.localId;if(!uid)return false;
  const doc=await fetcher('https://firestore.googleapis.com/v1/projects/popz-bowling-stats/databases/(default)/documents/users/'+encodeURIComponent(uid)+'/entitlements/pro',{
    headers:{Authorization:'Bearer '+idToken},signal:AbortSignal.timeout(5000)});
  if(!doc.ok)return false;
  const fields=(await doc.json()).fields||{};
  const entitlement=Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,value.stringValue??value.timestampValue??null]));
  return entitlementIsActive(entitlement);
}

async function readBody(request) {
  const reader=request.body?.getReader();if(!reader)throw fail(400,'Missing snapshot');
  let size=0;const parts=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();throw fail(413,'Snapshot too large');}parts.push(value);}
  try{return JSON.parse(await new Blob(parts).text());}catch{throw fail(400,'Invalid JSON');}
}

async function limitNewRecord(db,request,now) {
  // No raw IP is retained. Both link creation and unknown-token Stop tombstones are bounded.
  const bucket=await hash(Math.floor(now/3600000)+':'+(request.headers.get('CF-Connecting-IP')||'local'));
  await db.prepare('DELETE FROM live_create_limits WHERE expires_at <= ?').bind(now).run();
  const limit=await db.prepare(`INSERT INTO live_create_limits (bucket,count,expires_at) VALUES (?,1,?)
    ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count`).bind(bucket,now+3600000).first();
  if(limit.count>30)throw fail(429,'Too many new links. Please try again later.');
  await db.prepare('DELETE FROM live_shares WHERE expires_at <= ?').bind(now-ACTIVE_TTL).run();
}

export async function handleLiveRequest({request,env,params},options={}) {
  const now=options.now??Date.now(),authorize=options.authorize??authorizeLiveCreate;
  try {
    const token=params.token,method=request.method,db=env.LIVE_SHARE_DB;
    if(!TOKEN.test(token||''))throw fail(404,'Link unavailable');
    if(!['GET','POST','PUT','DELETE'].includes(method))throw fail(405,'Method not allowed');
    if(!db)throw fail(503,'Live sharing is not configured yet. Your local scores are unaffected.');
    const origin=request.headers.get('Origin');
    if(method!=='GET'&&origin&&origin!==new URL(request.url).origin)throw fail(403,'Origin not allowed');
    let row=await db.prepare('SELECT * FROM live_shares WHERE token = ?').bind(token).first();
    if(method==='GET') {
      if(!row)throw fail(404,'This link is unavailable');
      if(row.status==='stopped'||row.expires_at<=now)throw fail(410,'This link has stopped or expired');
      if(!row.snapshot)throw fail(503,'This link is starting. Please retry.');
      return reply({status:row.status,updatedAt:new Date(row.updated_at).toISOString(),expiresAt:row.expires_at,snapshot:JSON.parse(row.snapshot)});
    }
    const secret=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
    if(!TOKEN.test(secret))throw fail(403,'Publisher authorization required');
    const secretHash=await hash(secret);
    if(row&&row.secret_hash!==secretHash)throw fail(403,'Publisher authorization required');
    if(method==='DELETE') {
      if(!row)await limitNewRecord(db,request,now);
      // A tombstone also blocks a timed-out creation request arriving AFTER Stop.
      await db.prepare(`INSERT INTO live_shares (token,secret_hash,status,snapshot,revision,created_at,updated_at,expires_at)
        VALUES (?,?,'stopped',NULL,0,?,?,?) ON CONFLICT(token) DO UPDATE SET status='stopped',snapshot=NULL,updated_at=excluded.updated_at
        WHERE live_shares.secret_hash=excluded.secret_hash`).bind(token,secretHash,now,now,now+ACTIVE_TTL).run();
      return reply({stopped:true});
    }
    if(row&&(row.status==='stopped'||row.expires_at<=now))throw fail(410,'This link has stopped or expired');
    if(method==='PUT'&&!row)throw fail(404,'Link unavailable');
    const body=await readBody(request),snapshot=sanitizeLiveSnapshot(body.snapshot),revision=body.revision;
    if(!Number.isSafeInteger(revision)||revision<1)throw fail(400,'Invalid revision');
    if(method==='POST'&&!row) {
      if(!await authorize(request,env))throw fail(403,'Share Live Scores requires Popz Bowling Pro');
      await limitNewRecord(db,request,now);
      await db.prepare(`INSERT INTO live_shares (token,secret_hash,status,snapshot,revision,created_at,updated_at,expires_at)
        VALUES (?,?,'active',NULL,0,?,?,?) ON CONFLICT(token) DO NOTHING`).bind(token,secretHash,now,now,now+ACTIVE_TTL).run();
      row=await db.prepare('SELECT * FROM live_shares WHERE token = ?').bind(token).first();
      if(row.secret_hash!==secretHash)throw fail(403,'Publisher authorization required');
    }
    const expires=Math.min(row.created_at+ACTIVE_TTL,snapshot.finished?now+FINAL_TTL:row.expires_at);
    await db.prepare(`UPDATE live_shares SET snapshot=?,status=?,revision=?,updated_at=?,expires_at=?
      WHERE token=? AND secret_hash=? AND status='active' AND expires_at>? AND revision<=?`).bind(
      JSON.stringify(snapshot),snapshot.finished?'final':'active',revision,now,expires,token,secretHash,now,revision).run();
    row=await db.prepare('SELECT * FROM live_shares WHERE token = ?').bind(token).first();
    if(row.status==='stopped'||row.expires_at<=now)throw fail(410,'This link has stopped or expired');
    if(row.revision!==revision)throw fail(409,'A newer or final score is already published');
    return reply({expiresAt:row.expires_at,revision:row.revision});
  } catch(e) {return reply({error:e.status?e.message:'Live sharing is temporarily unavailable'},e.status||503);}
}
