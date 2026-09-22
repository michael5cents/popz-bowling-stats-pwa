import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{emptyFrames,summarizeSessions}from'../scoring.mjs';
import{stateForCloud}from'../cloud-sync-core.mjs';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const latest=JSON.parse(readFileSync(new URL('../latest-version.json',import.meta.url),'utf8'));

assert.equal(latest.version,'public-v29');
assert.match(app,/APP_VERSION='public-v29'/);
assert.match(app,/scoringMode:'simplified'/);
assert.match(app,/const scoringMode=\(\)=>state\?\.settings\?\.scoringMode==='detailed'\?'detailed':'simplified'/);
assert.match(app,/before===0&&pins<10&&detailedScoring\(\)/);
assert.match(app,/data-toggle-split="1"/);
assert.match(app,/async function toggleQuickSplit/);
assert.match(html,/id="scoringMode"/);
assert.match(html,/Quick Scoring is the default/);
assert.match(html,/Mark Split/);
assert.match(html,/id="editSplit"/);

const makeGame=(firstSecond,made)=>{
 const frames=emptyFrames();
 frames[0].rolls=[7,firstSecond];
 frames[0].split=true;
 for(let i=1;i<9;i++)frames[i].rolls=[10];
 frames[9].rolls=[10,10,10];
 return{id:made?'made':'miss',frames};
};
const made=makeGame(3,true),miss=makeGame(2,false);
const st=summarizeSessions([{games:[made,miss]}]);
assert.equal(st.splitOpps,2);
assert.equal(st.splitMade,1);
assert.equal(st.splitPct,50);
assert.equal(st.leaveDetails.length,0,'Quick split flags must not invent exact leave patterns');

const cloud=stateForCloud({
 settings:{bowlerName:'Bowler',leagueAverageRules:{},scoringMode:'detailed',advancedShotTrackingEnabled:true},
 settingsUpdatedAt:'2026-09-21T00:00:00Z',sessions:[],deletedSessions:[]
});
assert.equal(cloud.settings.scoringMode,undefined);
assert.equal(cloud.settings.advancedShotTrackingEnabled,undefined);
console.log('Quick/Detailed scoring defaults, split stats, help markers, and device-local sync behavior passed');
