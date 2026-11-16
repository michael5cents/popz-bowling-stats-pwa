import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const current=read('firestore.rules');
const commercial=read('firestore.commercial.rules');
const prod=JSON.parse(read('firebase.json'));
const emulator=JSON.parse(read('firebase.commercial.emulator.json'));
const serverTrial=read('functions/api/billing/trial.js');
const testRunner=read('scripts/test-commercial-firestore-rules.sh');

assert.equal(prod.firestore.rules,'firestore.rules',
 'production deploy must target the reviewed commercial firestore.rules');
assert.equal(emulator.firestore.rules,'firestore.commercial.rules');
assert.equal(emulator.emulators.firestore.host,'127.0.0.1');
assert.equal(emulator.emulators.ui.enabled,false);
assert.match(testRunner,/demo-popz-bowling-commercial-qa/,
 'the emulator must use a nonproduction demo project ID');
assert.doesNotMatch(testRunner,/firebase deploy|--project popz-bowling-stats/,
 'no production action in the isolated test runner');
assert.match(current,/hasCurrentPro\(userId\)/,
 'commercial release must enforce server-owned Pro access to Google Sync');
assert.match(commercial,/hasCurrentPro\(userId\)/);
assert.match(commercial,/get\(proPath\(userId\)\)/);
assert.match(commercial,/entitlement\.get\('expiresAtTimestamp', null\) is timestamp/);
assert.match(commercial,/expiresAtTimestamp', null\) > request\.time/);
assert.match(commercial,/entitlement\.get\('status', ''\) in \['founder', 'complimentary', 'lifetime'\]/);
assert.match(commercial,/allow create, update, delete: if false/,
 'direct client entitlement writes must never be allowed');
assert.match(serverTrial,/expiresAtTimestamp:\{timestampValue:window\.expiresAt\}/,
 'Firestore Rules rely on server-authored native expiry');
console.log('PASS: commercial Firestore rules prepared for approved live rollout; native trial expiry server-authored');
