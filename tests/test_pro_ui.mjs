import assert from'node:assert/strict';
import{readFileSync}from'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const sw=readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');

for(const id of ['planTopBadge','planBadge','planStatus','firstBallSetup','shotTrackingLocked','currentStandBoard','currentTargetBoard','saveCurrentSetupBtn','seriesMode','multiRosterPanel','rosterRows','groupTurnBar','groupBowlerTabs','bowlerFilter','historyBowlerFilter']){
  assert.match(html,new RegExp(`id=["']${id}["']`),`missing ${id}`);
}
assert.match(html,/data-pro-badge/);
assert.doesNotMatch(html,/During <strong>PRO PREVIEW<\/strong>/,'commercial Help must not tell customers preview is still active');
assert.match(html,/30-day Pro trial|Lifetime Pro/);
assert.match(app,/label=proAccess.preview\?'PRO PREVIEW'/,'legacy preview cases still dynamically labeled, but Preview is disabled commercially');
assert.match(app,/PRO_FEATURES\.ADVANCED_SHOT_TRACKING/);
assert.match(app,/PRO_FEATURES\.GOOGLE_SYNC/);
assert.match(app,/PRO_FEATURES\.MULTI_PLAYER_SCORING/);
assert.match(html,/Team \/ Multi-Bowler — PRO/);
assert.match(app,/Team \/ Multi-Bowler scoring requires Popz Bowling Pro/);
assert.match(app,/onEntitlement:setProAccess/);
const release=app.match(/APP_VERSION='public-v([^']+)'/)[1];
assert.ok(sw.includes(`entitlements.mjs?v=${release}`));
assert.ok(sw.includes(`scoring.mjs?v=${release}`));
console.log('Commercial Pro/Trial/Founder UI and gate wiring tests passed');
