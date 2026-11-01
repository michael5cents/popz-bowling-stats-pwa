import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import * as scoring from '../scoring.mjs';
import * as multiplayer from '../multiplayer.mjs';
import * as undoHistory from '../roll-undo.mjs';

const appLines=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8').split('\n');
const handler=name=>{
 const source=appLines.find(line=>line.startsWith('function '+name+'(')||line.startsWith('async function '+name+'('));
 assert.ok(source,'missing actual handler '+name);return source;
};
const game=id=>({id,frames:scoring.emptyFrames()});
function harness({team=true}={}){
 const ids=team?['A','B']:['A'];let clock=0,gameNumber=0;
 const state={version:2,deviceId:'test-device',settings:{},activeSessionId:'A',activeGroup:team?{id:'group',sessionIds:ids,activeIndex:0}:null,rollUndo:null,sessions:ids.map(id=>({id,bowlerName:id,gameCount:3,games:[game(id+'-game')]}))};
 const messages=[],saved=[],inputs={editBall1:{value:'9'},editBall2:{value:'0'},editBall3:{value:''},editSplit:{checked:false}};
 const noop=()=>{};
 const context={...scoring,...multiplayer,...undoHistory,state,pendingLeave:null,editingFrameIndex:null,leaveSelection:new Set(),nowIso:()=>new Date(Date.UTC(2026,10,1,0,0,clock++)).toISOString(),shotTrackingActive:()=>false,detailedScoring:()=>false,saveState:async()=>saved.push(structuredClone(context.state)),renderAll:noop,reconcileTelemetry:noop,toast:message=>messages.push(message),sessionBowlerName:session=>session.bowlerName,jumpToFirstFrame:noop,confirm:()=>true,makeGame:()=>game('next-'+(++gameNumber)),$:id=>inputs[id],cloudUser:()=>null,exportBackup:async()=>{},renderGroupSummary:noop,renderSeriesSummary:noop,showView:noop};
 vm.createContext(context);
 for(const name of ['activeSession','activeGame','touchSession','groupActive','groupSessions','sessionActiveGame','groupCurrentGameComplete','groupTargetComplete','activateGroupIndex','rotateGroupTurn','currentTurnStarted','switchGroupBowler','recordRoll','undo','frameEditRolls','saveFrameEdit','newGame','deleteCurrentGame','finishSeries'])vm.runInContext(handler(name),context);
 return {context,messages,saved,inputs};
}
const firstGames=h=>h.context.state.sessions.map(session=>session.games[0].frames.slice(0,2).map(frame=>[...frame.rolls]));

test('actual Undo restores the scorer after automatic team rotation',async()=>{
 const h=harness();await h.context.recordRoll(10);
 assert.equal(h.context.state.activeSessionId,'B');await h.context.undo();
 assert.equal(h.context.state.activeSessionId,'A');
 assert.deepEqual(firstGames(h),[[[],[]],[[],[]]]);
 assert.match(h.messages.at(-1),/^A.*Last roll removed/);
});

test('actual team Undo follows scoring order after manual selection and repeated Undo',async()=>{
 const h=harness();await h.context.recordRoll(10);await h.context.recordRoll(10);await h.context.recordRoll(10);
 await h.context.switchGroupBowler(0);await h.context.switchGroupBowler(1);
 await h.context.undo();assert.deepEqual(firstGames(h),[[[10],[]],[[10],[]]]);assert.equal(h.context.state.activeSessionId,'A');
 await h.context.undo();assert.deepEqual(firstGames(h),[[[10],[]],[[],[]]]);assert.equal(h.context.state.activeSessionId,'B');
 await h.context.undo();assert.deepEqual(firstGames(h),[[[],[]],[[],[]]]);assert.equal(h.context.state.activeSessionId,'A');
 await h.context.undo();assert.deepEqual(firstGames(h),[[[],[]],[[],[]]]);
});

