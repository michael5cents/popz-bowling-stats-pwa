import assert from 'node:assert/strict';
import {reserveLifetimeCheckout,CHECKOUT_SECONDS,RETRY_SECONDS,IDEMPOTENCY_SAFETY_SECONDS} from '../functions/_billing/checkout-reservation.mjs';
import {makeFakeBillingReviewD1} from './helpers/billing-review-d1.mjs';

const origin='https://stripe-lifetime-pro-preview.popzbowling.pages.dev';
const uid='qa_reservation_exclusive_test';
const env={
 CF_PAGES_BRANCH:'stripe-lifetime-pro-preview',STRIPE_SECRET_KEY:'rk_test_mock_server_key',
 STRIPE_LIFETIME_PRICE_ID:'price_mock_lifetime'
};
const start=Math.floor(Date.UTC(2026,10,14,23,59,0)/1000);
const input=(h,nowSeconds=start)=>({
 uid,email:'res_test@example.com',origin,token:'mock_firestore_access',env:{...env,BILLING_REVIEW_DB:h.reviewDB},nowSeconds
});
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
function newHarness(){
 let savedDoc=null,version=0,postCalls=0,creates=0,failOnce='',failOnRead=false;
 const sessions=new Map(),byKey=new Map(),stripeFields=new Map();
 const reviewDB=makeFakeBillingReviewD1();
 const commits=[];
 const fetchFn=async (url,opts={})=>{
  const addr=String(url),method=opts.method||'GET';
  if(addr.endsWith('/billing/checkoutReservation')&&method==='GET'){
   if(failOnRead)return json({error:'unavailable'},503);
   return savedDoc?json(savedDoc):json({error:'NOT_FOUND'},404);
  }
  if(addr.endsWith('/documents:commit')&&method==='POST'){
   const writes=JSON.parse(opts.body).writes;
   assert.equal(writes.length,1,'must never write bowling history or entitlement');
   const w=writes[0];
   assert.match(w.update.name,/\/users\/qa_reservation_exclusive_test\/billing\/checkoutReservation$/);
   const pre=w.currentDocument;
   if(pre.exists===false && savedDoc || pre.updateTime && pre.updateTime!==savedDoc?.updateTime)
    return json({error:{status:'FAILED_PRECONDITION'}},400);
   version++;
   savedDoc={fields:w.update.fields,updateTime:'2026-11-14T00:00:00.'+String(version).padStart(3,'0')+'Z'};
   commits.push(JSON.parse(JSON.stringify({pre,fields:w.update.fields})));
   return json({writeResults:[{updateTime:savedDoc.updateTime}]});
  }
  if(addr.endsWith('/checkout/sessions')&&method==='POST'){
   postCalls++;
   if(failOnce==='before'){
    failOnce='';
    throw new Error('simulated Stripe connectivity loss before create');
   }
   const fields=new URLSearchParams(opts.body);
   const idem=opts.headers['idempotency-key'];
   assert.match(idem,/^popz_lifetime_reservation_[0-9a-f]{32}$/);
   assert.equal(fields.get('mode'),'payment');
   assert.equal(fields.get('metadata[reservationNonce]'),idem.slice(-32));
   assert.equal(fields.get('expires_at'),savedDoc.fields.expiresAtSeconds.integerValue);
   assert.equal(fields.has('payment_method_types'),false);
   let session=byKey.get(idem);
   if(session)assert.equal(stripeFields.get(idem),fields.toString(),'identical Stripe idempotency key must always reuse identical parameters');
   if(!session){
    creates++;
    session={
     id:'cs_test_reserve_'+creates,
     url:'https://checkout.stripe.com/c/pay/qa-reserve-'+creates,
     client_reference_id:fields.get('client_reference_id'),
     metadata:{
      uid:fields.get('metadata[uid]'),product:fields.get('metadata[product]'),
      reservationNonce:fields.get('metadata[reservationNonce]')
     },
     mode:'payment',currency:'usd',amount_total:999,livemode:false,
     expires_at:Number(fields.get('expires_at')),status:'open',payment_status:'unpaid',
    };
    sessions.set(session.id,session);
    byKey.set(idem,session);
    stripeFields.set(idem,fields.toString());
   }
   if(failOnce==='after'){
    failOnce='';
    throw new Error('simulated response loss after Stripe created Checkout Session');
   }
   return json(session);
  }
  if(addr.includes('/checkout/sessions/') && method==='GET'){
   const id=addr.split('/').pop();
   const session=sessions.get(id);
   return session?json(session):json({error:'NOT_FOUND'},404);
  }
  throw new Error('Unexpected network request: '+method+' '+addr);
 };
 return {
  fetchFn,reviewDB,get state(){return {
   savedDoc,version,postCalls,creates,commits,sessions,byKey
  }},
  set failOnce(value){failOnce=value},
  set failOnRead(value){failOnRead=value},
  session(id){return sessions.get(id)},
 };
}
async function withHarness(fn){
 const h=newHarness(),prior=globalThis.fetch;
 globalThis.fetch=h.fetchFn;
 try{await fn(h)}finally{globalThis.fetch=prior;h.reviewDB.close()}
}
await withHarness(async h=>{
 const results=await Promise.allSettled([
  reserveLifetimeCheckout(input(h)),
  reserveLifetimeCheckout(input(h))
 ]);
 const wins=results.filter(x=>x.status==='fulfilled');
 const failed=results.filter(x=>x.status==='rejected');
 assert.equal(h.state.creates,1,'concurrent tabs must not create multiple Stripe sessions');
 assert(wins.length>=1);
 assert(failed.every(x=>x.reason?.status===409),'losing request should get safe retry result');
 const first=wins[0].value;
 assert.match(first.url,/^https:\/\/checkout\.stripe\.com\//);
 assert.equal(h.state.commits.length,2,'create-only reservation and update-to-open');
 const retry=await reserveLifetimeCheckout(input(h,start+60));
 assert.deepEqual(retry,{url:first.url,reused:true},'another device reuses same hosted Checkout URL');
 const afterMidnight=await reserveLifetimeCheckout(input(h,start+120));
 assert.equal(afterMidnight.url,first.url,'UTC day boundary must not create a second charge');
 assert.equal(h.state.creates,1);
 assert.equal(h.state.postCalls,1);
 const active=h.session('cs_test_reserve_1');
 active.status='complete';active.payment_status='unpaid';active.url=null;
 const pending=await reserveLifetimeCheckout(input(h,start+180));
 assert.equal(pending.paymentProcessing,true,'complete but asynchronous unpaid blocks another checkout');
 active.payment_status='paid';
 const completed=await reserveLifetimeCheckout(input(h,start+181));
 assert.equal(completed.paymentProcessing,true,'paid but unfulfilled blocks another checkout');
 assert.equal(h.state.creates,1);
});
console.log('PASS: simultaneous first requests, duplicate browser/device reuse, midnight boundary, paid and asynchronous payment');

await withHarness(async h=>{
 const first=await reserveLifetimeCheckout(input(h));
 const existing=h.session('cs_test_reserve_1');
 existing.status='expired';existing.payment_status='unpaid';existing.url=null;
 const now=start+CHECKOUT_SECONDS+61;
 const results=await Promise.allSettled([
  reserveLifetimeCheckout(input(h,now)),
  reserveLifetimeCheckout(input(h,now))
 ]);
 assert.equal(h.state.creates,2,'only one new Session may follow Stripe-confirmed expired/unpaid');
 const success=results.find(r=>r.status==='fulfilled');
 assert(success);
 assert.notEqual(success.value.url,first.url);
 assert.equal(h.state.commits.length,4,'CAS must serialize the expired-session replacement');
 const follow=await reserveLifetimeCheckout(input(h,now+60));
 assert.equal(follow.url,success.value.url,'new session reused after safe rotation');
 assert.equal(h.state.creates,2);
});
console.log('PASS: Stripe-confirmed expiry allows one atomic renewal despite concurrent callers');

await withHarness(async h=>{
 h.failOnce='after';
 await assert.rejects(()=>reserveLifetimeCheckout(input(h)),/response loss/);
 assert.equal(h.state.creates,1,'Stripe created first session despite network response loss');
 assert.equal(h.state.savedDoc.fields.state.stringValue,'creating');
 await assert.rejects(()=>reserveLifetimeCheckout(input(h,start+3)),e=>e.status===409);
 const recovered=await reserveLifetimeCheckout(input(h,start+RETRY_SECONDS+1));
 assert.equal(recovered.url,'https://checkout.stripe.com/c/pay/qa-reserve-1');
 assert.equal(h.state.creates,1,'recovery must reuse original idempotency key');
 assert.equal(h.state.postCalls,2,'recovery reissues exact idempotent call');
 assert.equal(h.state.savedDoc.fields.state.stringValue,'open');
});
console.log('PASS: lost Stripe response recovered with same idempotency key; no new session');

await withHarness(async h=>{
 h.failOnce='before';
 await assert.rejects(()=>reserveLifetimeCheckout(input(h)),/connectivity loss/);
 const count=h.state.postCalls;
 await assert.rejects(()=>reserveLifetimeCheckout(input(h,start+IDEMPOTENCY_SAFETY_SECONDS+1)),
  err=>err?.status===409,'unknown >20-hour session creation outcome must remain blocked');
 assert.equal(h.state.creates,0);
 assert.equal(h.state.postCalls,count,'no Stripe retries after idempotency safety window');
 assert.equal(h.reviewDB.sqlite.prepare("SELECT COUNT(*) n FROM billing_reviews WHERE kind='checkout_uncertain'").get().n,1,
  'Only one durable owner alert must be queued when Stripe creation outcome is uncertain');
 await assert.rejects(()=>reserveLifetimeCheckout(input(h,start+IDEMPOTENCY_SAFETY_SECONDS+2)),
  err=>err?.status===409);
 assert.equal(h.reviewDB.sqlite.prepare('SELECT COUNT(*) n FROM billing_reviews').get().n,1,
  'repeated stale checkout must not flood the inbox');
});
console.log('PASS: stuck creation fails closed after Stripe idempotency safety window');

await withHarness(async h=>{
 await reserveLifetimeCheckout(input(h));
 const active=h.session('cs_test_reserve_1');
 active.metadata.uid='another_user';
 await assert.rejects(()=>reserveLifetimeCheckout(input(h,start+80)),err=>err?.status===409);
 assert.equal(h.state.creates,1,'tampered Stripe identity must never open a second session');
});
console.log('PASS: tampered Session identity fails closed without a new charge');

await withHarness(async h=>{
 await reserveLifetimeCheckout(input(h));
 const active=h.session('cs_test_reserve_1');
 const later=start+CHECKOUT_SECONDS+15;
 await assert.rejects(()=>reserveLifetimeCheckout(input(h,later)),err=>err?.status===409,
  'local clock passing the expiry date must not replace Stripe Session while Stripe reports open');
 assert.equal(h.state.creates,1);
 active.status='expired';active.payment_status='paid';
 await assert.rejects(()=>reserveLifetimeCheckout(input(h,later)),err=>err?.status===409,
  'even an expired Stripe Session with paid status must never be rotated');
 assert.equal(h.state.creates,1);
});
console.log('PASS: local expiration and unexpected paid/expired combinations never create a second session');


await withHarness(async h=>{
 h.failOnRead=true;
 await assert.rejects(()=>reserveLifetimeCheckout(input(h)),err=>err?.status===503);
 assert.equal(h.state.creates,0,'Firestore outage must block payment entirely');
});
console.log('PASS: Firestore availability is required to begin checkout');
