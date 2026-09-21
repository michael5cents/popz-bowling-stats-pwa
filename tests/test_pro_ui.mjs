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
const release=app.match(/APP_VERSION='public-v(\d+)'/)[1];
assert.ok(sw.includes(`entitlements.mjs?v=${release}`));
assert.ok(sw.includes(`scoring.mjs?v=${release}`));
console.log('Pro Preview UI and gate wiring tests passed');
