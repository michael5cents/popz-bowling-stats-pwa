// Durable, per-Firebase-UID reservation for Popz Bowling one-time Stripe Checkout.
// Cloudflare Workers are stateless: Firestore compare-and-set is the concurrency gate.
// Never generate a second Stripe session while a first session can still be paid.
import {
 BillingError,PRODUCT_CODE,PRICE_CENTS,CURRENCY,PROJECT_ID,
 stripeRequest
} from './core.mjs';

const FIRESTORE_API='https://firestore.googleapis.com/v1';
const RESERVATION_PATH='billing/checkoutReservation';
export const CHECKOUT_SECONDS=45*60;
export const RETRY_SECONDS=10;
export const IDEMPOTENCY_SAFETY_SECONDS=20*60*60; // Stripe retains keys for ~24 hours.
const isSafeUid=uid=>/^[A-Za-z0-9_-]{1,128}$/.test(uid||'');
const readField=(fields,key)=>fields?.[key]?.stringValue||null;
const readInt=(fields,key)=>{
 const value=fields?.[key]?.integerValue;
 return value!==undefined && /^\d+$/.test(String(value))?Number(value):NaN;
};
const stringField=value=>({stringValue:String(value)});
const intField=value=>({integerValue:String(value)});
const pathOf=uid=>'projects/'+PROJECT_ID+'/databases/(default)/documents/users/'+encodeURIComponent(uid)+'/'+RESERVATION_PATH;
const fail=()=>{throw new BillingError('Checkout needs a secure review before another payment',409)};
const isConflict=status=>[400,409,412].includes(status);

function validateReservation(res,uid,env){
 if(!res||res.uid!==uid||res.product!==PRODUCT_CODE||res.priceId!==env.STRIPE_LIFETIME_PRICE_ID||
  !['creating','open'].includes(res.state)||!/^[a-f0-9]{32}$/.test(res.nonce||'')||
  !Number.isSafeInteger(res.createdAtSeconds)||!Number.isSafeInteger(res.expiresAtSeconds)||
  res.expiresAtSeconds<=res.createdAtSeconds+1800 ||
  res.expiresAtSeconds>res.createdAtSeconds+24*3600 ||
  !res.email||!res.origin?.startsWith('https://')||!res.updateTime)fail();
 return res;
}

export async function loadCheckoutReservation(uid,token){
 if(!isSafeUid(uid))throw new BillingError('Invalid billing identity',403);
 const response=await fetch(FIRESTORE_API+'/'+pathOf(uid),{
  headers:{authorization:'Bearer '+token}
 });
 if(response.status===404)return null;
 if(!response.ok)throw new BillingError('Cannot check pending Checkout',503);
 const doc=await response.json();
 const f=doc.fields||{};
 return {uid:readField(f,'uid'),product:readField(f,'product'),priceId:readField(f,'priceId'),
  state:readField(f,'state'),nonce:readField(f,'nonce'),email:readField(f,'email'),
  origin:readField(f,'origin'),sessionId:readField(f,'sessionId'),
  createdAtSeconds:readInt(f,'createdAtSeconds'),expiresAtSeconds:readInt(f,'expiresAtSeconds'),
  updateTime:doc.updateTime};
}

function newReservation(uid,email,origin,env,nowSeconds){
 if(!isSafeUid(uid)||!email||origin!=='https://popzbowling.com'&&
   origin!=='https://stripe-lifetime-pro-preview.popzbowling.pages.dev')fail();
 return {uid,email,origin,product:PRODUCT_CODE,priceId:env.STRIPE_LIFETIME_PRICE_ID,
  state:'creating',nonce:[...crypto.getRandomValues(new Uint8Array(16))]
   .map(n=>n.toString(16).padStart(2,'0')).join(''),
  sessionId:null,createdAtSeconds:nowSeconds,expiresAtSeconds:nowSeconds+CHECKOUT_SECONDS};
}

