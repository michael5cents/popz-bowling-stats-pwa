import {activeSessionIds} from './multiplayer.mjs';
import {undoRoll} from './scoring.mjs';

const VERSION=1;
const MAX_ACTIONS=512;
const rollsSnapshot=game=>JSON.stringify((game?.frames||[]).map(frame=>frame.rolls));
const activeSessions=state=>{
  const ids=activeSessionIds(state);
  return (state?.sessions||[]).filter(session=>ids.has(session.id));
};
const scopeFor=state=>JSON.stringify(activeSessions(state).map(session=>[session.id,...(session.games||[]).map(game=>game.id)]).sort(([a],[b])=>a.localeCompare(b)));

// An explicit empty history is a barrier. Missing history means a legacy install.
// This is device-local state, never part of the cloud settings or session records.
export function resetRollUndo(state){
  state.rollUndo={version:VERSION,deviceId:state.deviceId,scope:scopeFor(state),actions:[]};
  return state.rollUndo;
}

function historyMatches(state){
  const history=state?.rollUndo;
  return history?.version===VERSION&&history.deviceId===state.deviceId&&history.scope===scopeFor(state)&&Array.isArray(history.actions)&&history.actions.length<=MAX_ACTIONS;
}

export function rememberRollUndo(state,session,game,frameIndex){
  const history=historyMatches(state)?state.rollUndo:resetRollUndo(state);
  const frame=game?.frames?.[frameIndex];
  if(!activeSessions(state).includes(session)||!session.games.includes(game)||!frame?.rolls?.length)return;
  history.actions.push({sessionId:session.id,gameId:game.id,frameIndex,rollIndex:frame.rolls.length-1,pins:frame.rolls.at(-1),after:rollsSnapshot(game)});
  if(history.actions.length>MAX_ACTIONS)history.actions.splice(0,history.actions.length-MAX_ACTIONS);
}

export function undoRecordedRoll(state){
  if(state?.rollUndo==null)return {status:'legacy'};
  if(!historyMatches(state)){
    resetRollUndo(state);
    return {status:'changed'};
  }
  const history=state.rollUndo,action=history.actions.at(-1);
  if(!action)return {status:'empty'};
  const session=activeSessions(state).find(item=>item.id===action.sessionId);
  const game=session?.games?.find(item=>item.id===action.gameId);
  const frame=game?.frames?.[action.frameIndex];
  const lastFrame=game?.frames?.findLastIndex(item=>item.rolls?.length);
  if(!game||lastFrame!==action.frameIndex||!Number.isInteger(action.rollIndex)||action.rollIndex<0||frame?.rolls?.length!==action.rollIndex+1||frame.rolls.at(-1)!==action.pins||rollsSnapshot(game)!==action.after){
    resetRollUndo(state);
    return {status:'changed'};
  }
  if(!undoRoll(game)){
    resetRollUndo(state);
    return {status:'changed'};
  }
  history.actions.pop();
  return {status:'undone',session,game};
}
