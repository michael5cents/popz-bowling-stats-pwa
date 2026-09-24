import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{stateForCloud}from'../cloud-sync-core.mjs';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sw=readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
const latest=JSON.parse(readFileSync(new URL('../latest-version.json',import.meta.url),'utf8'));

assert.match(html,/id=["']advancedShotTrackingEnabled["'][^>]*type=["']checkbox["']/);
assert.match(html,/Advanced Shot Tracking is off by default/);
assert.match(app,/advancedShotTrackingEnabled:false/);
assert.match(app,/shotTrackingPreference=\(\)=>state\?\.settings\?\.advancedShotTrackingEnabled===true/);
assert.match(app,/shotTrackingActive=\(\)=>shotTrackingPreference\(\)&&hasProFeature\(PRO_FEATURES\.ADVANCED_SHOT_TRACKING\)/);
assert.match(app,/if\(before===0&&shotTrackingActive\(\)\)/);
assert.match(app,/function makeGame\(previous=null\).*shotTrackingActive\(\).*game\.currentFirstBallSetup=\{\.\.\.setup\}/s);
assert.match(app,/currentBallUsed'\)\.addEventListener\('change',\(\)=>shotTrackingActive\(\)\?/);
assert.match(app,/panel\.classList\.toggle\('hidden',!shotWanted\|\|!shotAllowed\)/);
assert.match(app,/toggle\.disabled=!shotAllowed/);

const cloud=stateForCloud({
  settings:{bowlerName:'Bowler',advancedShotTrackingEnabled:true,leagueAverageRules:{}},
  settingsUpdatedAt:'2026-09-21T00:00:00Z',sessions:[],deletedSessions:[]
});
assert.equal(cloud.settings.advancedShotTrackingEnabled,undefined,'shot-tracking opt-in must remain device-local');

assert.equal(latest.version,'public-v31');
assert.match(app,/APP_VERSION='public-v31'/);
assert.match(sw,/SW_VERSION='public-v31'/);
assert.match(sw,/popz-bowling-public-v31/);
assert(!sw.includes('v=27'));
console.log('Advanced Shot Tracking opt-in defaults and device-local behavior passed');
