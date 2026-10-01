import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{stateForCloud}from'../cloud-sync-core.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),css=read('style.css'),app=read('app.js'),live=read('live-share-ui.mjs');

assert.match(html,/id="layoutMode"/);
assert.match(html,/value="automatic"/);
assert.match(html,/value="compact-phone"/);
assert.match(html,/value="full"/);
assert.match(html,/id="phoneMoreSeriesBtn"/);
assert.match(html,/id="phoneScoringHeader"/);
assert.match(html,/id="phoneScoringDetailsBtn"/);
assert.match(html,/id="phoneFinishSeriesBtn"/);
assert.match(css,/\.phone-layout #seriesSetup/);
assert.match(css,/\.phone-layout \.pin-pad/);
assert.match(css,/\.phone-layout \.game-details/);
assert.match(css,/\.phone-layout #firstBallSetup/);
assert.match(app,/readLayoutMode\(\)/);
assert.match(app,/writeLayoutMode\(value\)/);
assert.match(app,/document\.body\.classList\.toggle\('phone-layout'/);
assert.doesNotMatch(app,/settings\.layoutMode/);
assert.match(live,/phoneScoringHeader/);

const state={settings:{bowlerName:'A',layoutMode:'compact-phone'},sessions:[],deletedSessions:[]};
assert.equal(stateForCloud(state).settings.layoutMode,undefined,'layout must never enter cloud settings');
console.log('Compact Phone UI isolation and cloud-exclusion tests passed');
