// Pure, read-only Founder migration planning. No network or Firestore writes.
// Migration execution requires a separate, explicitly approved future operation.
export const FOUNDER_PROJECT='popz-bowling-stats';
const UID=/^[A-Za-z0-9_-]{1,128}$/;
const ID=/^[A-Za-z0-9._:-]{4,100}$/;
const MAX_MANIFEST_MEMBERS=500;

const iso=raw=>typeof raw==='string'&&
 /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(raw)&&
 Number.isFinite(Date.parse(raw))&&new Date(raw).toISOString().slice(0,19)===raw.slice(0,19);

export function validateFounderManifest(raw){
 if(!raw||raw.schemaVersion!==1||raw.projectId!==FOUNDER_PROJECT ||
   raw.cohortId!=='founder-2026'||!['draft','approved'].includes(raw.decision)||
   !Array.isArray(raw.members)||raw.members.length>MAX_MANIFEST_MEMBERS)
  throw new Error('Founder manifest format is invalid');
 if(raw.founderCap!==null &&
   (!Number.isSafeInteger(raw.founderCap)||raw.founderCap<1||raw.founderCap>100000))
  throw new Error('Founder cap must be an approved positive integer or null');
 if(raw.cutoffUtc!==null&&!iso(raw.cutoffUtc))throw new Error('Invalid Founder cutoff timestamp');
 if(raw.approvalReference!==null&&!ID.test(raw.approvalReference||''))
  throw new Error('Invalid owner approval reference');
 const seen=new Set();
 const members=raw.members.map(item=>{
  if(!UID.test(item?.uid||'')||!ID.test(item?.evidenceReference||''))
   throw new Error('Founder manifest contains an invalid account or evidence reference');
  if(seen.has(item.uid))throw new Error('Duplicate Firebase UID in Founder manifest');
  seen.add(item.uid);
  return {uid:item.uid,evidenceReference:item.evidenceReference};
 });
 const policyReady=raw.decision==='approved'&&raw.founderCap!==null&&
  !!raw.cutoffUtc&&!!raw.approvalReference&&members.length>0;
 if(raw.decision==='approved'&&!policyReady)
  throw new Error('An approved manifest requires owner cutoff, cap, reference and members');
 return {projectId:FOUNDER_PROJECT,cohortId:'founder-2026',
  decision:raw.decision,founderCap:raw.founderCap,cutoffUtc:raw.cutoffUtc,
  approvalReference:raw.approvalReference,members,policyReady};
}

export function classifyFounderGrant(account,entitlement){
 if(!account)return 'account_missing';
 if(account.disabled===true)return 'account_disabled';
 if(account.emailVerified!==true || !account.googleProvider)return 'account_not_verified_google';
 if(entitlement===null)return 'can_create_if_owner_approved';
 if(!entitlement||typeof entitlement!=='object')return 'existing_entitlement_requires_review';
 const plan=entitlement.plan,status=entitlement.status;
 if(plan==='pro'&&status==='founder')return 'already_founder';
 if(plan==='pro'&&status==='complimentary')return 'preserve_complimentary';
 if(plan==='pro'&&status==='lifetime')return 'preserve_paid_or_lifetime';
 // Even inactive or expired entitlement records must never be overwritten
 // without a separate manual decision and an exact Firestore precondition.
 return 'existing_entitlement_requires_review';
}

export function planFounderMigration(rawManifest,accounts,entitlements){
 const manifest=validateFounderManifest(rawManifest);
 if(!(accounts instanceof Map)||!(entitlements instanceof Map))
  throw new Error('Read-only account and entitlement maps required');
 const entries=manifest.members.map((member,index)=>{
  const status=classifyFounderGrant(
   accounts.get(member.uid)||null,
   entitlements.has(member.uid)?entitlements.get(member.uid):undefined
  );
  return {index:index+1,status,
   // Do not include UIDs, emails or evidence references in the printed plan.
   proposed:status==='can_create_if_owner_approved'};
 });
 const counts=Object.create(null);
 for(const entry of entries)counts[entry.status]=(counts[entry.status]||0)+1;
 const founders=Array.from(accounts.keys()).filter(uid=>
  entitlements.get(uid)?.plan==='pro'&&entitlements.get(uid)?.status==='founder').length;
 const proposed=entries.filter(e=>e.proposed).length;
 const withinCap=manifest.founderCap!==null&&founders+proposed<=manifest.founderCap;
 const ready=manifest.policyReady&&withinCap&&
  entries.every(e=>e.status==='can_create_if_owner_approved'||e.status==='already_founder');
 return {ready,writeOperations:0,foundersAlready:founders,proposed,
  hasOwnerPolicy:manifest.policyReady,withinCap,counts,entries,
  reason:!manifest.policyReady?'owner_policy_not_approved':
   !withinCap?'founder_cap_exceeded':
   ready?'eligible_for_separate_approved_create_only_migration':'accounts_require_manual_review'};
}

// This function only describes a Firestore compare-and-set write. It DOES NOT
// perform any network request. For any eventual production migration, additionally
// verify the exact Auth UID, owner approval and live Firestore absence immediately
// before committing, and require explicit independent execution approval.
export function describeCreateOnlyFounderGrant(uid,manifestInput,when){
 const manifest=validateFounderManifest(manifestInput);
 if(!manifest.policyReady||!UID.test(uid)||!manifest.members.some(x=>x.uid===uid)||
   !iso(when))throw new Error('Founder grant is not explicitly approved');
 return {update:{
   name:'projects/'+FOUNDER_PROJECT+'/databases/(default)/documents/users/'+uid+'/entitlements/pro',
   fields:{
    plan:{stringValue:'pro'},status:{stringValue:'founder'},source:{stringValue:'founder'},
    cohortId:{stringValue:manifest.cohortId},
    approvalReference:{stringValue:manifest.approvalReference},
    updatedAt:{stringValue:when}
   }},
   currentDocument:{exists:false}};
}
