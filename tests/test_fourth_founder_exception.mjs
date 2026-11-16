import assert from 'node:assert/strict';
import {EXCEPTION_REFERENCE,FOUNDER_COUNT_BEFORE,FOUNDER_COUNT_AFTER,
 planFourthFounder,fourthFounderWrite} from '../scripts/fourth-founder-exception-core.mjs';
const account={emailVerified:true,disabled:false,providerUserInfo:[{providerId:'google.com'}]};
const trial={plan:'pro',status:'trial',source:'installation',
 trialStartedAt:'2026-11-17T16:00:00.000Z',
 updateTime:'2026-11-17T16:01:00.000Z'};
const base={founderCount:3,authUser:account,entitlement:trial,
 paidRecord:null,reservation:null};
assert.equal(FOUNDER_COUNT_BEFORE,3);
assert.equal(FOUNDER_COUNT_AFTER,4);
assert.deepEqual(planFourthFounder(base),{allowed:true,mode:'replace_trial'});
const when='2026-11-17T18:00:00.000Z';
const upgrade=fourthFounderWrite('new_test_user','replace_trial',trial,when);
assert.deepEqual(upgrade.currentDocument,{updateTime:trial.updateTime});
assert.equal(upgrade.update.fields.status.stringValue,'founder');
assert.equal(upgrade.update.fields.plan.stringValue,'pro');
assert.equal(upgrade.update.fields.source.stringValue,'founder');
assert.equal(upgrade.update.fields.approvalReference.stringValue,EXCEPTION_REFERENCE);
assert.equal(upgrade.update.fields.priorTrialStartedAt.stringValue,trial.trialStartedAt);
assert.equal(upgrade.update.fields.expiresAtTimestamp,undefined);
assert.deepEqual(fourthFounderWrite('new_test_user','create',null,when).currentDocument,{exists:false});
assert.equal(planFourthFounder({...base,entitlement:null}).mode,'create');
for(const [changes,reason] of [
 [{founderCount:2},'founder_count_not_three'],
 [{founderCount:4},'founder_count_not_three'],
 [{authUser:null},'account_not_found'],
 [{authUser:{...account,disabled:true}},'account_not_verified_google'],
 [{authUser:{...account,emailVerified:false}},'account_not_verified_google'],
 [{authUser:{...account,providerUserInfo:[]}},'account_not_verified_google'],
 [{paidRecord:{}},'payment_already_exists'],
 [{reservation:{}},'checkout_reservation_exists'],
 [{entitlement:{...trial,status:'lifetime'}},'preexisting_entitlement_needs_review'],
 [{entitlement:{...trial,status:'founder'}},'preexisting_entitlement_needs_review'],
 [{entitlement:{...trial,source:'stripe'}},'preexisting_entitlement_needs_review'],
 [{entitlement:{...trial,updateTime:null}},'preexisting_entitlement_needs_review'],
 [{entitlement:{...trial,status:'complimentary'}},'preexisting_entitlement_needs_review']
]){
 assert.equal(planFourthFounder({...base,...changes}).reason,reason);
}
assert.throws(()=>fourthFounderWrite('bad/uid','create',null,when));
assert.throws(()=>fourthFounderWrite('new_test_user','replace_trial',null,when));
assert.throws(()=>fourthFounderWrite('new_test_user','create',null,'yesterday'));
console.log('PASS: one fourth Founder exception, strict 3-to-4 cap, verified Google identity, unpaid account, atomic trial replacement, and unchanged original Founders.');