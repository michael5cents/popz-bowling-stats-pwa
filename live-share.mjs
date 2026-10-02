// Explicit spectator allowlist: never serialize the session or the application state.
import {gameComplete,scoreGame,rollMark,summarizeSessions,handicapPins,getCurrentFirstBallSetup} from './scoring.mjs?v=39.007';

const clean = value => String(value ?? '').trim().slice(0,120);
export function buildLiveSnapshot(session,bowlerName='',finished=false) {
  if (!session) return null;
  const source = session.games || [];
  const games = source.map((game,index) => {
    const score = scoreGame(game);
    return {gameNumber:index+1,complete:gameComplete(game),score:score.final??score.total,
      frames:game.frames.slice(0,10).map((frame,i) => ({
        marks:Array.from({length:i===9?3:2},(_,j)=>rollMark(frame,i,j)),
        cumulative:score.cumulative[i]??null
      }))};
  });
  const current = [...source].reverse().find(g=>!gameComplete(g)) || source.at(-1);
  const board = games[source.indexOf(current)];
  const complete = games.filter(g=>g.complete);
  const total = complete.reduce((sum,g)=>sum+g.score,0);
  let finalStats = null;
  if (finished) {
    const st = summarizeSessions([session]);
    const hdcp = handicapPins(session.enteringAverage,session.handicapPct??90,session.handicapBase??220);
    finalStats = {games:st.games,seriesTotal:total,average:st.average,highGame:st.highGame,
      handicapPerGame:hdcp,handicapSeries:Number.isFinite(hdcp)&&st.games?total+hdcp*st.games:null,
      strikePct:st.strikePct,sparePct:st.sparePct,splitPct:st.splitPct,
      singlePinPct:st.singlePinPct,tenPinPct:st.tenPinPct};
  }
  return {schemaVersion:2,bowlerName:clean(bowlerName)||'Bowler',league:clean(session.league)||'Bowling',
    seriesName:clean(session.name),date:clean(session.date),gameNumber:board?.gameNumber??0,
    gameCount:Math.max(1,Number(session.gameCount)||source.length||1),games,
    currentScore:board?.score??0,currentBall:clean(getCurrentFirstBallSetup(current,current?.ballUsed||session.ballUsed||'').ballUsed),
    seriesScratch:total+(board&&!board.complete?board.score:0),finalStats,finished:!!finished};
}
