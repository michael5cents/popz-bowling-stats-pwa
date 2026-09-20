import assert from'node:assert/strict';
import{PRO_FEATURES,normalizeEntitlement,entitlementIsActive,effectiveAccess,canUseFeature}from'../entitlements.mjs';

const now=Date.parse('2026-09-20T22:00:00Z');

assert.equal(normalizeEntitlement({}).plan,'free');
assert.equal(entitlementIsActive({plan:'free',status:'active'},now),false);
assert.equal(entitlementIsActive({plan:'pro',status:'active'},now),true);
assert.equal(entitlementIsActive({plan:'pro',status:'active',expiresAt:'2026-09-21T00:00:00Z'},now),true);
assert.equal(entitlementIsActive({plan:'pro',status:'active',expiresAt:'2026-09-20T20:00:00Z'},now),false);
assert.equal(entitlementIsActive({plan:'pro',status:'lifetime'},now),true);
assert.equal(entitlementIsActive({plan:'pro',status:'complimentary'},now),true);
assert.equal(entitlementIsActive({plan:'pro',status:'founder'},now),true);

assert.deepEqual(effectiveAccess({}, {preview:false,now}),{tier:'free',label:'Popz Bowling Free',pro:false,preview:false});
assert.deepEqual(effectiveAccess({}, {preview:true,now}),{tier:'pro-preview',label:'Pro Preview',pro:true,preview:true});
assert.equal(canUseFeature(PRO_FEATURES.GOOGLE_SYNC,{}, {preview:true,now}),true);
assert.equal(canUseFeature(PRO_FEATURES.GOOGLE_SYNC,{}, {preview:false,now}),false);
assert.equal(canUseFeature('basic_scoring',{}, {preview:false,now}),true);

console.log('entitlement and Pro Preview tests passed');
