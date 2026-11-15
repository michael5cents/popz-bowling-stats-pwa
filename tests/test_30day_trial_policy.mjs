import assert from 'node:assert/strict';
import {
 FOUNDER_CUTOFF_UTC,TRIAL_DAYS,TRIAL_MS,trialWindow,localTrialEntitlement,
 activeTrialDays
}from'../trial-policy.mjs';
import {
 effectiveAccess,entitlementIsActive,canUseFeature,PRO_FEATURES
}from'../entitlements.mjs';

const start=Date.parse('2026-11-16T14:30:00.000Z');
const window=trialWindow('2026-11-16T14:30:00.000Z',start);
assert.equal(TRIAL_DAYS,30);
assert.equal(TRIAL_MS,2592000000);
assert.equal(FOUNDER_CUTOFF_UTC,'2026-11-15T18:12:36.000Z');
assert.equal(window.startedAt,'2026-11-16T14:30:00.000Z');
assert.equal(window.expiresAt,'2026-12-16T14:30:00.000Z');
assert.equal(activeTrialDays(window.expiresAt,start),30);
assert.equal(activeTrialDays(window.expiresAt,start+29*86400000),1);
assert.equal(activeTrialDays(window.expiresAt,start+TRIAL_MS),0);
const beforeCutoff=trialWindow('2026-09-01T00:00:00.000Z',start);
assert.equal(beforeCutoff.startedAt,FOUNDER_CUTOFF_UTC,'no post-founder trial begins before policy cutoff');
assert.equal(beforeCutoff.expiresAt,'2026-12-15T18:12:36.000Z');
assert.equal(trialWindow('broken',start),null);

const signedOutOpts={signedOut:true,preview:false,localTrialStartedAt:window.startedAt,
 localTrialLastSeenAt:window.startedAt};
let access=effectiveAccess({}, {...signedOutOpts,now:start});
assert.equal(access.tier,'trial');
assert.equal(access.pro,true);
assert.match(access.label,/30 days left/);
access=effectiveAccess({}, {...signedOutOpts,now:start+TRIAL_MS-1});
assert.equal(access.pro,true);
access=effectiveAccess({}, {...signedOutOpts,now:start+TRIAL_MS});
assert.equal(access.tier,'free');
assert.equal(access.pro,false);
assert.equal(canUseFeature(PRO_FEATURES.MULTI_PLAYER_SCORING,{}, {...signedOutOpts,now:start+TRIAL_MS}),false);
assert.equal(canUseFeature(PRO_FEATURES.GOOGLE_SYNC,{}, {...signedOutOpts,now:start+TRIAL_MS}),false);
assert.equal(canUseFeature('basic_scoring',{}, {...signedOutOpts,now:start+TRIAL_MS}),true);
assert.equal(canUseFeature('bowling_history',{}, {...signedOutOpts,now:start+TRIAL_MS}),true);

const movedBack=localTrialEntitlement(window.startedAt,'2026-12-17T00:00:00.000Z',start+86400000);
assert.equal(movedBack.daysRemaining,0,'clock rollback cannot regain local trial after elapsed date');
assert.equal(effectiveAccess({}, {...signedOutOpts,
 localTrialLastSeenAt:'2026-12-17T00:00:00.000Z',
 now:start+86400000}).tier,'free');

const serverTrial={plan:'pro',status:'trial',source:'installation',
 trialStartedAt:window.startedAt,expiresAt:window.expiresAt};
assert.equal(entitlementIsActive(serverTrial,start),true);
assert.equal(entitlementIsActive(serverTrial,start+TRIAL_MS),false);
assert.equal(entitlementIsActive({plan:'pro',status:'trial'},start),false,
 'trial cannot be permanent by missing expiry');
assert.equal(effectiveAccess(serverTrial,{preview:false,now:start}).tier,'trial');
assert.equal(effectiveAccess(serverTrial,{preview:false,now:start+TRIAL_MS}).tier,'free');
assert.equal(effectiveAccess(serverTrial,{...signedOutOpts,signedOut:false,
 localTrialStartedAt:new Date(start+TRIAL_MS).toISOString(),
 now:start+TRIAL_MS}).tier,'free','new device cannot extend server-expired trial');
assert.equal(effectiveAccess(serverTrial,{preview:true,now:start+TRIAL_MS}).tier,'pro-preview',
 'legacy public Preview remains enabled until payment is launch-ready');

for(const status of ['founder','complimentary','lifetime']){
 const entitlement={plan:'pro',status,source:status};
 const afterFiveYears=Date.parse('2031-11-15T00:00:00Z');
 assert.equal(effectiveAccess(entitlement,{preview:false,now:afterFiveYears}).pro,true);
 assert.equal(canUseFeature(PRO_FEATURES.GOOGLE_SYNC,entitlement,{preview:false,now:afterFiveYears}),true);
 assert.equal(canUseFeature(PRO_FEATURES.MULTI_PLAYER_SCORING,entitlement,{preview:false,now:afterFiveYears}),true);
}
console.log('PASS: exactly 30 days, cutoff, founder lifetime, free bowling/history retention, server-expired trial never restarts from new device, and clock rollback prevention');
