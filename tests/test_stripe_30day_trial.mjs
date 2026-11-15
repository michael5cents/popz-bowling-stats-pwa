import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {onRequestGet,onRequestPost} from '../functions/api/billing/trial.js';
import {FOUNDER_CUTOFF_UTC,TRIAL_MS} from '../trial-policy.mjs';

const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const preview='https://stripe-lifetime-pro-preview.popzbowling.pages.dev/api/billing/trial';
const baseEnv={
 CF_PAGES_BRANCH:'stripe-lifetime-pro-preview',
 STRIPE_SECRET_KEY:'sk_test_never_sent_to_real_stripe',
 BILLING_TRIAL_ENABLED:'true',
 BILLING_PREVIEW_QA_ACTIVE:'true',
 BILLING_PREVIEW_QA_UID:'new_verified_test_account',
 FIREBASE_WEB_API_KEY:'public_test_firebase_key',
 FIREBASE_SERVICE_ACCOUNT_JSON:JSON.stringify({
  project_id:'popz-bowling-stats',
  client_email:'qa-test@popz-bowling-stats.iam.gserviceaccount.com',
  private_key:privateKey.export({type:'pkcs8',format:'pem'}),
  token_uri:'https://oauth2.googleapis.com/token'
 })
};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
let activeIdentity='new_verified_test_account',current=null,writeCount=0,readFailure=false,forcedConflict=false;
const request=(body={},headers={})=>new Request(preview,{
 method:'POST',headers:{origin:'https://stripe-lifetime-pro-preview.popzbowling.pages.dev',
  authorization:'Bearer test_fake_signed_firebase_token','content-type':'application/json',...headers},
 body:JSON.stringify(body)
});
const toFirestore=record=>({
 updateTime:'2026-11-15T18:20:00.000Z',
 fields:Object.fromEntries(Object.entries(record).filter(([,v])=>v!==null).map(
  ([name,value])=>[name,{stringValue:value}]
 ))
});
const originalFetch=globalThis.fetch;
function fakeFetch(url,options={}){
 const uri=String(url);
 if(uri.startsWith('https://identitytoolkit.googleapis.com/v1/accounts:lookup?')){
  return Promise.resolve(json({users:[{localId:activeIdentity,email:'qa@example.com',emailVerified:true}]}));
 }
 if(uri==='https://oauth2.googleapis.com/token')
  return Promise.resolve(json({access_token:'scoped_fake_cloud_service'}));
 if(uri.endsWith('/entitlements/pro')){
  if(readFailure)return Promise.resolve(json({error:'temporary'},503));
  if(!current)return Promise.resolve(json({error:'NOT_FOUND'},404));
  return Promise.resolve(json(toFirestore(current)));
 }
 if(uri.endsWith('/documents:commit')){
  const payload=JSON.parse(options.body);
  assert.equal(payload.writes?.length,1);
  const item=payload.writes[0];
  assert.equal(item.currentDocument.exists,false,'Trial may NEVER overwrite a prior grant');
  assert.match(item.update.name,/\/users\/new_verified_test_account\/entitlements\/pro$/);
  assert.equal(item.update.fields.status.stringValue,'trial');
  assert.equal(item.update.fields.source.stringValue,'installation');
  assert.equal(item.update.fields.cohortId.stringValue,'post-founder-2026');
  assert.equal(item.update.fields.expiresAtTimestamp.timestampValue,
   item.update.fields.expiresAt.stringValue,
   'Rules must use the server-authored native Firestore expiry');
  assert.equal(item.update.fields.expiresAtTimestamp.timestampValue,
   item.update.fields.expiresAt.stringValue,
   'security rules must use the server-authored native Firestore expiry');
  if(current||forcedConflict)return Promise.resolve(json({error:'CONFLICT'},409));
  writeCount++;
  current=Object.fromEntries(Object.entries(item.update.fields).map(
   ([k,v])=>[k,v.stringValue]
  ));
  return Promise.resolve(json({writeResults:[{updateTime:'2026-11-15T18:20:00Z'}]}));
 }
 throw Error('Unexpected network request in trial test '+uri);
}
globalThis.fetch=fakeFetch;
try{
 const disabled=await onRequestGet({env:{...baseEnv,BILLING_TRIAL_ENABLED:'false'}});
 assert.equal((await disabled.json()).enabled,false,'Trial must be opt-in disabled until paid release');
 let result=await onRequestPost({env:{...baseEnv,BILLING_TRIAL_ENABLED:'false'},request:request()});
 assert.equal(result.status,503);
 result=await onRequestPost({env:baseEnv,request:new Request(preview,{method:'POST'})});
 assert.equal(result.status,401,'Verified Google sign-in required for account-backed trial');
 const config=await onRequestGet({env:baseEnv});
 const info=await config.json();
 assert.equal(info.enabled,true);
 assert.equal(info.trialDays,30);
 assert.equal(info.founderCutoffUtc,FOUNDER_CUTOFF_UTC);
 activeIdentity='another_unapproved_user';
 result=await onRequestPost({env:baseEnv,request:request()});
 assert.equal(result.status,403,'Preview must not enroll real customers');
 activeIdentity='new_verified_test_account';
 const now=new Date();
 const installAt=now.toISOString();
 result=await onRequestPost({env:baseEnv,request:request({installationStartedAt:installAt})});
 assert.equal(result.status,200);
 let body=await result.json();
 assert.equal(body.created,true);
 assert.equal(body.status,'trial');
 assert.equal(writeCount,1);
 assert.equal(Date.parse(body.expiresAt)-Date.parse(body.startedAt),TRIAL_MS);
 const firstExpiry=body.expiresAt,firstStart=body.startedAt;
 result=await onRequestPost({env:baseEnv,request:request({installationStartedAt:new Date(now.getTime()+1000).toISOString()})});
 body=await result.json();
 assert.equal(result.status,200);
 assert.equal(body.created,false);
 assert.equal(body.expiresAt,firstExpiry,'A second request cannot restart the 30-day clock');
 assert.equal(body.startedAt,firstStart);
 assert.equal(writeCount,1,'No second Firestore entitlement grant');
 current={plan:'pro',status:'founder',source:'founder'};
 result=await onRequestPost({env:baseEnv,request:request({installationStartedAt:installAt})});
 body=await result.json();
 assert.equal(body.created,false);
 assert.equal(body.status,'founder');
 assert.equal(writeCount,1,'Founder is never replaced by trial');
 current={plan:'pro',status:'complimentary',source:'admin'};
 result=await onRequestPost({env:baseEnv,request:request()});
 assert.equal((await result.json()).status,'complimentary');
 current={plan:'pro',status:'lifetime',source:'stripe'};
 result=await onRequestPost({env:baseEnv,request:request()});
 assert.equal((await result.json()).status,'lifetime');
 current={plan:'pro',status:'trial',source:'installation',
  trialStartedAt:'2026-01-01T00:00:00Z',expiresAt:'2026-01-31T00:00:00Z'};
 result=await onRequestPost({env:baseEnv,request:request({installationStartedAt:installAt})});
 body=await result.json();
 assert.equal(body.created,false);
 assert.equal(body.expiresAt,'2026-01-31T00:00:00Z','Expired trial must not restart');
 current=null;
 result=await onRequestPost({env:baseEnv,request:request({installationStartedAt:'2099-01-01T00:00:00Z'})});
 assert.equal(result.status,422,'Device clock in future must not start a later trial');
 result=await onRequestPost({env:baseEnv,request:request({installationStartedAt:'invalid'})});
 assert.equal(result.status,422);
 readFailure=true;
 result=await onRequestPost({env:baseEnv,request:request({installationStartedAt:installAt})});
 assert.equal(result.status,503,'No grant when Firestore unavailable');
 readFailure=false;
 forcedConflict=true;
 // Model a second caller winning the create-only write.
 current={plan:'pro',status:'trial',source:'installation',
  trialStartedAt:firstStart,expiresAt:firstExpiry};
 result=await onRequestPost({env:baseEnv,request:request({installationStartedAt:installAt})});
 assert.equal((await result.json()).created,false);
 assert.equal(writeCount,1);
 console.log('PASS: 30-day server trial, default-off, Firebase authentication, QA isolation, permanent Founder protection, 1x CAS grant, no trial restart, clock validation, Firestore fail-closed');
}finally{globalThis.fetch=originalFetch;}
