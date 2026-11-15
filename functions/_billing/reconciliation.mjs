// Signed Stripe refund/dispute events are reconciled against Stripe's current state.
// This module only creates append-only, private Firestore review records.
// It NEVER creates refunds, changes Pro access, or edits bowling history.
import {
 BillingError,PROJECT_ID,PRODUCT_CODE,PRICE_CENTS,CURRENCY,
 previewSandboxAccountAllowed,firestoreAccessToken,loadBillingLifetime,
 recordBillingReview,stripeRequest
} from './core.mjs';

export const REVIEW_EVENT_TYPES=new Set([
 'refund.created','refund.updated','refund.failed','charge.refunded',
 'charge.dispute.created','charge.dispute.updated','charge.dispute.closed'
]);
const isId=(id,prefix)=>typeof id==='string'&&new RegExp('^'+prefix+'_[A-Za-z0-9_]+$').test(id);
const livemodeMatches=(item,env)=>item?.livemode===/^(?:rk|sk)_live_/.test(env.STRIPE_SECRET_KEY||'');
// Stripe Refund objects omit livemode, so verify mode on the fetched PaymentIntent;
// only reject an optional resource-level mode when Stripe actually supplies it.
const optionalLivemodeMatches=(item,env)=>typeof item?.livemode!=='boolean'||livemodeMatches(item,env);

export async function reconcileStripeRiskEvent(event,env){
 if(!REVIEW_EVENT_TYPES.has(event?.type))return {ignored:true};
 const type=event.type;
 const refund=type.startsWith('refund.');
 const dispute=type.startsWith('charge.dispute.');
 const prefix=refund?'re':dispute?'dp':'ch';
 const referenceId=event?.data?.object?.id;
 if(!isId(referenceId,prefix))throw new BillingError('Invalid Stripe audit reference',400);
 // Never trust event snapshots for the latest status, amount, or account mode.
 const resource=await stripeRequest(env,
  (refund?'refunds/':dispute?'disputes/':'charges/')+encodeURIComponent(referenceId));
 if(resource.id!==referenceId || !optionalLivemodeMatches(resource,env) ||
    !Number.isSafeInteger(resource.amount) || resource.amount<0)
  throw new BillingError('Stripe audit verification failed',422);
 if(resource.currency!==CURRENCY || (refund&&resource.amount>PRICE_CENTS))
  return {ignored:true}; // Unrelated merchant payment; do not retry its webhook.
 let charge=null;
 let paymentIntentId=resource.payment_intent;
 if(!isId(paymentIntentId,'pi')){
  const chargeId=dispute||refund?resource.charge:resource.id;
  if(!isId(chargeId,'ch'))throw new BillingError('Stripe charge reference unavailable',422);
  charge=await stripeRequest(env,'charges/'+encodeURIComponent(chargeId));
  if(charge.id!==chargeId||!livemodeMatches(charge,env)||charge.currency!==CURRENCY)
   throw new BillingError('Stripe charge verification failed',422);
  paymentIntentId=charge.payment_intent;
 }
 if(!isId(paymentIntentId,'pi'))throw new BillingError('Stripe payment intent reference unavailable',422);
 const intent=await stripeRequest(env,'payment_intents/'+encodeURIComponent(paymentIntentId));
 if(intent.id!==paymentIntentId || !livemodeMatches(intent,env) ||
    intent.currency!==CURRENCY || intent.amount!==PRICE_CENTS ||
    intent.metadata?.product!==PRODUCT_CODE)
  return {ignored:true}; // Other products on the merchant's Stripe account.
 const uid=intent.metadata?.uid;
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid||'') || !previewSandboxAccountAllowed(uid,env))
  return {ignored:true};
 const access=await firestoreAccessToken(env);
 const original=await loadBillingLifetime(uid,access);
 if(original?.product!==PRODUCT_CODE || original.paymentIntentId!==paymentIntentId)
  return {ignored:true}; // Never act on unrelated or unrecognized payments.
 const status=dispute?resource.status:(refund?resource.status:
  (resource.refunded?'refunded_full':'refunded_partial'));
 if(typeof status!=='string' || !/^[a-z_]{2,40}$/.test(status))
  throw new BillingError('Invalid Stripe payment audit status',422);
 const amountCents=refund||dispute?resource.amount:resource.amount_refunded;
 if(!Number.isSafeInteger(amountCents)||amountCents<0||amountCents>PRICE_CENTS)
  throw new BillingError('Invalid Stripe payment audit amount',422);
 const kind=dispute?'dispute':refund?'refund':'charge_refunded';
 const result=await recordBillingReview(uid,access,event.id,{
  kind,status,referenceId,paymentIntentId,amountCents
 });
 return {reviewRequired:true,kind,recorded:result.recorded};
}
