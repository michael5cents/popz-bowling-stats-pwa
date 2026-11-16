import assert from 'node:assert/strict';
import {PROJECT,APPROVAL,normalizeEntitlement,evaluateFounderCandidate,founderCommit}
 from '../scripts/founder-admin-core.mjs';
assert.equal(PROJECT,'popz-bowling-stats');
const user={emailVerified:true,disabled:false,providerUserInfo:[{providerId:'google.com'}]};
const trial={plan:'pro',status:'trial',source:'installation',
 trialStartedAt:'2026-11-17T18:00:00.000Z',updateTime:'2026-11-17T18:10:00.000Z'};
const c={user,entitlement:trial,paid:null,checkout:null};
assert.equal(evaluateFounderCandidate(c).eligible,true);
assert.equal(evaluateFounderCandidate(c).mode,'replace_trial');
assert.equal(evaluateFounderCandidate({...c,entitlement:null}).mode,'create');
assert.equal(evaluateFounderCandidate({...c,entitlement:{...trial,plan:'free',status:'free'}}).mode,'replace_free');
for(const [mod,phrase] of [
 [{user:null},'not found'],[{user:{...user,disabled:true}},'disabled'],
 [{user:{...user,emailVerified:false}},'verified Google'],
 [{user:{...user,providerUserInfo:[]}},'verified Google'],
 [{paid:{}},'paid Lifetime'],[{checkout:{}},'checkout'],
 [{entitlement:{...trial,status:'founder'}},'Already Founder'],
 [{entitlement:{...trial,status:'lifetime'}},'permanent'],
 [{entitlement:{...trial,status:'complimentary'}},'permanent'],
 [{entitlement:{...trial,source:'legacy'}},'Unrecognized'],
 [{entitlement:{...trial,updateTime:null}},'Cannot verify']
]){
 const r=evaluateFounderCandidate({...c,...mod});
 assert.equal(r.eligible,false);
 assert.match(r.reason,new RegExp(phrase,'i'));
}
const now='2026-11-17T20:00:00.000Z';
const grant=founderCommit('person_001',evaluateFounderCandidate(c),trial,now);
assert.equal(grant.writes.length,3);
assert.equal(grant.writes[0].verify.includes('billing/stripeLifetime'),true);
assert.deepEqual(grant.writes[0].currentDocument,{exists:false});
assert.equal(grant.writes[1].verify.includes('billing/checkoutReservation'),true);
assert.deepEqual(grant.writes[1].currentDocument,{exists:false});
assert.deepEqual(grant.writes[2].currentDocument,{updateTime:trial.updateTime});
assert.equal(grant.writes[2].update.fields.status.stringValue,'founder');
assert.equal(grant.writes[2].update.fields.source.stringValue,'founder_admin');
assert.equal(grant.writes[2].update.fields.approvalReference.stringValue,APPROVAL);
assert.equal(grant.writes[2].update.fields.priorTrialStartedAt.stringValue,trial.trialStartedAt);
assert.equal(grant.writes[2].update.fields.expiresAtTimestamp,undefined);
assert.deepEqual(founderCommit('person_002',evaluateFounderCandidate({...c,entitlement:null}),null,now).writes[2].currentDocument,{exists:false});
assert.throws(()=>founderCommit('bad/user',evaluateFounderCandidate(c),trial,now));
assert.throws(()=>founderCommit('person_001',{eligible:false},trial,now));
assert.throws(()=>founderCommit('person_001',evaluateFounderCandidate(c),null,now));
const doc={updateTime:trial.updateTime,fields:{plan:{stringValue:'pro'},status:{stringValue:'trial'},source:{stringValue:'installation'},trialStartedAt:{stringValue:trial.trialStartedAt}}};
assert.deepEqual(normalizeEntitlement(doc),trial);
assert.equal(normalizeEntitlement(null),null);
console.log('PASS: Mac Founder Admin is manual per-email, verifies Google account, protects paid/checkout, supports trial-to-Founder, atomic no-double-charge preconditions, permanent Pro, no scoring writes.');