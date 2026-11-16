import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 wholeGameBall,summarizeBallPerformance,summarizeLinePerformance,
 summarizeBreakdown,filterSessionsByMeta,firstBallFrameRows,
 frameLane,laneNumbers,undoRoll
} from '../scoring.mjs';
import {transitionEvents,aggregateTransitions} from '../transition-analytics.mjs';
import {buildStatsEvaluations,sampleLevel} from '../stats-evaluation.mjs';
import {validateBowlingBackup} from '../backup-validation.mjs';
import {stateForCloud} from '../cloud-sync-core.mjs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sw=readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');

const makeGame=(mode='mixed')=>{
 const frames=Array.from({length:10},(_,index)=>{
  const ball=mode==='single'?'Ball A':index<5?'Ball A':'Ball B';
  const lane=index%2===0?'21':'22';
  return {rolls:index===9?[10,10,10]:[10],
    firstBallSetup:{ballUsed:ball,standBoard:lane==='21'?(index<4?25:27):30,targetBoard:lane==='21'?12:15},
    firstBallLane:lane};
 });
 return {id:'game-001',lane:'21-22',startingLane:'21',
  laneSetups:{'21':{standBoard:27,targetBoard:12},'22':{standBoard:30,targetBoard:15}},
  ballUsed:'Ball A',frames};
};
const session=g=>({id:'session-001',date:'2026-11-17',league:'Tuesday',center:'Center A',
 oilPattern:'Lithium',gameCount:1,games:[g]});
const mixed=makeGame('mixed');
const rows=firstBallFrameRows([session(mixed)]);
assert.equal(rows.length,10);
assert.equal(rows.filter(x=>x.ballUsed==='Ball A').length,5);
assert.equal(rows.filter(x=>x.ballUsed==='Ball B').length,5);
assert.equal(rows.filter(x=>x.actualLane==='21').length,5);
assert.equal(rows.filter(x=>x.actualLane==='22').length,5);
assert.equal(wholeGameBall(session(mixed),mixed),'','mixed-ball game must NOT be credited to starting ball');
assert.equal(summarizeBreakdown([session(mixed)],'ball').length,0,'Free By-Ball uses complete games only');
assert.equal(filterSessionsByMeta([session(mixed)],{ball:'Ball A'}).length,0,'Free whole-game Ball filter must exclude mixed game');
const ballRows=summarizeBallPerformance([session(mixed)]);
assert.equal(ballRows.length,2);
for(const row of ballRows){
 assert.equal(row.trackedFrames,5);
 assert.equal(row.fullGames,0);
 assert.equal(row.fullGameAverage,null);
}
const lines=summarizeLinePerformance([session(mixed)]);
assert(lines.some(row=>row.actualLane==='21'));
assert(lines.some(row=>row.actualLane==='22'));
assert(lines.some(row=>row.ballUsed===undefined&&row.label==='Ball B'));
assert(lines.every(row=>row.frames>0));
const single=makeGame('single');
assert.equal(wholeGameBall(session(single),single),'Ball A');
assert.equal(summarizeBallPerformance([session(single)])[0].fullGames,1);
const legacy=makeGame('single');
for(const f of legacy.frames){delete f.firstBallSetup;delete f.firstBallLane}
assert.equal(wholeGameBall(session(legacy),legacy),'Ball A','legacy full-game ball attribution preserved');
assert.equal(summarizeLinePerformance([session(legacy)]).length,0,'no invented board positions on old history');

assert.deepEqual(laneNumbers('21-22'),['21','22']);
assert.deepEqual(laneNumbers('21'),['21']);
assert.equal(frameLane(mixed,0),'21');
assert.equal(frameLane(mixed,1),'22');
assert.equal(frameLane(mixed,2),'21');
assert.equal(frameLane({...mixed,startingLane:'22'},0),'22');
assert.equal(frameLane({...mixed,startingLane:'22'},1),'21');
const undoGame={...makeGame('single'),frames:makeGame('single').frames.map(x=>({...x}))};
assert.equal(undoRoll(undoGame),true);
assert.equal(undoGame.frames[9].rolls.length,2);
undoRoll(undoGame);undoRoll(undoGame);
assert.equal(undoGame.frames[9].firstBallSetup,undefined);
assert.equal(undoGame.frames[9].firstBallLane,undefined,'undo first roll deletes lane attribution');

const transitionGame=makeGame('single');
const events=transitionEvents([session(transitionGame)]);
assert(events.some(x=>x.lane==='21'&&x.type==='Feet'),'same-lane stand adjustment detected');
assert(!events.some(x=>x.lane==='22'),'normal alternating lane 22 is not a stand transition');
assert(events.every(e=>e.before.frames>0&&e.after.frames>0));
const groups=aggregateTransitions(events);
assert(groups.length>0&&groups.every(x=>x.lane==='21'));
assert(groups.every(x=>x.evidenceLevel==='Early'),'one night is too little evidence for a strong claim');
assert.equal(sampleLevel(1,1),'Early');
const evaluations=buildStatsEvaluations({summary:{games:1,average:300,highGame:300,strikePct:100,sparePct:null},
 sessionRows:[{date:'2026-11-17',games:1,average:300}],leagueRows:[],ballRows, lineRows:lines,
 transitionGroups:groups});
assert.equal(evaluations.overall.level,'Early');
assert.match(evaluations.transition.text,/Early|Building|sample|evidence|transition|change/i);

const backup={version:2,sessions:[session(mixed)],settings:{advancedShotTrackingEnabled:true},deletedSessions:[]};
assert.equal(validateBowlingBackup(backup),backup);
assert.equal(stateForCloud(backup).sessions[0].games[0].laneSetups['21'].standBoard,27);
const bad=structuredClone(backup);bad.sessions[0].games[0].laneSetups['21'].targetBoard=999;
assert.throws(()=>validateBowlingBackup(bad),/lane.*targetBoard|targetBoard|invalid bowling backup/i);

for(const id of ['proAnalyticsSection','proAnalyticsLock','proAnalyticsContent','advancedStatsPanel',
 'transitionPanel','evaluationPanel','proBallBreakdown','proLineBreakdown','transitionPatterns',
 'transitionEvents','overallEvaluation','startingLane','laneSetupRows','singleLaneSetup']){
 assert.match(html,new RegExp('id="'+id+'"'));
}
assert.match(app,/hasProFeature\(PRO_FEATURES\.ADVANCED_LINE_ANALYTICS\)/);
assert.match(app,/if\(!enabled\)\{/);
assert.match(app,/statsBowlerId\(\)==='all'/);
assert.match(app,/g\.frames\[fi\]\.firstBallLane=physicalLane/);
assert.match(app,/frameLane\(g,fi\)/);
assert.match(app,/function saveStartingLane\(\)/);
assert.match(sw,/transition-analytics\.mjs\?v=39\.016/);
assert.match(sw,/stats-evaluation\.mjs\?v=39\.016/);
console.log('PASS: strict Free/Pro analytics boundaries, mixed-ball accuracy, per-lane attribution, transitions, honest evidence, legacy data, backups and offline caches.');
