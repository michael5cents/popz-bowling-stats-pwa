// One-time owner-approved fourth Founder; pure planning, no network calls.
export const EXCEPTION_REFERENCE='owner_approved_fourth_founder_2026_11_15';
export const FOUNDER_COUNT_BEFORE=3;
export const FOUNDER_COUNT_AFTER=4;
export const PROJECT_ID='popz-bowling-stats';
const UID=/^[A-Za-z0-9_-]{1,128}$/;
export const entitlementOf=(doc)=>doc?({
 plan:doc.fields?.plan?.stringValue||null,
 status:doc.fields?.status?.stringValue||null,
 source:doc.fields?.source?.stringValue||null,
 trialStartedAt:doc.fields?.trialStartedAt?.stringValue||null,
 updateTime:doc.updateTime||null
}):null;
export function planFourthFounder({founderCount,authUser,entitlement,paidRecord,reservation}){
 if(founderCount!==FOUNDER_COUNT_BEFORE)return {allowed:false,reason:'founder_count_not_three'};
 if(!authUser)return {allowed:false,reason:'account_not_found'};
 if(authUser.disabled===true || authUser.emailVerified!==true ||
    !(authUser.providerUserInfo||[]).some(p=>p.providerId==='google.com'))
  return {allowed:false,reason:'account_not_verified_google'};
 if(paidRecord!==null)return {allowed:false,reason:'payment_already_exists'};
 if(reservation!==null)return {allowed:false,reason:'checkout_reservation_exists'};
 if(entitlement===null)return {allowed:true,mode:'create'};
 if(entitlement.plan==='pro' && entitlement.status==='trial' &&
    entitlement.source==='installation' && typeof entitlement.updateTime==='string'
    && entitlement.updateTime.length>10)return {allowed:true,mode:'replace_trial'};
 return {allowed:false,reason:'preexisting_entitlement_needs_review'};
}
export function fourthFounderWrite(uid,mode,current,now){
 if(!UID.test(uid||'')||!['create','replace_trial'].includes(mode)||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(now))
  throw Error('Invalid targeted Founder grant');
 if(mode==='replace_trial' && (!current || !current.updateTime))
  throw Error('Existing trial requires Firestore update-time precondition');
 const fields={
  plan:{stringValue:'pro'},status:{stringValue:'founder'},
  source:{stringValue:'founder'},cohortId:{stringValue:'founder-2026-exception'},
  approvalReference:{stringValue:EXCEPTION_REFERENCE},updatedAt:{stringValue:now}
 };
 if(mode==='replace_trial' && current.trialStartedAt)
  fields.priorTrialStartedAt={stringValue:current.trialStartedAt};
 return {
  update:{
   name:'projects/'+PROJECT_ID+'/databases/(default)/documents/users/'+uid+'/entitlements/pro',
   fields
  },
  currentDocument:mode==='create'?{exists:false}:{updateTime:current.updateTime}
 };
}