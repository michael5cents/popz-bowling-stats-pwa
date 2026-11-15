// Server-only billing helpers. Not included in the public browser bundle.
export const PRODUCT_CODE='popz_bowling_lifetime_v1';
export const PRICE_CENTS=999;
export const CURRENCY='usd';
export const PROJECT_ID='popz-bowling-stats';
export const PUBLIC_ORIGIN='https://popzbowling.com';
export const BILLING_PREVIEW_ORIGIN='https://stripe-lifetime-pro-preview.popzbowling.pages.dev';
export const BILLING_PREVIEW_BRANCH='stripe-lifetime-pro-preview';
const BILLING_SANDBOX_QA_UID='popz_preview_e2e_20261114';
export const previewSandboxAccountAllowed=(uid,env={})=>env.CF_PAGES_BRANCH!==BILLING_PREVIEW_BRANCH || uid===BILLING_SANDBOX_QA_UID;
const STRIPE_API='https://api.stripe.com/v1';
const stripeKeyValid=key=>/^(?:sk|rk)_(?:test|live)_/.test(key||'');
const stripeIsLive=key=>/^(?:sk|rk)_live_/.test(key||'');
const FIRESTORE_API='https://firestore.googleapis.com/v1';

export function json(body,status=200){
 return new Response(JSON.stringify(body),{status,headers:{
  'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0',
  'x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow'
 }});
}
export class BillingError extends Error{
 constructor(message,status=500){super(message);this.status=status}
}
export function billingEnvironmentSafe(env={}){
 if(env.CF_PAGES_BRANCH===BILLING_PREVIEW_BRANCH)return /^(?:sk|rk)_test_/.test(env.STRIPE_SECRET_KEY||'');
 if(env.CF_PAGES_BRANCH==='main')return /^(?:sk|rk)_live_/.test(env.STRIPE_SECRET_KEY||'');
 return false;
}
export function allowedCheckoutOrigin(request,env={}){
 const origin=new URL(request.url).origin;
 const requestOrigin=request.headers.get('origin');
 if(requestOrigin && requestOrigin!==origin)throw new BillingError('Unsupported purchase origin',403);
 if(origin===BILLING_PREVIEW_ORIGIN && env.CF_PAGES_BRANCH===BILLING_PREVIEW_BRANCH && billingEnvironmentSafe(env))
  return BILLING_PREVIEW_ORIGIN;
 if(origin===PUBLIC_ORIGIN && env.CF_PAGES_BRANCH==='main' && billingEnvironmentSafe(env))
  return PUBLIC_ORIGIN;
 throw new BillingError('Unsupported purchase origin',403);
}
export function webhookConfigured(env={}){
 return billingEnvironmentSafe(env)
  && /^whsec_/.test(env.STRIPE_WEBHOOK_SECRET||'')
  && /^price_[A-Za-z0-9]+$/.test(env.STRIPE_LIFETIME_PRICE_ID||'')
  && !!env.FIREBASE_SERVICE_ACCOUNT_JSON;
}
export function checkoutEnabled(env={}){
 return env.BILLING_CHECKOUT_ENABLED==='true' && webhookConfigured(env)
  && !!env.FIREBASE_WEB_API_KEY;
}
export function isPermanentPro(entitlement){
 return entitlement?.plan==='pro'
  && ['founder','complimentary','lifetime'].includes(entitlement?.status);
}
export function secureEqual(a,b){
 if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;
 let difference=0;for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);
 return difference===0;
}
export async function verifyStripeSignature(raw,header,secret,nowMs=Date.now()){
 if(!header||!secret||typeof raw!=='string')return false;
 const fields=header.split(',').map(field=>field.trim());
 const t=fields.find(field=>/^t=\d+$/.test(field))?.slice(2);
 const timestamp=Number(t);
 const signatures=fields.filter(field=>/^v1=[a-f0-9]{64}$/.test(field)).map(field=>field.slice(3));
 if(!Number.isSafeInteger(timestamp)||!t||Math.abs(Math.floor(nowMs/1000)-timestamp)>300||!signatures.length)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const input=new TextEncoder().encode(String(timestamp)+'.'+raw);
 const digest=new Uint8Array(await crypto.subtle.sign('HMAC',key,input));
 const expected=[...digest].map(x=>x.toString(16).padStart(2,'0')).join('');
 return signatures.some(s=>secureEqual(s,expected));
}
export async function stripeRequest(env,path,{method='GET',fields=null,idempotencyKey=''}={}){
 if(!stripeKeyValid(env.STRIPE_SECRET_KEY))throw new BillingError('Billing not configured',503);
 const headers={authorization:'Bearer '+env.STRIPE_SECRET_KEY,'stripe-version':'2026-09-30.endive'};
 if(fields)headers['content-type']='application/x-www-form-urlencoded';
 if(idempotencyKey)headers['idempotency-key']=idempotencyKey;
 const response=await fetch(STRIPE_API+'/'+path,{
  method,headers,body:fields?new URLSearchParams(fields):undefined,
 });
 const payload=await response.json().catch(()=>({}));
 if(!response.ok)throw new BillingError('Payment provider unavailable',502);
 return payload;
}
export function validateStripePrice(price,env){
 return price?.id===env.STRIPE_LIFETIME_PRICE_ID && price?.active===true
  && price?.type==='one_time' && price?.currency===CURRENCY
  && price?.unit_amount===PRICE_CENTS && !price?.recurring
  && price?.livemode===stripeIsLive(env.STRIPE_SECRET_KEY)
  && (!env.STRIPE_LIFETIME_PRODUCT_ID || price?.product===env.STRIPE_LIFETIME_PRODUCT_ID);
}
export function validatePaidSession(session,env){
 if(!/^cs_(test|live)_[A-Za-z0-9_]+$/.test(session?.id||''))return null;
 const uid=session?.client_reference_id;
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid||'')||uid!==session?.metadata?.uid)return null;
 if(session?.metadata?.product!==PRODUCT_CODE||!previewSandboxAccountAllowed(uid,env))return null;
 if(session?.mode!=='payment'||session?.status!=='complete'||session?.payment_status!=='paid')return null;
 if(session?.currency!==CURRENCY||session?.amount_subtotal!==PRICE_CENTS||session?.amount_total!==PRICE_CENTS)return null;
 if(session?.livemode!==stripeIsLive(env.STRIPE_SECRET_KEY))return null;
 const items=session?.line_items?.data;
 if(!Array.isArray(items)||items.length!==1)return null;
 if(items[0]?.quantity!==1||items[0]?.price?.id!==env.STRIPE_LIFETIME_PRICE_ID)return null;
 if(typeof session.payment_intent!=='string'||!session.payment_intent.startsWith('pi_'))return null;
 return uid;
}
export async function authenticatedFirebaseUser(request,env){
 const token=/^Bearer ([A-Za-z0-9._-]+)$/.exec(request.headers.get('authorization')||'')?.[1];
 if(!token)throw new BillingError('Sign in with Google first',401);
 if(!env.FIREBASE_WEB_API_KEY)throw new BillingError('Billing not configured',503);
 const response=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='
   +encodeURIComponent(env.FIREBASE_WEB_API_KEY),{
   method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idToken:token})
 });
 if(!response.ok)throw new BillingError('Google session expired. Sign in again.',401);
 const account=(await response.json())?.users?.[0];
 if(!account?.localId||account.disabled||!/^[A-Za-z0-9_-]{1,128}$/.test(account.localId))
   throw new BillingError('Invalid Google account',401);
 if(!account.email||account.emailVerified!==true)throw new BillingError('A verified Google email is required',403);
 return {uid:account.localId,email:account.email};
}
const b64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
const json64=obj=>b64url(new TextEncoder().encode(JSON.stringify(obj)));
export async function firestoreAccessToken(env){
 let service;try{service=JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON||'')}catch{}
 if(service?.project_id!==PROJECT_ID||!service.client_email||!service.private_key||
    service.token_uri!=='https://oauth2.googleapis.com/token')
   throw new BillingError('Billing credentials not configured',503);
 const privateBytes=Uint8Array.from(atob(service.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,'')),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey('pkcs8',privateBytes,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const now=Math.floor(Date.now()/1000);
 const head=json64({alg:'RS256',typ:'JWT'});
 const claim=json64({iss:service.client_email,scope:'https://www.googleapis.com/auth/datastore',
  aud:service.token_uri,iat:now,exp:now+3000});
 const unsigned=head+'.'+claim;
 const signature=b64url(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(unsigned))));
 const response=await fetch(service.token_uri,{
  method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:unsigned+'.'+signature}),
 });
 if(!response.ok)throw new BillingError('Billing account service unavailable',503);
 const access=(await response.json())?.access_token;
 if(!access)throw new BillingError('Billing account service unavailable',503);
 return access;
}
const pathOf=(uid,path)=>'projects/'+PROJECT_ID+'/databases/(default)/documents/users/'+encodeURIComponent(uid)+'/'+path;
const stringField=value=>({stringValue:String(value)});
const readField=(fields,key)=>fields?.[key]?.stringValue||null;
export async function loadEntitlement(uid,token){
 const res=await fetch(FIRESTORE_API+'/'+pathOf(uid,'entitlements/pro'),{
  headers:{authorization:'Bearer '+token},
 });
 if(res.status===404)return null;
 if(!res.ok)throw new BillingError('Cannot check existing Pro access',503);
 const doc=await res.json();
 return {plan:readField(doc.fields,'plan'),status:readField(doc.fields,'status'),
  source:readField(doc.fields,'source'),updateTime:doc.updateTime};
}
export async function grantStripeLifetime(uid,session,eventId,env){
 const token=await firestoreAccessToken(env);
 const existing=await loadEntitlement(uid,token);
 if(isPermanentPro(existing))return {already:true,status:existing.status};
 const now=new Date().toISOString();
 const entitlement={
  name:pathOf(uid,'entitlements/pro'),
  fields:{plan:stringField('pro'),status:stringField('lifetime'),
   source:stringField('stripe'),updatedAt:stringField(now)}
 };
 const billing={
  name:pathOf(uid,'billing/stripeLifetime'),
  fields:{provider:stringField('stripe'),product:stringField(PRODUCT_CODE),
   checkoutSessionId:stringField(session.id),paymentIntentId:stringField(session.payment_intent),
   stripeEventId:stringField(eventId),amountCents:{integerValue:String(PRICE_CENTS)},
   currency:stringField(CURRENCY),updatedAt:stringField(now)}
 };
 const writes=[
  {update:entitlement,currentDocument:existing?{updateTime:existing.updateTime}:{exists:false}},
  {update:billing},
 ];
 const res=await fetch(FIRESTORE_API+'/projects/'+PROJECT_ID+'/databases/(default)/documents:commit',{
  method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},
  body:JSON.stringify({writes}),
 });
 if(res.status===400||res.status===409){
  const after=await loadEntitlement(uid,token);
  if(isPermanentPro(after))return {already:true,status:after.status};
 }
 if(!res.ok)throw new BillingError('Pro activation awaiting secure retry',503);
 return {already:false,status:'lifetime'};
}
export function errorResponse(error){
 const status=error instanceof BillingError?error.status:503;
 return json({ok:false,error:status===401||status===403?error.message:'Billing temporarily unavailable'},status);
}
