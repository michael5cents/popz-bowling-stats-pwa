import {
 json,checkoutEnabled,BillingError,errorResponse,authenticatedFirebaseUser,
 firestoreAccessToken,loadEntitlement,loadBillingLifetime,isPermanentPro,stripeRequest,
 validateStripePrice,allowedCheckoutOrigin,previewSandboxAccountAllowed
} from '../../_billing/core.mjs';
import {reserveLifetimeCheckout} from '../../_billing/checkout-reservation.mjs';

export async function onRequestPost({request,env}){
 try{
  if(!checkoutEnabled(env))throw new BillingError('Billing disabled',503);
  // Only the specific sandbox branch may use test Stripe keys.
  // Production must run with a live key on the production branch only.
  const checkoutOrigin=allowedCheckoutOrigin(request,env);
  const user=await authenticatedFirebaseUser(request,env);
  if(!previewSandboxAccountAllowed(user.uid,env))throw new BillingError('Sandbox checkout restricted to QA account',403);
  const access=await firestoreAccessToken(env);
  const existing=await loadEntitlement(user.uid,access);
  if(isPermanentPro(existing))return json({ok:true,alreadyPro:true});
  // A prior canonical Stripe payment must never be charged again simply because
  // entitlement processing was delayed or a user-facing cache is stale.
  const previous=await loadBillingLifetime(user.uid,access);
  if(previous)return json({ok:true,alreadyPro:true});
  const price=await stripeRequest(env,'prices/'+encodeURIComponent(env.STRIPE_LIFETIME_PRICE_ID));
  if(!validateStripePrice(price,env))throw new BillingError('Unexpected Stripe price',503);
  // Firestore compare-and-set reserves this verified UID before any Stripe session
  // can be created. Multiple tabs/days/devices can only reuse the same session,
  // until Stripe confirms it expired without payment.
  const result=await reserveLifetimeCheckout({uid:user.uid,email:user.email,
   origin:checkoutOrigin,token:access,env});
  return json({ok:true,...result});
 }catch(error){return errorResponse(error)}
}
export function onRequest(){return json({ok:false,error:'Method not allowed'},405)}