test('Undo order survives saving and reloading, including a tenth-frame fill ball',async()=>{
 const h=harness();
 for(const session of h.context.state.sessions)for(let i=0;i<9;i++)session.games[0].frames[i].rolls=[10];
 await h.context.recordRoll(10);await h.context.recordRoll(10);await h.context.recordRoll(10);
 assert.equal(h.context.state.activeSessionId,'B');
 h.context.state=JSON.parse(JSON.stringify(h.saved.at(-1)));await h.context.undo();
 assert.equal(h.context.state.activeSessionId,'A');
 assert.deepEqual(h.context.state.sessions[0].games[0].frames[9].rolls,[10,10]);
 assert.deepEqual(h.context.state.sessions[1].games[0].frames[9].rolls,[]);
});

test('frame edits are barriers; a subsequent roll can be undone without undoing the correction',async()=>{
 const h=harness();await h.context.recordRoll(10);await h.context.recordRoll(10);
 h.context.editingFrameIndex=0;await h.context.saveFrameEdit();await h.context.undo();
 assert.deepEqual(firstGames(h),[[[9,0],[]],[[10],[]]]);
 await h.context.recordRoll(10);await h.context.undo();await h.context.undo();
 assert.deepEqual(firstGames(h),[[[9,0],[]],[[10],[]]]);
});

test('stale action snapshots cannot remove changed scores',async()=>{
 const h=harness();await h.context.recordRoll(10);
 h.context.state.sessions[0].games[0].frames[0].rolls=[9,0];
 await h.context.undo();assert.deepEqual(firstGames(h),[[[9,0],[]],[[],[]]]);
 assert.match(h.messages.at(-1),/game changed/);
 assert.equal(h.context.state.rollUndo.actions.length,0);
});

test('starting and deleting team games prevents Undo from modifying an earlier game',async()=>{
 const h=harness();for(const session of h.context.state.sessions)for(let i=0;i<12;i++)scoring.addRoll(session.games[0],10);
 undoHistory.resetRollUndo(h.context.state);await h.context.newGame();await h.context.undo();
 assert.equal(h.context.state.sessions[0].games.length,2);assert.equal(scoring.scoreGame(h.context.state.sessions[0].games[0]).final,300);
 await h.context.recordRoll(7);await h.context.deleteCurrentGame();await h.context.undo();
 assert.equal(h.context.state.sessions[0].games.length,1);assert.equal(h.context.state.sessions[1].games.length,1);
 for(const session of h.context.state.sessions)assert.equal(scoring.scoreGame(session.games[0]).final,300);
});

test('finished series and a foreign device action history cannot be undone',async()=>{
 const h=harness();await h.context.recordRoll(10);await h.context.finishSeries();await h.context.undo();
 assert.equal(h.context.state.activeSessionId,null);assert.deepEqual(firstGames(h),[[[10],[]],[[],[]]]);
 const foreign=harness();await foreign.context.recordRoll(10);foreign.context.state.deviceId='different-device';await foreign.context.undo();
 assert.deepEqual(firstGames(foreign),[[[10],[]],[[],[]]]);
});

test('legacy single Undo remains available but legacy team order is never guessed',async()=>{
 const single=harness({team:false});scoring.addRoll(single.context.state.sessions[0].games[0],5);await single.context.undo();
 assert.deepEqual(firstGames(single),[[[],[]]]);
 const team=harness();scoring.addRoll(team.context.state.sessions[0].games[0],10);team.context.activateGroupIndex(1);await team.context.undo();
 assert.deepEqual(firstGames(team),[[[10],[]],[[],[]]]);assert.match(team.messages.at(-1),/select the bowler and edit/);
});

test('single Undo still targets the finishing roll when an older game was left incomplete',async()=>{
 const h=harness({team:false}),session=h.context.state.sessions[0];
 scoring.addRoll(session.games[0],5);await h.context.newGame();
 const newer=session.games[1];for(let i=0;i<11;i++)scoring.addRoll(newer,10);
 await h.context.recordRoll(10);
 assert.equal(scoring.scoreGame(newer).final,300);assert.equal(h.context.activeGame(),session.games[0]);
 await h.context.undo();assert.equal(h.context.activeGame(),newer);
 assert.deepEqual(newer.frames[9].rolls,[10,10]);assert.deepEqual(session.games[0].frames[0].rolls,[5]);
});
