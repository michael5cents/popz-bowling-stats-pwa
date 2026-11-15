// Production review readiness checks: exact host + branch + explicit feature
// gate + distinct 256-bit operator/monitor credentials. LOCAL SQLITE ONLY.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeFakeBillingReviewD1} from './helpers/billing-review-d1.mjs';
import {queueBillingReview} from '../functions/_billing/review-queue.mjs';
import {onRequestGet,onRequestPost} from '../functions/api/billing/reviews.js';

const BASE='https://popzbowling.com/api/billing/reviews';
const PREVIEW='https://stripe-lifetime-pro-preview.popzbowling.pages.dev/api/billing/reviews';
const db=makeFakeBillingReviewD1();
const prodAdmin='c'.repeat(64),prodMonitor='d'.repeat(64);
const prevAdmin='a'.repeat(64),prevMonitor='b'.repeat(64);
const production={
 CF_PAGES_BRANCH:'main',BILLING_REVIEW_PRODUCTION_ENABLED:'true',
 BILLING_REVIEW_DB:db,
 BILLING_REVIEW_ADMIN_TOKEN:prodAdmin,BILLING_REVIEW_MONITOR_TOKEN:prodMonitor
};
const preview={
 CF_PAGES_BRANCH:'stripe-lifetime-pro-preview',BILLING_REVIEW_DB:db,
 BILLING_REVIEW_ADMIN_TOKEN:prevAdmin,BILLING_REVIEW_MONITOR_TOKEN:prevMonitor
};
const request=async(env,url,token,scope='open')=>{
 const resp=await onRequestGet({env,request:new Request(url+'?scope='+scope,{
  headers:token?{authorization:'Bearer '+token}:{}
 })});
 return {code:resp.status,data:await resp.json()};
};
const update=async(env,url,token,action,id,note)=>{
 const resp=await onRequestPost({env,request:new Request(url,{
  method:'POST',
  headers:{authorization:'Bearer '+token,'content-type':'application/json'},
  body:JSON.stringify({action,id,note})
 })});
 return {code:resp.status,data:await resp.json()};
};
try{
 await queueBillingReview(production,{id:'evt_production_review_test',
  uid:'qa_customer_only',kind:'refund',status:'succeeded',referenceId:'re_qa',
  paymentIntentId:'pi_qa',amountCents:999});
 assert.equal((await request(production,BASE,null)).code,404);
 assert.equal((await request({...production,BILLING_REVIEW_PRODUCTION_ENABLED:'false'},BASE,prodAdmin)).code,404,
  'production owner must not be served before explicit launch');
 assert.equal((await request({...production,BILLING_REVIEW_PRODUCTION_ENABLED:undefined},BASE,prodAdmin)).code,404,
  'production gate must default closed');
 assert.equal((await request({...production,CF_PAGES_BRANCH:'stripe-lifetime-pro-preview'},BASE,prodAdmin)).code,404);
 assert.equal((await request(production,PREVIEW,prodAdmin)).code,404);
 assert.equal((await request(production,'https://www.popzbowling.com/api/billing/reviews',prodAdmin)).code,404);
 assert.equal((await request(production,BASE,prevAdmin)).code,404,'sandbox owner token is invalid on live host');
 assert.equal((await request(production,BASE,prevMonitor,'alerts')).code,404,'sandbox monitor token is invalid on live host');
 assert.equal((await request(preview,BASE,prevAdmin)).code,404,'production host is invalid in preview branch');
 assert.equal((await request(preview,PREVIEW,prodAdmin)).code,404,'live token is invalid on preview branch');
 assert.equal((await request({...production,BILLING_REVIEW_DB:undefined},BASE,prodAdmin)).code,503,
  'missing production D1 must fail safely');
 assert.equal((await request({...production,BILLING_REVIEW_ADMIN_TOKEN:undefined},BASE,prodAdmin)).code,404);
 const owner=await request(production,BASE,prodAdmin);
 assert.equal(owner.code,200);
 assert.equal(owner.data.reviews.length,1);
 assert.equal(owner.data.reviews[0].uid,'qa_customer_only');
 const monitor=await request(production,BASE,prodMonitor,'alerts');
 assert.equal(monitor.code,200);
 assert.equal(monitor.data.reviews.length,1);
 assert.equal(monitor.data.reviews[0].uid,undefined);
 assert.equal(monitor.data.reviews[0].paymentIntentId,undefined);
 assert.equal((await request(production,BASE,prodMonitor,'open')).code,404);
 assert.equal((await update(production,BASE,prodMonitor,'resolve',
  'evt_production_review_test','Reviewed successfully')).code,404);
 assert.equal((await update(production,BASE,prodAdmin,'mark_notified',
  'evt_production_review_test','')).code,404);
 let result=await update(production,BASE,prodMonitor,'mark_notified','evt_production_review_test','');
 assert.equal(result.code,200);
 assert.equal(result.data.changed,true);
 assert.equal((await request(production,BASE,prodMonitor,'alerts')).data.count,0);
 result=await update(production,BASE,prodAdmin,'acknowledge','evt_production_review_test','Investigating');
 assert.equal(result.code,200);
 result=await update(production,BASE,prodAdmin,'resolve','evt_production_review_test',
  'Checked original Stripe payment and verified the refund');
 assert.equal(result.code,200);
 assert.equal(result.data.reviewState,'resolved');
 assert.equal((await request(production,BASE,prodAdmin)).data.count,0);
 assert.equal((await request(production,BASE,prodAdmin,'all')).data.count,1,
  'resolved review history is retained');
 const cfg=fs.readFileSync(new URL('../wrangler.toml',import.meta.url),'utf8');
 assert.match(cfg,/\[\[env\.production\.d1_databases\]\]\nbinding = "BILLING_REVIEW_DB"\ndatabase_name = "popz-bowling-billing-review-production"\ndatabase_id = "821922f7-63cf-43a3-acb4-a446c1764c74"/);
 assert.match(cfg,/\[\[env\.preview\.d1_databases\]\]\nbinding = "BILLING_REVIEW_DB"\ndatabase_name = "popz-bowling-billing-review-preview"\ndatabase_id = "b86d17e8-6d9b-4039-af8f-2e6b8f7fb464"/);
 const ownerSrc=fs.readFileSync(new URL('../scripts/billing-review-owner.mjs',import.meta.url),'utf8');
 const agentSrc=fs.readFileSync(new URL('../monitoring/billing-telegram-alerts.mjs',import.meta.url),'utf8');
 assert.match(ownerSrc,/review-production-admin-token/);
 assert.match(ownerSrc,/argv\[0\]==='--production'/);
 assert.match(agentSrc,/billing-review-production-monitor-token/);
 assert.match(agentSrc,/process\.env\.POPZ_BILLING_ALERT_ENV\|\|'sandbox'/);
 assert.match(agentSrc,/live\?'https:\/\/popzbowling.com'/);
 const launchService=fs.readFileSync(new URL('../monitoring/systemd/popz-billing-alerts-production.service',import.meta.url),'utf8');
 assert.match(launchService,/run-billing-telegram-production\.sh/);
 console.log('PASS: production review API default-off, exact host/branch, independent D1 and tokens, separated monitoring, local incident lifecycle; no live billing enabled');
}finally{db.close()}
