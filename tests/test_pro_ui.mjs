import assert from'node:assert/strict';
import{readFileSync}from'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const sw=readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');

for(const id of ['planTopBadge','planBadge','planStatus','firstBallSetup','shotTrackingLocked','currentStandBoard','currentTargetBoard','saveCurrentSetupBtn']){
  assert.match(html,new RegExp(`id=["']${id}["']`),`missing ${id}`);
}
assert.match(html,/data-pro-badge/);
assert.match(html,/PRO PREVIEW/);
assert.match(app,/PRO_FEATURES\.ADVANCED_SHOT_TRACKING/);
assert.match(app,/PRO_FEATURES\.GOOGLE_SYNC/);
assert.match(app,/onEntitlement:setProAccess/);
assert.match(sw,/entitlements\.mjs\?v=26/);
assert.match(sw,/scoring\.mjs\?v=26/);
console.log('Pro Preview UI and gate wiring tests passed');
