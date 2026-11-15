import assert from 'node:assert/strict';
import {createHmac,generateKeyPairSync} from 'node:crypto';
import {grantStripeLifetime,PRODUCT_CODE} from '../functions/_billing/core.mjs';
import {REVIEW_EVENT_TYPES} from '../functions/_billing/reconciliation.mjs';
import {onRequestPost as webhook} from '../functions/api/billing/webhook.js';
import {makeFakeBillingReviewD1} from './helpers/billing-review-d1.mjs';

const uid='popz_preview_e2e_20261114';
const originalSession='cs_test_original';
const originalIntent='pi_original';
const reviewDB=makeFakeBillingReviewD1();
const env={
 BILLING_REVIEW_DB:reviewDB,
 CF_PAGES_BRANCH:'stripe-lifetime-pro-preview',
 BILLING_PREVIEW_QA_ACTIVE:'true',
 BILLING_PREVIEW_QA_UID:'popz_preview_e2e_20261114',
 STRIPE_SECRET_KEY:'rk_test_mock_review',
 STRIPE_WEBHOOK_SECRET:'whsec_review_fixture',
 STRIPE_LIFETIME_PRICE_ID:'price_1UbqZiBmwB4QMGDE6oIXNFL0',
 STRIPE_LIFETIME_PRODUCT_ID:'prod_Vd6n0W8JakrQl9',
 FIREBASE_SERVICE_ACCOUNT_JSON:JSON.stringify({
  project_id:'popz-bowling-stats',
  client_email:'popz-bowling-stripe-preview@popz-bowling-stats.iam.gserviceaccount.com',
  private_key:generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({type:'pkcs8',format:'pem'}),
  token_uri:'https://oauth2.googleapis.com/token'
 })
};
const asJson=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
let entitlement='founder';
let canonical={product:PRODUCT_CODE,checkoutSessionId:originalSession,paymentIntentId:originalIntent};
const audit=new Map();
const calls=[];
const originalFetch=globalThis.fetch;
let injectedFailure=false;
function fakeFetch(url,options={}){
 const uri=String(url);
 calls.push({uri,method:options.method||'GET'});
 if(uri==='https://oauth2.googleapis.com/token')return Promise.resolve(asJson({access_token:'fake_scoped_service_token'}));
 if(uri.endsWith('/entitlements/pro'))return Promise.resolve(asJson({
  updateTime:'2026-11-14T01:00:00Z',
  fields:{plan:{stringValue:'pro'},status:{stringValue:entitlement},source:{stringValue:entitlement==='founder'?'founder':'stripe'}}
 }));
 if(uri.endsWith('/billing/stripeLifetime')){
  if(!canonical)return Promise.resolve(asJson({error:'NOT_FOUND'},404));
  return Promise.resolve(asJson({fields:Object.fromEntries(Object.entries(canonical).map(([k,v])=>[k,{stringValue:v}]))}));
 }
 if(uri.includes('/billing/review_evt_')){
  const id=uri.split('/').pop(), doc=audit.get(id);
  return Promise.resolve(doc?asJson({fields:doc}):asJson({error:'NOT_FOUND'},404));
 }
 if(uri.endsWith('/documents:commit')){
  const writes=JSON.parse(options.body).writes;
  assert.equal(writes.length,1,'Audits must not rewrite the entitlement or original billing record');
  assert.equal(writes[0].currentDocument.exists,false,'Audit records must be create-only');
  const item=writes[0].update;
  const docId=item.name.split('/').pop();
  if(injectedFailure)return Promise.resolve(asJson({error:'Unavailable'},503));
  if(audit.has(docId))return Promise.resolve(asJson({error:'Already exists'},400));
  audit.set(docId,item.fields);
  return Promise.resolve(asJson({writeResults:[{}]}));
 }
 if(uri.endsWith('/refunds/re_full'))return Promise.resolve(asJson({
  id:'re_full',currency:'usd',amount:999,status:'succeeded',payment_intent:originalIntent
 }));
 if(uri.endsWith('/refunds/re_partial'))return Promise.resolve(asJson({
  id:'re_partial',currency:'usd',amount:300,status:'pending',payment_intent:originalIntent
 }));
 if(uri.endsWith('/refunds/re_wrong'))return Promise.resolve(asJson({
  id:'re_wrong',currency:'usd',amount:999,status:'succeeded',payment_intent:'pi_unrelated'
 }));
 if(uri.endsWith('/disputes/dp_one'))return Promise.resolve(asJson({
  id:'dp_one',livemode:false,currency:'usd',amount:999,status:'needs_response',charge:'ch_primary',payment_intent:null
 }));
 if(uri.endsWith('/charges/ch_primary'))return Promise.resolve(asJson({
  id:'ch_primary',livemode:false,currency:'usd',amount:999,amount_refunded:300,refunded:false,payment_intent:originalIntent
 }));
 if(uri.endsWith('/payment_intents/'+originalIntent))return Promise.resolve(asJson({
  id:originalIntent,livemode:false,currency:'usd',amount:999,
  metadata:{uid,product:PRODUCT_CODE}
 }));
 if(uri.endsWith('/payment_intents/pi_unrelated'))return Promise.resolve(asJson({
  id:'pi_unrelated',livemode:false,currency:'usd',amount:999,
  metadata:{uid:'unrelated_customer',product:'other_product'}
 }));
 throw Error('Unexpected network URL: '+uri);
}
function sign(body){
 const ts=Math.floor(Date.now()/1000);
 return 't='+ts+',v1='+createHmac('sha256',env.STRIPE_WEBHOOK_SECRET).update(ts+'.'+body).digest('hex');
}
async function postEvent(id,type,objectId){
 const body=JSON.stringify({id,type,livemode:false,data:{object:{id:objectId}}});
 const response=await webhook({env,request:new Request(
  'https://stripe-lifetime-pro-preview.popzbowling.pages.dev/api/billing/webhook',{
   method:'POST',headers:{'stripe-signature':sign(body)},body
  })
 });
 return {status:response.status,json:await response.json()};
}
const field=(id,key)=>audit.get('review_'+id)?.[key]?.stringValue ?? audit.get('review_'+id)?.[key]?.integerValue ?? null;
assert(REVIEW_EVENT_TYPES.has('refund.created'));
assert(REVIEW_EVENT_TYPES.has('charge.dispute.created'));
globalThis.fetch=fakeFetch;
try{
 const second={id:'cs_test_second_paid',payment_intent:'pi_second_paid'};
 let result=await grantStripeLifetime(uid,second,'evt_duplicate1',env);
 assert.equal(result.already,true);
 assert.equal(result.duplicate,true);
 assert.equal(field('evt_duplicate1','kind'),'duplicate_paid_purchase');
 assert.equal(field('evt_duplicate1','reviewState'),'manual_review_required');
 assert.equal(field('evt_duplicate1','referenceId'),second.id);
 assert.equal(canonical.checkoutSessionId,originalSession);
 assert.equal(entitlement,'founder','Founder must never be overwritten');

 // Idempotent Stripe webhook replay must not add a second audit record.
 result=await grantStripeLifetime(uid,second,'evt_duplicate1',env);
 assert.equal(result.already,true);
 assert.equal(result.duplicate,true);
 assert.equal(audit.size,1);

 // First purchase replay must not create a review record.
 entitlement='lifetime';
 result=await grantStripeLifetime(uid,{id:originalSession,payment_intent:originalIntent},'evt_original_replay',env);
 assert.equal(result.already,true);
 assert.equal(result.duplicate,false);
 assert.equal(audit.size,1);

 let outcome=await postEvent('evt_refundfull','refund.created','re_full');
 assert.equal(outcome.status,200);
 assert.equal(outcome.json.reviewRequired,true);
 assert.equal(outcome.json.kind,'refund');
 assert.equal(field('evt_refundfull','amountCents'),'999');
 assert.equal(field('evt_refundfull','status'),'succeeded');
 assert.equal(entitlement,'lifetime','A refund must not silently delete Pro before policy approval');

 outcome=await postEvent('evt_refundfull','refund.created','re_full');
 assert.equal(outcome.status,200);
 assert.equal(outcome.json.recorded,false,'Replayed refund must be idempotent');
 assert.equal(audit.size,2);

 outcome=await postEvent('evt_refundpartial','refund.updated','re_partial');
 assert.equal(outcome.status,200);
 assert.equal(field('evt_refundpartial','amountCents'),'300');
 assert.equal(field('evt_refundpartial','status'),'pending');
 assert.equal(entitlement,'lifetime');

 outcome=await postEvent('evt_dispute1','charge.dispute.created','dp_one');
 assert.equal(outcome.status,200);
 assert.equal(outcome.json.reviewRequired,true);
 assert.equal(outcome.json.kind,'dispute');
 assert.equal(field('evt_dispute1','status'),'needs_response');
 assert.equal(field('evt_dispute1','paymentIntentId'),originalIntent);
 assert.equal(entitlement,'lifetime');

 outcome=await postEvent('evt_unrelated','refund.created','re_wrong');
 assert.equal(outcome.status,200);
 assert.equal(outcome.json.ignored,true);
 assert.equal(audit.has('review_evt_unrelated'),false,'Non-app refunds must not write Firestore');

 canonical=null;
 outcome=await postEvent('evt_noorder','charge.dispute.updated','dp_one');
 assert.equal(outcome.status,200);
 assert.equal(outcome.json.ignored,true,'No original canonical purchase means no action');
 canonical={product:PRODUCT_CODE,checkoutSessionId:originalSession,paymentIntentId:originalIntent};

 injectedFailure=true;
 outcome=await postEvent('evt_retry','refund.created','re_full');
 assert.equal(outcome.status,503,'Transient Firestore failure must result in retry');
 injectedFailure=false;

 const nonsense=await postEvent('evt_fake','refund.created','cs_test_fake');
 assert.equal(nonsense.status,400,'Signed event with invalid refund reference must be rejected');
 const closedBody=JSON.stringify({id:'evt_after_qa_deletion',type:'checkout.session.completed',
  data:{object:{id:'cs_test_old_deleted_account'}}});
 const closedResponse=await webhook({env:{...env,BILLING_PREVIEW_QA_ACTIVE:'false'},request:new Request(
  'https://stripe-lifetime-pro-preview.popzbowling.pages.dev/api/billing/webhook',{
   method:'POST',headers:{'stripe-signature':sign(closedBody)},body:closedBody
  })});
 assert.equal(closedResponse.status,200);
 assert.equal((await closedResponse.json()).sandboxQAClosed,true,'deleted test identity must not be silently reactivated by a late Stripe event');
 assert(audit.size===4,'Only one duplicate, two refunds and one dispute review should exist');
 assert.equal(reviewDB.sqlite.prepare('SELECT COUNT(*) n FROM billing_reviews').get().n,4,
  'Every private Firestore risk record must also appear in the durable owner inbox');
 assert.equal(reviewDB.sqlite.prepare("SELECT alert_state FROM billing_reviews WHERE id='evt_refundfull'").get().alert_state,
  'pending','Refund alert remains pending until Telegram confirms delivery');
 assert(!calls.some(x=>x.uri.includes('accounts:delete')),'Risk handler must not delete users');
 console.log('Duplicate paid-session audit, replay idempotency, full/partial refund review, dispute review, cross-product isolation, retry behavior and Founder/lifetime preservation PASSED');
}finally{globalThis.fetch=originalFetch;reviewDB.close();}
