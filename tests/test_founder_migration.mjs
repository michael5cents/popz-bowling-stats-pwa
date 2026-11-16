import assert from 'node:assert/strict';
import {PRO_FEATURES,effectiveAccess,canUseFeature,PRO_PREVIEW_ENABLED}
 from '../entitlements.mjs';
import {
 validateFounderManifest,classifyFounderGrant,
 planFounderMigration,describeCreateOnlyFounderGrant
} from '../scripts/founder-migration-core.mjs';

const owner='old_google_owner',tester='old_google_tester',third='old_google_third';
const verified={emailVerified:true,disabled:false,googleProvider:true};
const accounts=new Map([
 [owner,verified],[tester,verified],[third,verified],
 ['disabled',{...verified,disabled:true}]
]);
const entitlements=new Map([
 [owner,{plan:'pro',status:'founder',source:'founder'}],
 [tester,{plan:'pro',status:'founder',source:'founder'}],
 [third,{plan:'pro',status:'founder',source:'founder'}],
 ['disabled',null]
]);
const entry=uid=>({uid,evidenceReference:'pre_cutoff_auth_record'});
const cutoff='2026-11-15T18:12:36Z';
const approved={schemaVersion:1,projectId:'popz-bowling-stats',
 cohortId:'founder-2026',decision:'approved',
 founderCap:3,cutoffUtc:cutoff,
 approvalReference:'owner_approved_2026_11_15_three_existing_google_accounts',
 members:[entry(owner),entry(tester),entry(third)]};
assert.equal(PRO_PREVIEW_ENABLED,false,'commercial launch must end public Pro Preview');
assert.equal(validateFounderManifest(approved).policyReady,true);
const done=planFounderMigration(approved,accounts,entitlements);
assert.equal(done.ready,true);
assert.equal(done.writeOperations,0);
assert.equal(done.foundersAlready,3);
assert.equal(done.proposed,0);
assert.equal(done.counts.already_founder,3);
assert.equal(done.withinCap,true);
assert.equal(planFounderMigration({...approved,founderCap:2},accounts,entitlements).ready,false);
assert.equal(planFounderMigration({...approved,members:[...approved.members,entry('new_app_signup_after_cutoff')]},accounts,entitlements).ready,false);
assert.equal(classifyFounderGrant(verified,{plan:'pro',status:'founder'}),'already_founder');
assert.equal(classifyFounderGrant(verified,{plan:'pro',status:'lifetime'}),'preserve_paid_or_lifetime');
assert.equal(classifyFounderGrant(verified,{plan:'pro',status:'complimentary'}),'preserve_complimentary');
assert.equal(classifyFounderGrant(verified,{plan:'pro',status:'trial'}),'existing_entitlement_requires_review');
assert.equal(classifyFounderGrant({...verified,disabled:true},null),'account_disabled');
assert.equal(classifyFounderGrant({...verified,emailVerified:false},null),'account_not_verified_google');
assert.equal(classifyFounderGrant({...verified,googleProvider:false},null),'account_not_verified_google');
const draft={...approved,decision:'draft',founderCap:null,cutoffUtc:null,approvalReference:null,members:[]};
assert.equal(planFounderMigration(draft,accounts,entitlements).ready,false);
assert.throws(()=>validateFounderManifest({...approved,members:[entry(owner),entry(owner)]}),/Duplicate/);
assert.throws(()=>validateFounderManifest({...approved,members:[entry('bad/uid')]}),/invalid account/);
assert.throws(()=>validateFounderManifest({...approved,founderCap:0}),/cap/);
assert.throws(()=>validateFounderManifest({...approved,cutoffUtc:'tomorrow'}),/cutoff/);
assert.throws(()=>describeCreateOnlyFounderGrant(owner,draft,'2026-11-15T19:00:00Z'),/not explicitly approved/);
assert.throws(()=>describeCreateOnlyFounderGrant('random_user',approved,'2026-11-15T19:00:00Z'),/not explicitly approved/);
const createOnly=describeCreateOnlyFounderGrant(owner,approved,'2026-11-15T19:00:00Z');
assert.deepEqual(createOnly.currentDocument,{exists:false},'no grant can overwrite an existing entitlement');
assert.equal(createOnly.update.fields.status.stringValue,'founder');
assert.equal(createOnly.update.fields.source.stringValue,'founder');
assert.equal(createOnly.update.fields.cohortId.stringValue,'founder-2026');
// Founder access never expires, even after Pro Preview is disabled and after 30 days.
const afterYear=Date.parse('2027-11-15T18:12:36Z');
for(const account of [owner,tester,third]){
 const raw=entitlements.get(account);
 const access=effectiveAccess(raw,{preview:false,now:afterYear});
 assert.equal(access.pro,true);
 assert.equal(access.preview,false);
 assert.match(access.label,/Founder.*Lifetime/);
 assert.equal(canUseFeature(PRO_FEATURES.MULTI_PLAYER_SCORING,raw,{preview:false,now:afterYear}),true);
 assert.equal(canUseFeature(PRO_FEATURES.ADVANCED_SHOT_TRACKING,raw,{preview:false,now:afterYear}),true);
}
console.log('PASS: 3 existing verified Founder accounts, hard Founder cap, cutoff, no overwrite and permanent cross-device entitlement policy');
