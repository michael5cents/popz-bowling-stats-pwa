import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleLiveRequest,authorizeLiveCreate,sanitizeLiveSnapshot,ACTIVE_TTL,FINAL_TTL} from '../live-share-server.mjs';
import {buildLiveSnapshot} from '../live-share.mjs';
import {emptyFrames,addRoll} from '../scoring.mjs';
const token='a'.repeat(64),secret='b'.repeat(64),wrong='c'.repeat(64),start=100000;
const session={id:'s',games:[{frames:emptyFrames()}]};
const snapshot=()=>buildLiveSnapshot(session,'Michael');
function fixture() {
  const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../live-migrations/0001_live_shares.sql',import.meta.url),'utf8'));
  const db={prepare(query){const stmt=sql.prepare(query);return {bind(...args){return {first:async()=>stmt.get(...args)||null,run:async()=>stmt.run(...args)};}};}};
  const call=(method,{id=token,bearer=secret,time=start,snap=snapshot(),revision=1,origin,authorized=true}={})=>handleLiveRequest({
    request:new Request('https://popzbowling.com/api/live/'+id,{method,headers:{Authorization:'Bearer '+bearer,...(origin?{Origin:origin}:{})},body:['POST','PUT'].includes(method)?JSON.stringify({snapshot:snap,revision}):undefined}),
    env:{LIVE_SHARE_DB:db},params:{token:id}
  },{now:time,authorize:async()=>authorized});
  return {sql,call};
}
test('live API round trip, publisher auth, privacy allowlist, no cache',async()=>{
  const {sql,call}=fixture();const dirty={...snapshot(),secret:'secret',sessions:[session]};
  assert.equal((await call('POST',{snap:dirty})).status,200);
  let response=await call('GET');assert.match(response.headers.get('Cache-Control'),/no-store/);
  const data=await response.json();assert.equal(data.snapshot.bowlerName,'Michael');
  assert.ok(!JSON.stringify(data).includes('secret'));assert.ok(!JSON.stringify(data).includes('sessions'));
  assert.equal((await call('PUT',{bearer:wrong,revision:2})).status,403);
  assert.equal((await call('DELETE',{bearer:wrong})).status,403);
  assert.equal((await call('PUT',{origin:'https://evil.test'})).status,403);
  assert.equal((await call('POST',{id:'d'.repeat(64),authorized:false})).status,403);
  const row=sql.prepare('SELECT * FROM live_shares').get();assert.notEqual(row.secret_hash,secret);sql.close();
});
test('revision ordering, immutable final, final expiry, revocation',async()=>{
  const {sql,call}=fixture();await call('POST');
  const changed=snapshot();changed.currentBall='new ball';await call('PUT',{snap:changed,revision:3});
  assert.equal((await call('PUT',{revision:2})).status,409);
  assert.equal((await (await call('GET')).json()).snapshot.currentBall,'new ball');
  const final=buildLiveSnapshot(session,'Michael',true);let result=await call('PUT',{snap:final,revision:4,time:start+1000});
  assert.equal((await result.json()).expiresAt,start+1000+FINAL_TTL);
  assert.equal((await call('PUT',{revision:5})).status,409);
  assert.equal((await call('PUT',{snap:final,revision:4})).status,200,'lost final ACK is idempotent');
  assert.equal((await call('GET',{time:start+1001+FINAL_TTL})).status,410);
  await call('DELETE');assert.equal((await call('GET')).status,410);assert.equal(sql.prepare('SELECT snapshot FROM live_shares').get().snapshot,null);
  assert.equal((await call('POST')).status,410);sql.close();
});
test('stop-before-create tombstone and active expiry cannot resurrect',async()=>{
  const {sql,call}=fixture();await call('DELETE');assert.equal((await call('POST')).status,410);
  const id='e'.repeat(64);await call('POST',{id});assert.equal((await call('GET',{id,time:start+ACTIVE_TTL})).status,410);
  assert.equal((await call('PUT',{id,time:start+ACTIVE_TTL})).status,410);sql.close();
});
test('input limits and rate limits',async()=>{
  const {sql,call}=fixture();const bad=snapshot();bad.games[0].frames[0].marks[0]='<script>';
  assert.equal((await call('POST',{snap:bad})).status,400);assert.throws(()=>sanitizeLiveSnapshot({...snapshot(),games:Array(13).fill(snapshot().games[0])}));
  for(let i=0;i<30;i++)assert.equal((await call('POST',{id:i.toString(16).padStart(64,'0')})).status,200);
  assert.equal((await call('POST',{id:'f'.repeat(64)})).status,429);sql.close();
});
test('server Pro preview and verified paid entitlements, never caller plan',async()=>{
  const req=new Request('https://popzbowling.com',{headers:{'X-Firebase-Token':'id-token'}});
  assert.equal(await authorizeLiveCreate(req,{LIVE_SHARE_PREVIEW:'true'}),true);
  assert.equal(await authorizeLiveCreate(req,{}),false);
  const env={LIVE_FIREBASE_WEB_API_KEY:'public-config'};
  let calls=0;
  const fetcher=async(url,options)=>{calls++;if(url.includes('accounts:lookup'))return Response.json({users:[{localId:'verified-uid'}]});
    assert.ok(url.includes('/users/verified-uid/entitlements/pro'));assert.equal(options.headers.Authorization,'Bearer id-token');
    return Response.json({fields:{plan:{stringValue:'pro'},status:{stringValue:'founder'}}});};
  assert.equal(await authorizeLiveCreate(req,env,fetcher),true);assert.equal(calls,2);
  assert.equal(await authorizeLiveCreate(req,env,async()=>new Response('',{status:401})),false);
  assert.equal(await authorizeLiveCreate(req,env,async url=>url.includes('accounts:lookup')?Response.json({users:[{localId:'uid'}]}):Response.json({fields:{plan:{stringValue:'free'}}})),false);
});
