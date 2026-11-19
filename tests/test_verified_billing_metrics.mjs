import assert from 'node:assert/strict';
import {verifiedBillingMetrics} from '../functions/_billing/verified-metrics.mjs';
const original=globalThis.fetch;
const pay=(id,uid,refund=0)=>({id,status:'succeeded',livemode:true,currency:'usd',metadata:{product:'popz_bowling_lifetime_v1',uid},latest_charge:{paid:true,livemode:true,currency:'usd',payment_intent:id,amount:999,amount_refunded:refund,disputed:false}});
try{
 globalThis.fetch=async()=>new Response(JSON.stringify({data:[pay('pi_1','a'),pay('pi_2','a',100),pay('pi_3','b'),{...pay('pi_4','c'),livemode:false}],has_more:false}),{status:200});
 const a=await verifiedBillingMetrics({CF_PAGES_BRANCH:'main',STRIPE_SECRET_KEY:'sk_live_fake'});
 assert.equal(a.available,true);assert.equal(a.customers,2);assert.equal(a.payments,3);
 assert.equal(a.grossCents,2997);assert.equal(a.refundedCents,100);assert.equal(a.netCents,2897);
 assert.equal((await verifiedBillingMetrics({CF_PAGES_BRANCH:'main',STRIPE_SECRET_KEY:'sk_test_fake'})).available,false);
 globalThis.fetch=async()=>new Response('{}',{status:500});
 assert.equal((await verifiedBillingMetrics({CF_PAGES_BRANCH:'main',STRIPE_SECRET_KEY:'sk_live_fake'})).available,false);
}finally{globalThis.fetch=original}
console.log('verified live Stripe metrics tests passed');
