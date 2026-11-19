import {PRODUCT_CODE,PRICE_CENTS,CURRENCY,stripeRequest} from './core.mjs';
export async function verifiedBillingMetrics(env){
 if(env.CF_PAGES_BRANCH!=='main'||!/^(sk|rk)_live_/.test(env.STRIPE_SECRET_KEY||''))
 return {available:false,reason:'Live Stripe production access unavailable'};
 let pages=0,after='',payments=0,grossCents=0,refundedCents=0,disputed=0;
 const customers=new Set();
 try{
  while(true){
   if(++pages>20)throw Error('Payment history exceeds verified pagination');
   const query='payment_intents?limit=100&expand[]=data.latest_charge'+(after?'&starting_after='+encodeURIComponent(after):'');
   const response=await stripeRequest(env,query);
   if(!Array.isArray(response.data)||typeof response.has_more!=='boolean')throw Error('Incomplete Stripe response');
   for(const item of response.data){
    if(item.livemode!==true||item.status!=='succeeded'||item.currency!==CURRENCY||
       item.metadata?.product!==PRODUCT_CODE||!/^[A-Za-z0-9_-]{1,128}$/.test(item.metadata?.uid||''))continue;
    const charge=item.latest_charge;
    if(!charge||typeof charge!=='object'||charge.livemode!==true||charge.paid!==true||
       charge.payment_intent!==item.id||charge.currency!==CURRENCY||
       !Number.isSafeInteger(charge.amount)||charge.amount<PRICE_CENTS||charge.amount>PRICE_CENTS*2||
       !Number.isSafeInteger(charge.amount_refunded)||charge.amount_refunded<0||
       charge.amount_refunded>charge.amount)throw Error('Unverified payment data');
    payments++;customers.add(item.metadata.uid);
    grossCents+=charge.amount;refundedCents+=charge.amount_refunded;
    if(charge.disputed)disputed++;
   }
   if(!response.has_more)break;
   if(!response.data.length||typeof response.data.at(-1)?.id!=='string')throw Error('Unverified Stripe pagination');
   after=response.data.at(-1).id;
  }
  return {available:true,customers:customers.size,payments,grossCents,refundedCents,netCents:grossCents-refundedCents,disputed};
 }catch{return {available:false,reason:'Stripe verification unavailable; totals withheld instead of reported as zero'};}
}
