import assert from 'node:assert/strict';
import {createHmac,generateKeyPairSync} from 'node:crypto';
import {
 PRODUCT_CODE,PRICE_CENTS,checkoutEnabled,validateStripePrice,validatePaidSession,
 verifyStripeSignature,isPermanentPro
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
};
const session={
 id:'cs_test_12345',client_reference_id:'firebase-user-123',
 metadata:{uid:'firebase-user-123',product:PRODUCT_CODE},mode:'payment',
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
 return new Request('https://popzbowling.com'+path,options);
}
let result=await config({env:{}});
assert.equal((await result.json()).enabled,false,'default must be sale-disabled');
assert.equal(checkoutEnabled(env),true);
assert.equal(PRICE_CENTS,999);
assert.equal(validateStripePrice({id:'price_1UbqZiBmwB4QMGDE6oIXNFL0',active:true,type:'one_time',currency:'usd',unit_amount:999,livemode:false,product:'prod_Vd6n0W8JakrQl9'},env),true);
assert.equal(validateStripePrice({id:'price_1UbqZiBmwB4QMGDE6oIXNFL0',active:true,type:'one_time',currency:'usd',unit_amount:9990,livemode:false,product:'prod_Vd6n0W8JakrQl9'},env),false);
assert.equal(validateStripePrice({id:'price_1UbqZiBmwB4QMGDE6oIXNFL0',active:true,type:'one_time',currency:'usd',unit_amount:999,livemode:true,product:'prod_Vd6n0W8JakrQl9'},env),false);
assert.equal(validateStripePrice({id:'price_1UbqZiBmwB4QMGDE6oIXNFL0',active:true,type:'one_time',currency:'usd',unit_amount:999,livemode:false,product:'prod_another'},env),false);
assert.equal(isPermanentPro({plan:'pro',status:'founder'}),true);
assert.equal(isPermanentPro({plan:'pro',status:'complimentary'}),true);
assert.equal(isPermanentPro({plan:'pro',status:'lifetime'}),true);
assert.equal(isPermanentPro({plan:'free',status:'lifetime'}),false);
assert.equal(validatePaidSession(session,env),'firebase-user-123');
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
let saved=null,permanent=null,commitCount=0,checkoutCount=0;
const checkoutInputs=[];
function mockNetwork(url,options={}){
 const uri=String(url);
 if(uri.includes('identitytoolkit.googleapis.com/'))
  return Promise.resolve(asJson({users:[{localId:'firebase-user-123',email:'buyer@example.com',emailVerified:true}]}));
 if(uri==='https://oauth2.googleapis.com/token')
  return Promise.resolve(asJson({access_token:'mock_service_account_token'}));
 if(uri.includes('/documents/users/') && uri.endsWith('/entitlements/pro')){
  if(permanent)return Promise.resolve(asJson({
   updateTime:'2026-11-14T11:00:00Z',
   fields:{plan:{stringValue:'pro'},status:{stringValue:permanent},source:{stringValue:'founder'}}
  }));
  return Promise.resolve(asJson({error:'NOT_FOUND'},404));
 }
 if(uri.endsWith('/documents:commit')){
  commitCount+=1;
  saved=JSON.parse(options.body);
  return Promise.resolve(asJson({writeResults:[{},{}]}));
 }
 if(uri.endsWith('/prices/price_1UbqZiBmwB4QMGDE6oIXNFL0'))
  return Promise.resolve(asJson({id:'price_1UbqZiBmwB4QMGDE6oIXNFL0',active:true,type:'one_time',currency:'usd',unit_amount:999,livemode:false,product:'prod_Vd6n0W8JakrQl9'}));
 if(uri.endsWith('/checkout/sessions') && options.method==='POST'){
  checkoutCount+=1;
  const fields=new URLSearchParams(options.body);
  assert.equal(fields.get('line_items[0][price]'),'price_1UbqZiBmwB4QMGDE6oIXNFL0');
  assert.equal(fields.get('client_reference_id'),'firebase-user-123');
  assert.equal(fields.get('metadata[product]'),PRODUCT_CODE);
  assert.equal(fields.get('mode'),'payment');
  assert.equal(fields.has('payment_method_types[0]'),false,'Stripe should select dynamic payment methods');
  assert.match(fields.get('integration_identifier'),/^popzbowling_[a-z]{8}$/);
  assert.match(options.headers['idempotency-key'],/^popz_lifetime_firebase-user-123_\d+$/);
  assert.equal(options.headers['stripe-version'],'2026-09-30.endive');
  checkoutInputs.push({idempotencyKey:options.headers['idempotency-key'],label:fields.get('integration_identifier')});
  return Promise.resolve(asJson({id:session.id,url:'https://checkout.stripe.com/c/pay/mock-session'}));
 }
 if(uri.includes('/checkout/sessions/cs_test_12345'))
  return Promise.resolve(asJson(session));
 throw Error('Unexpected network request: '+uri);
}
globalThis.fetch=mockNetwork;
try{
 const request=req('/api/billing/checkout',{
  method:'POST',headers:{authorization:'Bearer valid.jwt','origin':'https://popzbowling.com'},body:'{}'
 });
 result=await checkout({request,env});
 assert.equal(result.status,200);
 assert.equal((await result.json()).url,'https://checkout.stripe.com/c/pay/mock-session');
 assert.equal(checkoutCount,1);
 result=await checkout({request,env});
 assert.equal(result.status,200);
 assert.equal(checkoutCount,2);
 assert.deepEqual(checkoutInputs[0],checkoutInputs[1],'same UID/day retries must use identical Stripe idempotency inputs');
 permanent='founder';
 result=await checkout({request,env});
 assert.equal((await result.json()).alreadyPro,true);
 assert.equal(checkoutCount,2,'Founder must not be offered another charge');
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
 assert.equal(JSON.stringify(saved).includes('bowlingHistory'),false);

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
assert.equal(validatePaidSession(session,restrictedEnv),'firebase-user-123');
console.log('Stripe sandbox checkout/webhook auth, signatures, strict pricing, dynamic methods, lifetime grant, retries, and Founder protection passed');
