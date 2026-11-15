import assert from 'node:assert/strict';
import {createHmac,generateKeyPairSync} from 'node:crypto';
import {
 PRODUCT_CODE,PRICE_CENTS,checkoutEnabled,validateStripePrice,validatePaidSession,
 verifyStripeSignature,isPermanentPro,BILLING_PREVIEW_ORIGIN,allowedCheckoutOrigin,previewSandboxAccountAllowed
} from '../functions/_billing/core.mjs';
import {onRequestGet as config} from '../functions/api/billing/config.js';
import {onRequestPost as checkout} from '../functions/api/billing/checkout.js';
import {onRequestPost as webhook} from '../functions/api/billing/webhook.js';

const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const env={
 STRIPE_SECRET_KEY:'sk_test_mock_server_only',
 STRIPE_WEBHOOK_SECRET:'whsec_testing_secret',
 STRIPE_LIFETIME_PRICE_ID:'price_1UbqZiBmwB4QMGDE6oIXNFL0',
 STRIPE_LIFETIME_PRODUCT_ID:'prod_Vd6n0W8JakrQl9',
 FIREBASE_WEB_API_KEY:'firebase-public-test-config',
 FIREBASE_SERVICE_ACCOUNT_JSON:JSON.stringify({
  project_id:'popz-bowling-stats',
  client_email:'test-server@popz-bowling-stats.iam.gserviceaccount.com',
  private_key:privateKey.export({type:'pkcs8',format:'pem'}),
  token_uri:'https://oauth2.googleapis.com/token',
 }),
 BILLING_CHECKOUT_ENABLED:'true',
 CF_PAGES_BRANCH:'stripe-lifetime-pro-preview',
 BILLING_PREVIEW_QA_ACTIVE:'true',
 BILLING_PREVIEW_QA_UID:'popz_preview_e2e_20261114',
};
const session={
 id:'cs_test_12345',client_reference_id:'popz_preview_e2e_20261114',
 metadata:{uid:'popz_preview_e2e_20261114',product:PRODUCT_CODE},mode:'payment',
 status:'complete',payment_status:'paid',currency:'usd',
 amount_subtotal:999,amount_total:999,livemode:false,
 line_items:{data:[{quantity:1,price:{id:'price_1UbqZiBmwB4QMGDE6oIXNFL0'}}]},
 payment_intent:'pi_123456789',
};
const asJson=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json'}});
const event={id:'evt_test123',type:'checkout.session.completed',data:{object:{id:session.id}}};
function sign(raw,timestamp=Math.floor(Date.now()/1000),secret=env.STRIPE_WEBHOOK_SECRET){
 return 't='+timestamp+',v1='+createHmac('sha256',secret).update(timestamp+'.'+raw).digest('hex');
}
function req(path,options={}){
 return new Request(BILLING_PREVIEW_ORIGIN+path,options);
}
let result=await config({env:{}});
assert.equal((await result.json()).enabled,false,'default must be sale-disabled');
assert.equal(checkoutEnabled(env),true);
assert.equal(previewSandboxAccountAllowed('some_real_user',env),false);
assert.equal(previewSandboxAccountAllowed('popz_preview_e2e_20261114',{...env,BILLING_PREVIEW_QA_UID:''}),false,'missing QA UID must fail closed');
assert.equal(previewSandboxAccountAllowed('popz_preview_e2e_20261114',{...env,BILLING_PREVIEW_QA_UID:'another_test_uid'}),false,'old QA identities may never be reused');
assert.equal(previewSandboxAccountAllowed('popz_preview_e2e_20261114',env),true);
assert.equal(allowedCheckoutOrigin(req('/api/billing/checkout'),env),BILLING_PREVIEW_ORIGIN);
assert.equal(checkoutEnabled({...env,CF_PAGES_BRANCH:'main'}),false,'live main must reject sandbox Stripe key');
assert.equal(checkoutEnabled({...env,STRIPE_SECRET_KEY:'rk_live_invalid_on_preview'}),false,'sandbox branch must reject live Stripe key');
assert.equal(checkoutEnabled({...env,CF_PAGES_BRANCH:'unknown-branch'}),false);
assert.throws(()=>allowedCheckoutOrigin(new Request('https://popzbowling.com/api/billing/checkout'),env),/Unsupported purchase origin/);
assert.throws(()=>allowedCheckoutOrigin(req('/api/billing/checkout',{headers:{origin:'https://malicious.example'}}),env),/Unsupported purchase origin/);
assert.equal(PRICE_CENTS,999);
assert.equal(validateStripePrice({id:'price_1UbqZiBmwB4QMGDE6oIXNFL0',active:true,type:'one_time',currency:'usd',unit_amount:999,livemode:false,product:'prod_Vd6n0W8JakrQl9'},env),true);
assert.equal(validateStripePrice({id:'price_1UbqZiBmwB4QMGDE6oIXNFL0',active:true,type:'one_time',currency:'usd',unit_amount:9990,livemode:false,product:'prod_Vd6n0W8JakrQl9'},env),false);
assert.equal(validateStripePrice({id:'price_1UbqZiBmwB4QMGDE6oIXNFL0',active:true,type:'one_time',currency:'usd',unit_amount:999,livemode:true,product:'prod_Vd6n0W8JakrQl9'},env),false);
assert.equal(validateStripePrice({id:'price_1UbqZiBmwB4QMGDE6oIXNFL0',active:true,type:'one_time',currency:'usd',unit_amount:999,livemode:false,product:'prod_another'},env),false);
assert.equal(isPermanentPro({plan:'pro',status:'founder'}),true);
assert.equal(isPermanentPro({plan:'pro',status:'complimentary'}),true);
assert.equal(isPermanentPro({plan:'pro',status:'lifetime'}),true);
assert.equal(isPermanentPro({plan:'free',status:'lifetime'}),false);
assert.equal(validatePaidSession(session,env),'popz_preview_e2e_20261114');
assert.equal(validatePaidSession({...session,client_reference_id:'an_actual_user',metadata:{uid:'an_actual_user',product:PRODUCT_CODE}},env),null,'sandbox webhooks must not credit real users');
const stripeObservedOpenSession={
 ...session,
 id:'cs_test_a0RQD8U3vheNvbAZDa3z93R7KLzWLdeMUCn6AM6t2oHVwuedkePhB1E1KS',
 client_reference_id:'popz_sandbox_smoke_test',
 metadata:{uid:'popz_sandbox_smoke_test',product:PRODUCT_CODE,purpose:'smoke_test_no_fulfillment'},
 status:'open',payment_status:'unpaid',payment_intent:null
};
assert.equal(validatePaidSession(stripeObservedOpenSession,env),null,'real sandbox open/unpaid session must never grant Pro');
assert.equal(validatePaidSession({...session,amount_total:9990},env),null);
assert.equal(validatePaidSession({...session,line_items:{data:[]}},env),null);
assert.equal(validatePaidSession({...session,metadata:{uid:'another-user',product:PRODUCT_CODE}},env),null);
assert.equal(validatePaidSession({...session,payment_status:'unpaid'},env),null);
assert.equal(validatePaidSession({...session,livemode:true},env),null);
const raw=JSON.stringify(event);
assert.equal(await verifyStripeSignature(raw,sign(raw),env.STRIPE_WEBHOOK_SECRET),true);
const rotatedSignature=sign(raw).split(',v1=')[1];
assert.equal(await verifyStripeSignature(raw,sign(raw).split(',v1=')[0]+',v1='+('a'.repeat(64))+',v1='+rotatedSignature,env.STRIPE_WEBHOOK_SECRET),true,'rotated webhook signature must be recognized');
assert.equal(await verifyStripeSignature(raw+' ',sign(raw),env.STRIPE_WEBHOOK_SECRET),false);
assert.equal(await verifyStripeSignature(raw,sign(raw,Math.floor(Date.now()/1000)-500),env.STRIPE_WEBHOOK_SECRET),false);
assert.equal(await verifyStripeSignature(raw,'',env.STRIPE_WEBHOOK_SECRET),false);

