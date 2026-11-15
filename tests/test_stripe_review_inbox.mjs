import assert from 'node:assert/strict';
import {makeFakeBillingReviewD1} from './helpers/billing-review-d1.mjs';
import {queueBillingReview} from '../functions/_billing/review-queue.mjs';
import {onRequestGet,onRequestPost} from '../functions/api/billing/reviews.js';

const BASE='https://stripe-lifetime-pro-preview.popzbowling.pages.dev/api/billing/reviews';
const db=makeFakeBillingReviewD1();
const env={CF_PAGES_BRANCH:'stripe-lifetime-pro-preview',BILLING_REVIEW_DB:db,
 BILLING_REVIEW_ADMIN_TOKEN:'a'.repeat(64),BILLING_REVIEW_MONITOR_TOKEN:'b'.repeat(64)};
const auth=role=>({authorization:'Bearer '+(role==='admin'?env.BILLING_REVIEW_ADMIN_TOKEN:env.BILLING_REVIEW_MONITOR_TOKEN)});
const get=async(role,scope='open',ctx=env,url=BASE)=>{
 const headers=role?auth(role):{};
 const r=await onRequestGet({env:ctx,request:new Request(url+'?scope='+scope,{headers})});
 return {status:r.status,data:await r.json()};
};
const post=async(role,body,ctx=env)=>{
 const r=await onRequestPost({env:ctx,request:new Request(BASE,{
  method:'POST',headers:{...auth(role),'content-type':'application/json'},body:JSON.stringify(body)
 })});
 return {status:r.status,data:await r.json()};
};
const first={id:'evt_qa_alert1',uid:'uid_safe_1',kind:'refund',status:'succeeded',
 referenceId:'re_fake1',paymentIntentId:'pi_fake1',amountCents:999};
const stale={id:'checkout_'+'a'.repeat(32),uid:'uid_safe_2',
 kind:'checkout_uncertain',status:'locked_manual_review',
 referenceId:'checkout:'+'a'.repeat(32),paymentIntentId:null,amountCents:999};
try{
 const queued=await queueBillingReview(env,first);
 assert.equal(queued.firstEnqueue,true);
 assert.equal((await queueBillingReview(env,first)).firstEnqueue,false,'a Stripe webhook replay cannot duplicate the incident');
 await assert.rejects(()=>queueBillingReview(env,{...first,uid:'another_uid'}),/review queue unavailable/,'id collision must fail closed');
 await queueBillingReview(env,stale);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM billing_reviews').get().n,2);
 assert.equal((await get(null)).status,404,'anonymous access cannot read billing reports');
 assert.equal((await get('admin','open',{...env,CF_PAGES_BRANCH:'main'})).status,404,'production branch cannot serve preview inbox');
 assert.equal((await get('admin','open',env,'https://popzbowling.com/api/billing/reviews')).status,404,'production origin cannot access preview inbox');
 assert.equal((await get('monitor','open')).status,404,'notification agent must not see customer UIDs');
 const alerts=await get('monitor','alerts');
 assert.equal(alerts.status,200);
 assert.equal(alerts.data.count,2);
 assert.equal(alerts.data.reviews[0].uid,undefined,'Telegram agent never receives Firebase user identifiers');
 assert.equal(alerts.data.reviews[0].paymentIntentId,undefined);
 const owner=await get('admin','open');
 assert.equal(owner.status,200);
 assert.equal(owner.data.reviews[0].uid,first.uid);
 assert.equal(owner.data.reviews[0].reviewState,'manual_review_required');
 assert.equal((await post('monitor',{action:'resolve',id:first.id,note:'It was reviewed'})).status,404,'monitor cannot resolve billing reviews');
 assert.equal((await post('admin',{action:'mark_notified',id:first.id})).status,404,'owner token cannot impersonate Telegram monitor');
 let response=await post('monitor',{action:'mark_notified',id:first.id});
 assert.equal(response.status,200);
 assert.equal(response.data.changed,true);
 assert.equal(response.data.alertState,'notified');
 response=await post('monitor',{action:'mark_notified',id:first.id});
 assert.equal(response.data.changed,false,'repeated receipt confirmation must not double-count');
 assert.equal((await get('monitor','alerts')).data.count,1);
 response=await post('admin',{action:'acknowledge',id:first.id,note:'Inspect Stripe'});
 assert.equal(response.status,200);
 assert.equal(response.data.reviewState,'acknowledged');
 response=await post('admin',{action:'resolve',id:first.id,note:'Checked the Stripe refund in sandbox; no customer impact'});
 assert.equal(response.status,200);
 assert.equal(response.data.reviewState,'resolved');
 assert.equal((await get('admin','open')).data.count,1,'resolved review must leave the open queue');
 assert.equal((await get('admin','all')).data.count,2,'resolution preserves permanent audit record');
 response=await post('admin',{action:'resolve',id:first.id,note:'already resolved, no side effects'});
 assert.equal(response.data.changed,false,'resolution must be idempotent');
 assert.equal((await post('admin',{action:'resolve',id:stale.id,note:'too'})).status,400,'resolution requires a substantive note');
 assert.equal((await post('admin',{action:'resolve',id:stale.id,note:'<script>alert(1)</script>'})).status,400,'control characters/HTML are rejected');
 const before=db.sqlite.prepare('SELECT review_state FROM billing_reviews WHERE id=?').get(stale.id);
 assert.equal(before.review_state,'manual_review_required','a stale payment stays blocked without explicit review');
 db.failWrites=true;
 await assert.rejects(()=>queueBillingReview(env,{...first,id:'evt_qa_alertfailed'}),/unavailable/,'D1 outage must fail Stripe webhook rather than lose alert');
 db.failWrites=false;
 console.log('PASS: durable D1 review queue, Stripe event replay, auth isolation, Telegram pending/read/mark, owner ack/resolve, history retention and outage retry');
}finally{db.close()}
