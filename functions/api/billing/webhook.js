import {
 json,webhookConfigured,verifyStripeSignature,stripeRequest,
 validatePaidSession,grantStripeLifetime,errorResponse,BILLING_PREVIEW_BRANCH
} from '../../_billing/core.mjs';
import {REVIEW_EVENT_TYPES,reconcileStripeRiskEvent} from '../../_billing/reconciliation.mjs';

export async function onRequestPost({request,env}){
 if(!webhookConfigured(env))return json({ok:false,error:'Billing unavailable'},503);
 const body=await request.text();
 if(body.length>1024*1024)return json({ok:false,error:'Too large'},413);
 const valid=await verifyStripeSignature(body,request.headers.get('stripe-signature'),env.STRIPE_WEBHOOK_SECRET);
 if(!valid)return json({ok:false,error:'Invalid signature'},400);
 let event;
 try{event=JSON.parse(body)}catch{return json({ok:false,error:'Invalid event'},400)}
 if(!/^evt_[A-Za-z0-9_]+$/.test(event?.id||''))return json({ok:false,error:'Invalid event'},400);
 // Once test accounts are deleted, no replay can recreate their entitlements.
 // Continue validating Stripe's webhook signature before acknowledging the event.
 if(env.CF_PAGES_BRANCH===BILLING_PREVIEW_BRANCH && env.BILLING_PREVIEW_QA_ACTIVE!=='true')
  return json({ok:true,ignored:true,sandboxQAClosed:true});
 if(REVIEW_EVENT_TYPES.has(event.type)){
  try{return json({ok:true,...await reconcileStripeRiskEvent(event,env)})}
  catch(error){return errorResponse(error)}
 }
 if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))
  return json({ok:true,ignored:true});
 try{
  const sessionId=event?.data?.object?.id;
  if(!/^cs_(test|live)_[A-Za-z0-9_]+$/.test(sessionId||''))return json({ok:false,error:'Invalid checkout session'},400);
  const session=await stripeRequest(env,'checkout/sessions/'+encodeURIComponent(sessionId)+'?expand[]=line_items');
  if(session.payment_status==='unpaid' && event.type==='checkout.session.completed')
   return json({ok:true,pending:true});
  const uid=validatePaidSession(session,env);
  if(!uid)return json({ok:false,error:'Purchase verification failed'},422);
  const result=await grantStripeLifetime(uid,session,event.id,env);
  return json({ok:true,activated:!result.already,reviewRequired:result.duplicate===true});
 }catch(error){return errorResponse(error)}
}
export function onRequest(){return json({ok:false,error:'Method not allowed'},405)}
