// Verified, server-controlled 30-day Pro trial for a signed-in Firebase user.
// NEVER charges Stripe, overwrites Founder/paid grants, or touches bowling data.
// Feature is disabled unless explicitly enabled at commercial launch.
import {
 json,BillingError,errorResponse,billingEnvironmentSafe,allowedCheckoutOrigin,
 authenticatedFirebaseUser,firestoreAccessToken,loadEntitlement,
 previewSandboxAccountAllowed,PROJECT_ID
} from '../../_billing/core.mjs';
import {trialWindow,FOUNDER_CUTOFF_UTC,TRIAL_DAYS} from '../../../trial-policy.mjs';

const API='https://firestore.googleapis.com/v1';
const LIMIT=2048;
const jsonHeaders={'content-type':'application/json'};
const err=message=>{throw new BillingError(message,422)};
const enabled=env=>env?.BILLING_TRIAL_ENABLED==='true' &&
 billingEnvironmentSafe(env) && !!env.FIREBASE_WEB_API_KEY &&
 !!env.FIREBASE_SERVICE_ACCOUNT_JSON &&
 (env.CF_PAGES_BRANCH==='main' ||
  (env.CF_PAGES_BRANCH==='stripe-lifetime-pro-preview' &&
   env.BILLING_PREVIEW_QA_ACTIVE==='true' &&
   /^[A-Za-z0-9_-]{1,128}$/.test(env.BILLING_PREVIEW_QA_UID||'')));

export function onRequestGet({env}){
 return json({ok:true,enabled:enabled(env),trialDays:TRIAL_DAYS,
  founderCutoffUtc:FOUNDER_CUTOFF_UTC,requiresVerifiedAccount:true});
}
const stringField=value=>({stringValue:String(value)});
const tokenIsUser=uid=>/^[A-Za-z0-9_-]{1,128}$/.test(uid||'');

export async function onRequestPost({request,env}){
 if(!enabled(env))return json({ok:false,error:'Trial enrollment is not available'},503);
 try{
  allowedCheckoutOrigin(request,env);
  if(Number(request.headers.get('content-length')||0)>LIMIT)err('Invalid trial request');
  const identity=await authenticatedFirebaseUser(request,env);
  if(!tokenIsUser(identity.uid)||!previewSandboxAccountAllowed(identity.uid,env))
   throw new BillingError('Trial not available for this account',403);
  const body=await request.json().catch(()=>({}));
  const fields=Object.keys(body||{});
  if(!body||typeof body!=='object'||Array.isArray(body)||fields.some(k=>k!=='installationStartedAt'))
   err('Invalid trial request');
  const rawStart=body.installationStartedAt;
  if(rawStart!==undefined &&
   (typeof rawStart!=='string'||rawStart.length>40||!Number.isFinite(Date.parse(rawStart))))
   err('Invalid installation timestamp');
  const now=new Date();
  if(rawStart&&Date.parse(rawStart)>now.getTime()+5*60*1000)
   err('Device date must be corrected');
  const originalStart=rawStart||now.toISOString();
  const window=trialWindow(originalStart,now.getTime());
  if(!window)err('Invalid trial start');
  const token=await firestoreAccessToken(env);
  const previous=await loadEntitlement(identity.uid,token);
  if(previous){
   // Explicitly preserve Founder, complimentary, paid, and expired trial.
   // No response or client timestamp can reset the account's 30-day window.
   return json({ok:true,created:false,status:previous.status,
    expiresAt:previous.expiresAt||null,startedAt:previous.trialStartedAt||null});
  }
  const path='projects/'+PROJECT_ID+'/databases/(default)/documents/users/'+
   encodeURIComponent(identity.uid)+'/entitlements/pro';
  const write={
   update:{
    name:path,
    fields:{
     plan:stringField('pro'),status:stringField('trial'),
     source:stringField('installation'),cohortId:stringField('post-founder-2026'),
     trialStartedAt:stringField(window.startedAt),expiresAt:stringField(window.expiresAt),
     updatedAt:stringField(now.toISOString())
    }
   },
   currentDocument:{exists:false}
  };
  const result=await fetch(API+'/projects/'+PROJECT_ID+'/databases/(default)/documents:commit',{
   method:'POST',headers:{authorization:'Bearer '+token,...jsonHeaders},
   body:JSON.stringify({writes:[write]})
  });
  if(!result.ok){
   if([400,409,412].includes(result.status)){
    const won=await loadEntitlement(identity.uid,token);
    if(won){
     return json({ok:true,created:false,status:won.status,
      startedAt:won.trialStartedAt||null,expiresAt:won.expiresAt||null});
    }
   }
   throw new BillingError('Trial activation awaiting secure retry',503);
  }
  return json({ok:true,created:true,status:'trial',
   startedAt:window.startedAt,expiresAt:window.expiresAt});
 }catch(error){return errorResponse(error)}
}