async function commitReservation(uid,token,res,precondition){
 const fields={
  uid:stringField(res.uid),product:stringField(res.product),priceId:stringField(res.priceId),
  state:stringField(res.state),nonce:stringField(res.nonce),email:stringField(res.email),
  origin:stringField(res.origin),createdAtSeconds:intField(res.createdAtSeconds),
  expiresAtSeconds:intField(res.expiresAtSeconds)
 };
 if(res.sessionId)fields.sessionId=stringField(res.sessionId);
 const response=await fetch(FIRESTORE_API+'/projects/'+PROJECT_ID+'/databases/(default)/documents:commit',{
  method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},
  body:JSON.stringify({writes:[{update:{name:pathOf(uid),fields},currentDocument:precondition}]})
 });
 if(isConflict(response.status))return {conflict:true};
 if(!response.ok)throw new BillingError('Cannot reserve Checkout safely',503);
 const committed=await response.json();
 let updateTime=committed.writeResults?.[0]?.updateTime;
 if(!updateTime){
  const readBack=await loadCheckoutReservation(uid,token);
  if(readBack?.nonce!==res.nonce||readBack?.state!==res.state)fail();
  updateTime=readBack.updateTime;
 }
 if(!updateTime)fail();
 return {...res,updateTime};
}
export function checkoutIdempotencyKey(res){
 return 'popz_lifetime_reservation_'+res.nonce;
}
function verifySession(session,res,env){
 if(!/^cs_(?:test|live)_[A-Za-z0-9_]+$/.test(session?.id||'')||
    session.client_reference_id!==res.uid||session.metadata?.uid!==res.uid||
    session.metadata?.product!==PRODUCT_CODE||
    session.metadata?.reservationNonce!==res.nonce ||
    session.mode!=='payment' || session.livemode!==/^(?:sk|rk)_live_/.test(env.STRIPE_SECRET_KEY||'') ||
    session.currency!==CURRENCY || session.amount_total!==PRICE_CENTS ||
    !Number.isSafeInteger(session.expires_at) ||
    session.expires_at!==res.expiresAtSeconds)fail();
 return session;
}
async function createStripeSession(res,accessToken,env){
 const idempotencyKey=checkoutIdempotencyKey(res);
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(idempotencyKey)));
 const letters=Array.from(digest.slice(0,8),n=>String.fromCharCode(97+n%26)).join('');
 const session=await stripeRequest(env,'checkout/sessions',{
  method:'POST',idempotencyKey,fields:{
   mode:'payment',integration_identifier:'popzbowling_'+letters,
   'line_items[0][price]':res.priceId,'line_items[0][quantity]':'1',
   client_reference_id:res.uid,customer_email:res.email,
   'metadata[uid]':res.uid,'metadata[product]':PRODUCT_CODE,
   'metadata[reservationNonce]':res.nonce,
   'payment_intent_data[metadata][uid]':res.uid,
   'payment_intent_data[metadata][product]':PRODUCT_CODE,
   success_url:res.origin+'/payment/success/',
   cancel_url:res.origin+'/payment/cancel/',
   expires_at:String(res.expiresAtSeconds)
  }
 });
 verifySession(session,res,env);
 if(session.status!=='open'||session.payment_status!=='unpaid'||
   !session.url?.startsWith('https://checkout.stripe.com/'))fail();
 const updated=await commitReservation(res.uid,accessToken,{...res,state:'open',sessionId:session.id},
  {updateTime:res.updateTime});
 if(updated.conflict){
  const after=await loadCheckoutReservation(res.uid,accessToken);
  if(after?.nonce===res.nonce&&after?.state==='open'&&after?.sessionId===session.id)
   return {url:session.url,reused:true};
  fail();
 }
 return {url:session.url,reused:false};
}
async function resolveExisting(res,uid,origin,token,env,nowSeconds){
 validateReservation(res,uid,env);
 if(res.origin!==origin)fail();
 if(res.state==='creating'){
  if(res.sessionId)fail();
  // An in-flight request holds the reservation. A later retry can recover
  // the same Stripe idempotency key; never mint a new one for an unknown result.
  const age=nowSeconds-res.createdAtSeconds;
  if(age<RETRY_SECONDS)throw new BillingError('Checkout is starting. Try again shortly.',409);
  if(age<0||age>=IDEMPOTENCY_SAFETY_SECONDS)fail();
  return createStripeSession(res,token,env);
 }
 if(!res.sessionId)fail();
 const session=verifySession(await stripeRequest(env,
  'checkout/sessions/'+encodeURIComponent(res.sessionId)),res,env);
 if(session.status==='open'&&session.payment_status==='unpaid'){
  if(session.expires_at<=nowSeconds)throw new BillingError('Checkout expiration is being confirmed; retry shortly',409);
  if(!session.url?.startsWith('https://checkout.stripe.com/'))fail();
  return {url:session.url,reused:true};
 }
 if(session.status==='complete'){
  return {paymentProcessing:true}; // Async and recently settled payments cannot be charged again.
 }
 if(session.status!=='expired'||session.payment_status!=='unpaid')fail();
 // Only a *Stripe-confirmed* expired/unpaid session may be replaced.
 // Firestore updateTime CAS ensures two callers cannot both rotate the lock.
 const renewal=newReservation(uid,res.email,res.origin,env,nowSeconds);
 const saved=await commitReservation(uid,token,renewal,{updateTime:res.updateTime});
 if(saved.conflict)throw new BillingError('Checkout changed. Try again shortly.',409);
 return createStripeSession(saved,token,env);
}
export async function reserveLifetimeCheckout({uid,email,origin,token,env,nowSeconds=Math.floor(Date.now()/1000)}){
 if(!isSafeUid(uid)||!Number.isSafeInteger(nowSeconds))fail();
 const existing=await loadCheckoutReservation(uid,token);
 if(existing)return resolveExisting(existing,uid,origin,token,env,nowSeconds);
 const reservation=newReservation(uid,email,origin,env,nowSeconds);
 const saved=await commitReservation(uid,token,reservation,{exists:false});
 if(!saved.conflict)return createStripeSession(saved,token,env);
 // A concurrent tab/device won the atomic create. Never create a second session.
 const winner=await loadCheckoutReservation(uid,token);
 if(!winner)throw new BillingError('Checkout is starting. Try again shortly.',409);
 return resolveExisting(winner,uid,origin,token,env,nowSeconds);
}
