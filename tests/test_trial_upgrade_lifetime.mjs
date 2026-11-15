import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {grantStripeLifetime} from '../functions/_billing/core.mjs';
import {effectiveAccess,PRO_FEATURES,canUseFeature} from '../entitlements.mjs';

const uid='qa_expired_trial_ready_to_buy';
const session={
 id:'cs_test_trial_upgrade_mock',payment_intent:'pi_trial_upgrade_mock'
};
const eventId='evt_trial_purchase_complete';
const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const env={FIREBASE_SERVICE_ACCOUNT_JSON:JSON.stringify({
 project_id:'popz-bowling-stats',
 client_email:'test-server@popz-bowling-stats.iam.gserviceaccount.com',
 private_key:privateKey.export({type:'pkcs8',format:'pem'}),
 token_uri:'https://oauth2.googleapis.com/token'
})};
const json=(obj,status=200)=>new Response(JSON.stringify(obj),{
 status,headers:{'content-type':'application/json'}
});
const expiredTrial={plan:'pro',status:'trial',source:'installation',
 trialStartedAt:'2026-11-15T18:12:36.000Z',
 expiresAt:'2026-12-15T18:12:36.000Z'};
const expiryTime=Date.parse('2026-12-16T00:00:00Z');
assert.equal(effectiveAccess(expiredTrial,{now:expiryTime,preview:false}).pro,false,
 '30-day trial really ends before payment');
assert.equal(canUseFeature(PRO_FEATURES.ADVANCED_SHOT_TRACKING,expiredTrial,{now:expiryTime,preview:false}),false);
let current={...expiredTrial},billing=null,writes=0;
const previous=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{
 const uri=String(url);
 if(uri==='https://oauth2.googleapis.com/token')
  return json({access_token:'fake_scoped_datastore_token'});
 if(uri.endsWith('/entitlements/pro'))
  return json({updateTime:'2026-12-15T18:12:36Z',
   fields:Object.fromEntries(Object.entries(current).map(([k,v])=>[k,{stringValue:v}]))});
 if(uri.endsWith('/billing/stripeLifetime'))
  return billing?json({fields:Object.fromEntries(Object.entries(billing).map(
   ([k,v])=>[k,{stringValue:v}]
  ))}):json({error:'NOT_FOUND'},404);
 if(uri.endsWith('/documents:commit')){
  const batch=JSON.parse(options.body).writes;
  assert.equal(batch.length,2,'only entitlement and payment record may be written');
  assert.equal(batch[0].currentDocument.updateTime,'2026-12-15T18:12:36Z',
   'trial upgrade must CAS on exact prior entitlement version');
  assert.equal(batch[1].currentDocument.exists,false,
   'original paid billing document may never be overwritten');
  assert.equal(batch[0].update.fields.status.stringValue,'lifetime');
  assert.equal(batch[0].update.fields.source.stringValue,'stripe');
  assert.equal(batch[1].update.fields.checkoutSessionId.stringValue,session.id);
  assert.equal(batch[1].update.fields.stripeEventId.stringValue,eventId);
  assert(!JSON.stringify(batch).includes('/sessions/'),
   'purchase must never modify bowling sessions or history');
  current={plan:'pro',status:'lifetime',source:'stripe'};
  billing={checkoutSessionId:session.id,paymentIntentId:session.payment_intent};
  writes++;
  return json({writeResults:[{},{}]});
 }
 throw new Error('Unexpected trial upgrade network URL: '+uri);
};
try{
 const result=await grantStripeLifetime(uid,session,eventId,env);
 assert.equal(result.already,false);
 assert.equal(result.status,'lifetime');
 assert.equal(writes,1);
 assert.equal(effectiveAccess(current,{now:expiryTime,preview:false}).pro,true);
 assert.equal(canUseFeature(PRO_FEATURES.ADVANCED_SHOT_TRACKING,current,{now:expiryTime,preview:false}),true);
 const again=await grantStripeLifetime(uid,session,eventId,env);
 assert.equal(again.already,true);
 assert.equal(again.duplicate,false);
 assert.equal(writes,1,'replayed payment event cannot grant twice');
 console.log('PASS: expired 30-day Pro trial upgrades to lifetime on signed paid Stripe event; history untouched and webhook replay idempotent');
}finally{globalThis.fetch=previous;}
