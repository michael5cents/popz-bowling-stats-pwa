// Shared policy for the Mac-only Popz Bowling Founder Admin.
// Pure helpers: no network access, no automatic grants and no payment changes.
export const PROJECT='popz-bowling-stats';
export const APPROVAL='owner_approved_mac_founder_admin_manual_2026';
const UID=/^[A-Za-z0-9_-]{1,128}$/;
export function normalizeEntitlement(doc){
 if(!doc)return null;
 const f=doc.fields||{};
 return {
  plan:f.plan?.stringValue||null,
  status:f.status?.stringValue||null,
  source:f.source?.stringValue||null,
  trialStartedAt:f.trialStartedAt?.stringValue||null,
  updateTime:doc.updateTime||null
 };
}
export function evaluateFounderCandidate({user,entitlement,paid,checkout}){
 if(!user)return {eligible:false,reason:'Account not found. Ask the person to install Popz Bowling and sign in with Google first.'};
 if(user.disabled===true)return {eligible:false,reason:'This Google account is disabled.'};
 if(user.emailVerified!==true ||
   !(user.providerUserInfo||[]).some(p=>p.providerId==='google.com'))
  return {eligible:false,reason:'Account must have a verified Google sign-in.'};
 if(paid!==null)return {eligible:false,reason:'A paid Lifetime Pro transaction already exists. Do not alter a paid purchase.'};
 if(checkout!==null)return {eligible:false,reason:'A payment checkout is pending or reserved. Resolve it before granting Founder.'};
 if(entitlement?.plan==='pro'&&entitlement.status==='founder')
  return {eligible:false,reason:'Already Founder Pro - Lifetime.',alreadyFounder:true};
 if(entitlement?.plan==='pro'&&['complimentary','lifetime'].includes(entitlement.status))
  return {eligible:false,reason:'Account already has permanent Pro access.'};
 if(entitlement===null)return {eligible:true,mode:'create',reason:'No existing Pro entitlement. A permanent Founder grant can be created.'};
 if(typeof entitlement.updateTime!=='string'||entitlement.updateTime.length<12)
  return {eligible:false,reason:'Cannot verify the existing entitlement version.'};
 if(entitlement.plan==='pro'&&entitlement.status==='trial'&&entitlement.source==='installation')
  return {eligible:true,mode:'replace_trial',reason:'Existing trial can be upgraded to permanent Founder Pro.'};
 if(entitlement.plan==='free'&&['free','inactive'].includes(entitlement.status))
  return {eligible:true,mode:'replace_free',reason:'Existing Free account can be upgraded to permanent Founder Pro.'};
 return {eligible:false,reason:'Unrecognized entitlement status; needs manual review.'};
}
export function founderCommit(uid,plan,entitlement,now){
 if(!UID.test(uid||'')||!plan?.eligible||
    !['create','replace_trial','replace_free'].includes(plan.mode)||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(now))
  throw Error('Invalid Founder write request');
 if(plan.mode!=='create'&&!entitlement?.updateTime)
  throw Error('Existing entitlements must have a Firestore update-time precondition');
 const prefix='projects/'+PROJECT+'/databases/(default)/documents/users/'+uid+'/';
 const fields={
  plan:{stringValue:'pro'},status:{stringValue:'founder'},
  source:{stringValue:'founder_admin'},cohortId:{stringValue:'owner-manual-2026'},
  approvalReference:{stringValue:APPROVAL},updatedAt:{stringValue:now}
 };
 if(plan.mode==='replace_trial'&&entitlement.trialStartedAt)
  fields.priorTrialStartedAt={stringValue:entitlement.trialStartedAt};
 return {writes:[
  {verify:prefix+'billing/stripeLifetime',currentDocument:{exists:false}},
  {verify:prefix+'billing/checkoutReservation',currentDocument:{exists:false}},
  {update:{name:prefix+'entitlements/pro',fields},
   currentDocument:plan.mode==='create'?{exists:false}:{updateTime:entitlement.updateTime}}
 ]};
}