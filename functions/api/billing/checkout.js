import {
 json,checkoutEnabled,BillingError,errorResponse,authenticatedFirebaseUser,
 firestoreAccessToken,loadEntitlement,isPermanentPro,stripeRequest,
 validateStripePrice,PUBLIC_ORIGIN,PRODUCT_CODE
} from '../../_billing/core.mjs';

export async function onRequestPost({request,env}){
 try{
  if(!checkoutEnabled(env))throw new BillingError('Billing disabled',503);
  const url=new URL(request.url);
  // Never charge from a preview deployment or untrusted origin.
  if(url.origin!==PUBLIC_ORIGIN || (request.headers.get('origin') && request.headers.get('origin')!==PUBLIC_ORIGIN))
   throw new BillingError('Unsupported purchase origin',403);
  const user=await authenticatedFirebaseUser(request,env);
  const access=await firestoreAccessToken(env);
  const existing=await loadEntitlement(user.uid,access);
  if(isPermanentPro(existing))return json({ok:true,alreadyPro:true});
  const price=await stripeRequest(env,'prices/'+encodeURIComponent(env.STRIPE_LIFETIME_PRICE_ID));
  if(!validateStripePrice(price,env))throw new BillingError('Unexpected Stripe price',503);
  // Retry of the same account's checkout within a UTC day reuses one Stripe Session.
  const day=Math.floor(Date.now()/86400000);
  const idempotencyKey='popz_lifetime_'+user.uid+'_'+day;
  // The integration label must remain identical on retries using the same idempotency key.
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(idempotencyKey)));
  const letters=Array.from(digest.slice(0,8),n=>String.fromCharCode(97+n%26)).join('');
  const checkout=await stripeRequest(env,'checkout/sessions',{
   method:'POST',idempotencyKey,fields:{
    mode:'payment',
    integration_identifier:'popzbowling_'+letters,
    'line_items[0][price]':env.STRIPE_LIFETIME_PRICE_ID,
    'line_items[0][quantity]':'1',
    client_reference_id:user.uid,
    customer_email:user.email,
    'metadata[uid]':user.uid,
    'metadata[product]':PRODUCT_CODE,
    'payment_intent_data[metadata][uid]':user.uid,
    'payment_intent_data[metadata][product]':PRODUCT_CODE,
    success_url:PUBLIC_ORIGIN+'/payment/success/',
    cancel_url:PUBLIC_ORIGIN+'/payment/cancel/',
   }
  });
  if(!checkout?.id?.startsWith('cs_')||!checkout?.url?.startsWith('https://checkout.stripe.com/'))
   throw new BillingError('Unexpected payment redirect',503);
  return json({ok:true,url:checkout.url});
 }catch(error){return errorResponse(error)}
}
export function onRequest(){return json({ok:false,error:'Method not allowed'},405)}
