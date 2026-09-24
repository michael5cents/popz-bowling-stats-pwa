import assert from'node:assert/strict';
import{normalizeRoster,activeSessionIds,activeGroupSessions,nextIncompleteGroupIndex,groupCurrentGamesComplete}from'../multiplayer.mjs';

assert.deepEqual(normalizeRoster([{name:' Mike ',enteringAverage:'180'},{name:'Shawn',enteringAverage:''}]),[
  {name:'Mike',enteringAverage:180},{name:'Shawn',enteringAverage:null}
]);
assert.throws(()=>normalizeRoster([{name:'Mike'},{name:' mike '}]),/Duplicate bowler/);
assert.throws(()=>normalizeRoster([{name:'Mike',enteringAverage:301}]),/Invalid entering average/);

const state={
  activeSessionId:'b',
  activeGroup:{id:'g',sessionIds:['a','b','c'],activeIndex:1},
  sessions:[{id:'a',done:false},{id:'b',done:true},{id:'c',done:false}]
};
assert.deepEqual([...activeSessionIds(state)].sort(),['a','b','c']);
assert.deepEqual(activeGroupSessions(state).map(x=>x.id),['a','b','c']);
assert.equal(nextIncompleteGroupIndex(state,1,s=>s.done),2);
state.sessions[2].done=true;
assert.equal(nextIncompleteGroupIndex(state,1,s=>s.done),0);
state.sessions[0].done=true;
assert.equal(nextIncompleteGroupIndex(state,1,s=>s.done),-1);
assert.equal(groupCurrentGamesComplete(state,s=>s.done),true);
console.log('multiplayer roster, active-session protection, and turn-order tests passed');