result=await checkout({request:req('/api/billing/checkout',{method:'POST'}),env:{}});
assert.equal(result.status,503,'checkout is disabled by default');
result=await checkout({request:req('/api/billing/checkout',{method:'POST'}),env});
assert.equal(result.status,401,'checkout needs Firebase ID token');
result=await checkout({
 request:new Request('https://preview.pages.dev/api/billing/checkout',{
  method:'POST',headers:{authorization:'Bearer test.jwt'}
 }),env});
assert.equal(result.status,403,'preview deployment cannot charge');

result=await webhook({request:req('/api/billing/webhook',{method:'POST',body:raw}),env});
assert.equal(result.status,400,'webhook rejects unsigned events');

const originalFetch=globalThis.fetch;
let saved=null,permanent=null,commitCount=0,checkoutCount=0,canonicalBilling=null;
let reservationDoc=null,reservationVersion=0,activeCheckoutSession=null,reservationCommits=0;
const checkoutInputs=[];
function mockNetwork(url,options={}){
 const uri=String(url);
 if(uri.includes('identitytoolkit.googleapis.com/'))
  return Promise.resolve(asJson({users:[{localId:'popz_preview_e2e_20261114',email:'buyer@example.com',emailVerified:true}]}));
 if(uri==='https://oauth2.googleapis.com/token')
  return Promise.resolve(asJson({access_token:'mock_service_account_token'}));
 if(uri.includes('/documents/users/') && uri.endsWith('/entitlements/pro')){
  if(permanent)return Promise.resolve(asJson({
   updateTime:'2026-11-14T11:00:00Z',
   fields:{plan:{stringValue:'pro'},status:{stringValue:permanent},source:{stringValue:'founder'}}
  }));
  return Promise.resolve(asJson({error:'NOT_FOUND'},404));
 }
 if(uri.endsWith('/billing/stripeLifetime')){
  if(!canonicalBilling)return Promise.resolve(asJson({error:'NOT_FOUND'},404));
  return Promise.resolve(asJson({fields:{
   product:{stringValue:PRODUCT_CODE},
   checkoutSessionId:{stringValue:canonicalBilling.checkoutSessionId},
   paymentIntentId:{stringValue:canonicalBilling.paymentIntentId},
   stripeEventId:{stringValue:event.id},
  },updateTime:'2026-11-14T12:00:00Z'}));
 }
 if(uri.endsWith('/billing/checkoutReservation')){
  return Promise.resolve(reservationDoc?asJson(reservationDoc):asJson({error:'NOT_FOUND'},404));
 }
 if(uri.endsWith('/documents:commit')){
  const body=JSON.parse(options.body),write=body.writes?.[0];
  if(body.writes?.length===1 && write?.update?.name.endsWith('/billing/checkoutReservation')){
   const pre=write.currentDocument;
   if(pre.exists===false && reservationDoc || pre.updateTime && pre.updateTime!==reservationDoc?.updateTime)
    return Promise.resolve(asJson({error:'FAILED_PRECONDITION'},400));
   reservationVersion++;
   reservationCommits++;
   reservationDoc={fields:write.update.fields,updateTime:'reservation-time-'+reservationVersion};
   return Promise.resolve(asJson({writeResults:[{updateTime:reservationDoc.updateTime}]}));
  }
  commitCount+=1;
  saved=body;
  if(saved.writes.length===2)canonicalBilling={
   checkoutSessionId:saved.writes[1].update.fields.checkoutSessionId.stringValue,
   paymentIntentId:saved.writes[1].update.fields.paymentIntentId.stringValue,
  };
  return Promise.resolve(asJson({writeResults:[{},{}]}));
 }
 if(uri.endsWith('/prices/price_1UbqZiBmwB4QMGDE6oIXNFL0'))
  return Promise.resolve(asJson({id:'price_1UbqZiBmwB4QMGDE6oIXNFL0',active:true,type:'one_time',currency:'usd',unit_amount:999,livemode:false,product:'prod_Vd6n0W8JakrQl9'}));
 if(uri.endsWith('/checkout/sessions') && options.method==='POST'){
  checkoutCount+=1;
  const fields=new URLSearchParams(options.body);
  assert.equal(fields.get('line_items[0][price]'),'price_1UbqZiBmwB4QMGDE6oIXNFL0');
  assert.equal(fields.get('client_reference_id'),'popz_preview_e2e_20261114');
  assert.equal(fields.get('metadata[product]'),PRODUCT_CODE);
  assert.equal(fields.get('mode'),'payment');
  assert.equal(fields.get('success_url'),BILLING_PREVIEW_ORIGIN+'/payment/success/');
  assert.equal(fields.get('cancel_url'),BILLING_PREVIEW_ORIGIN+'/payment/cancel/');
  assert.equal(fields.has('payment_method_types[0]'),false,'Stripe should select dynamic payment methods');
  assert.match(fields.get('integration_identifier'),/^popzbowling_[a-z]{8}$/);
  assert.match(options.headers['idempotency-key'],/^popz_lifetime_reservation_[a-f0-9]{32}$/);
  assert.match(fields.get('metadata[reservationNonce]'),/^[a-f0-9]{32}$/);
  assert.equal(fields.get('metadata[reservationNonce]'),options.headers['idempotency-key'].slice(-32));
  assert.equal(fields.get('expires_at'),reservationDoc.fields.expiresAtSeconds.integerValue);
  assert.equal(options.headers['stripe-version'],'2026-09-30.endive');
  checkoutInputs.push({idempotencyKey:options.headers['idempotency-key'],label:fields.get('integration_identifier')});
  activeCheckoutSession={
   id:session.id,client_reference_id:'popz_preview_e2e_20261114',
   metadata:{uid:'popz_preview_e2e_20261114',product:PRODUCT_CODE,
    reservationNonce:fields.get('metadata[reservationNonce]')},
   mode:'payment',status:'open',payment_status:'unpaid',currency:'usd',
   amount_total:999,livemode:false,expires_at:Number(fields.get('expires_at')),
   url:'https://checkout.stripe.com/c/pay/mock-session'
  };
  return Promise.resolve(asJson(activeCheckoutSession));
 }
 if(uri.includes('/checkout/sessions/cs_test_12345'))
  return Promise.resolve(asJson(uri.includes('?expand[]=line_items')?session:activeCheckoutSession));
 throw Error('Unexpected network request: '+uri);
}
globalThis.fetch=mockNetwork;
try{
 const request=req('/api/billing/checkout',{
  method:'POST',headers:{authorization:'Bearer valid.jwt','origin':BILLING_PREVIEW_ORIGIN},body:'{}'
 });
 result=await checkout({request,env});
 assert.equal(result.status,200);
 assert.equal((await result.json()).url,'https://checkout.stripe.com/c/pay/mock-session');
 assert.equal(checkoutCount,1);
 result=await checkout({request,env});
 assert.equal(result.status,200);
 assert.equal(checkoutCount,1,'simultaneous or repeated Checkout requests must reuse one Stripe session');
 assert.equal(reservationCommits,2,'Firestore reservation created and session ID committed');
 assert.equal(reservationDoc.fields.state.stringValue,'open');
 assert.equal(reservationDoc.fields.sessionId.stringValue,session.id);
 permanent='founder';
 result=await checkout({request,env});
 assert.equal((await result.json()).alreadyPro,true);
 assert.equal(checkoutCount,1,'Founder must not be offered another charge');
 permanent=null;

 result=await webhook({request:req('/api/billing/webhook',{
  method:'POST',headers:{'stripe-signature':sign(raw)},body:raw
 }),env});
 assert.equal(result.status,200);
 assert.equal((await result.json()).activated,true);
 assert.equal(commitCount,1);
 assert.equal(saved.writes.length,2);
 assert.equal(saved.writes[0].update.fields.status.stringValue,'lifetime');
 assert.equal(saved.writes[0].currentDocument.exists,false);
 assert.equal(saved.writes[0].update.fields.source.stringValue,'stripe');
 assert.equal(saved.writes[1].update.fields.checkoutSessionId.stringValue,session.id);
 assert.equal(saved.writes[1].currentDocument.exists,false,'canonical payment document must never overwrite an existing purchase');
 assert.equal(JSON.stringify(saved).includes('bowlingHistory'),false);
 result=await checkout({request,env});
 assert.equal(result.status,200);
 assert.equal((await result.json()).alreadyPro,true,'existing paid Stripe record must prevent a second purchase');
 assert.equal(checkoutCount,1);

 permanent='lifetime';
 result=await webhook({request:req('/api/billing/webhook',{
  method:'POST',headers:{'stripe-signature':sign(raw)},body:raw
 }),env});
 assert.equal((await result.json()).activated,false);
 assert.equal(commitCount,1,'idempotent retry must not rewrite purchase');

 permanent='founder';
 result=await webhook({request:req('/api/billing/webhook',{
  method:'POST',headers:{'stripe-signature':sign(raw)},body:raw
 }),env});
 assert.equal((await result.json()).activated,false);
 assert.equal(commitCount,1,'Founder must never be overwritten');
}finally{globalThis.fetch=originalFetch}
const restrictedEnv={...env,STRIPE_SECRET_KEY:'rk_test_restricted_key'};
assert.equal(checkoutEnabled(restrictedEnv),true,'restricted test keys must be supported');
assert.equal(validatePaidSession(session,restrictedEnv),'popz_preview_e2e_20261114');
console.log('Stripe sandbox checkout/webhook auth, signatures, strict pricing, dynamic methods, lifetime grant, retries, and Founder protection passed');
