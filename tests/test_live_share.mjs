import assert from 'node:assert/strict';
import {test} from 'node:test';
import {emptyFrames,addRoll,gameComplete,setCurrentFirstBallSetup} from '../scoring.mjs';
import {buildLiveSnapshot} from '../live-share.mjs';
import {createLiveShareClient,LIVE_STORAGE_KEY} from '../live-share-client.mjs';
import {PRO_FEATURES,canUseFeature} from '../entitlements.mjs';
const game=()=>({frames:emptyFrames()});
const session=()=>({id:'my-series',bowlerName:'Michael',league:'League',enteringAverage:180,gameCount:2,games:[game()]});
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};};
const name=s=>s.bowlerName;

test('private-feature parity, public handicap, and explicit spectator privacy',()=>{
  const s=session();for(let i=0;i<12;i++)addRoll(s.games[0],10);
  s.games.push(game());const g=s.games[1];setCurrentFirstBallSetup(g,{ballUsed:'Venom',standBoard:32,targetBoard:17});
  addRoll(g,9);addRoll(g,1);addRoll(g,8);s.secret='never';s.center='Private center';s.bowlerId='owner';
  const live=buildLiveSnapshot(s,'Michael');
  assert.equal(live.currentScore,18);assert.equal(live.seriesScratch,318);assert.equal(live.games[0].score,300);
  assert.deepEqual(live.games[0].frames[9].marks,['X','X','X']);assert.equal(live.currentBall,'Venom');
  for(const key of ['secret','center','bowlerId','my-series','standBoard','targetBoard','firstBallSetup'])assert.ok(!JSON.stringify(live).includes(key));
  while(!gameComplete(g))addRoll(g,0);
  const final=buildLiveSnapshot(s,'Michael',true);assert.equal(final.finalStats.seriesTotal,326);
  assert.equal(final.finalStats.average,163);assert.equal(final.finalStats.handicapPerGame,36);assert.equal(final.finalStats.handicapSeries,398);
  const fractionalSession={...s,enteringAverage:180.9};
  const fractionalFinal=buildLiveSnapshot(fractionalSession,'Michael',true);
  assert.equal(fractionalFinal.finalStats.handicapPerGame,36,'spectator final handicap uses whole entering average');
  assert.equal(fractionalFinal.finalStats.handicapSeries,398);
  assert.equal(canUseFeature(PRO_FEATURES.LIVE_SCORE_SHARING,{}, {preview:false}),false);
  assert.equal(canUseFeature(PRO_FEATURES.LIVE_SCORE_SHARING,{}, {preview:true}),true);
});

test('one bowler stays selected across team turns; offline final survives reload',async()=>{
  const store=storage(),requests=[];let online=true,time=1000;
  const request=async(method,r,body)=>{requests.push({method,r,body});if(!online)throw Error('Offline');return {expiresAt:100000};};
  const options={storage:store,request,allowed:()=>true,now:()=>time};
  let client=createLiveShareClient(options);const s=session(),other={...session(),id:'other',bowlerName:'Partner'};
  client.start(s,name(s));await client.flush();const token=client.current().viewerToken;
  addRoll(s.games[0],8);client.reconcile({activeSessionId:'other',sessions:[s,other]},name);await client.flush();
  assert.equal(client.current().snapshot.bowlerName,'Michael');assert.equal(client.current().viewerToken,token);
  assert.deepEqual(requests.at(-1).body.snapshot.games[0].frames[0].marks,['8','']);
  online=false;s.finishedAt='finished';client.reconcile({activeSessionId:null,sessions:[s,other]},name);await client.flush();
  assert.equal(client.current().snapshot.finished,true);assert.ok(client.current().ackRevision<client.current().revision);
  client=createLiveShareClient(options);online=true;await client.flush();
  assert.equal(requests.at(-1).body.snapshot.finished,true);assert.equal(client.current().ackRevision,client.current().revision);
  const count=requests.length;time+=70000;await client.flush();assert.equal(requests.length,count,'final is not repeatedly published');
});

test('queued final follows in-flight roll; stop failure keeps revocation credentials',async()=>{
  const store=storage(),calls=[];let release,failStop=false;
  const client=createLiveShareClient({storage:store,allowed:()=>true,now:()=>1000,request:async(method,r,body)=>{
    calls.push({method,body});if(calls.length===1)await new Promise(resolve=>{release=resolve;});
    if(method==='DELETE'&&failStop)throw Error('Offline');return {expiresAt:100000};
  }});
  const s=session();client.start(s,name(s));const pending=client.flush();
  s.finishedAt='done';client.reconcile({sessions:[s]},name);release();await pending;
  assert.deepEqual(calls.map(x=>x.body?.snapshot.finished),[false,true]);
  failStop=true;client.stop();await client.flush();assert.equal(client.current().stopping,true);
  assert.match(client.current().error,/Stop pending/);assert.ok(JSON.parse(store.getItem(LIVE_STORAGE_KEY)).publisherSecret);
  failStop=false;await client.flush();assert.equal(client.current(),null);
});

test('uncertain create retries same tokens and Stop always contacts server',async()=>{
  const calls=[];let fail=true;
  const client=createLiveShareClient({storage:storage(),allowed:()=>true,request:async(method,r)=>{
    calls.push({method,token:r.viewerToken});if(fail)throw Error('Lost response');return {expiresAt:Date.now()+100000};
  }});
  client.start(session(),'Michael');await client.flush();await client.flush();
  assert.equal(calls[0].token,calls[1].token);client.stop();fail=false;await client.flush();
  assert.equal(calls.at(-1).method,'DELETE');assert.equal(client.current(),null);
});

test('Pro loss or local reset revokes; storage failure never starts networking',async()=>{
  let pro=false,calls=0;
  const client=createLiveShareClient({storage:storage(),allowed:()=>pro,request:async()=>{calls++;return {expiresAt:Date.now()+100000};}});
  assert.throws(()=>client.start(session(),'Michael'),/Pro/);pro=true;client.start(session(),'Michael');await client.flush();
  client.reconcile({sessions:[]},name);assert.equal(client.current().stopping,true);await client.flush();assert.equal(client.current(),null);
  const broken=createLiveShareClient({storage:{getItem:()=>null,setItem:()=>{throw Error('Full');}},allowed:()=>true,request:async()=>{calls++;}});
  const before=calls;assert.throws(()=>broken.start(session(),'Michael'),/Full/);await broken.flush();assert.equal(calls,before);
});
