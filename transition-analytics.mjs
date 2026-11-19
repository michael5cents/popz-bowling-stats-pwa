import{gameComplete,normalizeFirstBallSetup}from'./scoring.mjs?v=39.020';

const text=v=>String(v??'').trim().replace(/\s+/g,' ');
const key=v=>text(v).toLocaleLowerCase();
const sameNum=(a,b)=>a===b||(a==null&&b==null);
const setupKey=setup=>[key(setup.ballUsed),setup.standBoard??'',setup.targetBoard??''].join('|');

function frameRow(session,game,gameIndex,frame,frameIndex){
 if(!frame?.rolls?.length||!frame.firstBallSetup)return null;
 const setup=normalizeFirstBallSetup(frame.firstBallSetup);
 if(!setup.ballUsed&&setup.standBoard==null&&setup.targetBoard==null)return null;
 const firstPins=Number(frame.rolls[0]),leave=(frame.leave||[]).map(Number).filter(n=>n>=1&&n<=10);
 return{
  sessionId:session.id||'',date:session.date||'',league:text(session.league)||'Practice',
  center:text(session.center),oil:text(session.oilPattern),lane:text(game?.lane||session?.lane),
  gameId:game.id||'',gameNumber:gameIndex+1,frameNumber:frameIndex+1,setup,
  firstPins:Number.isFinite(firstPins)?firstPins:null,strike:firstPins===10,
  tenPinLeave:leave.length===1&&leave[0]===10
 };
}
function adjacent(a,b){
 return a.gameNumber===b.gameNumber?b.frameNumber===a.frameNumber+1:
  b.gameNumber===a.gameNumber+1&&a.frameNumber===10&&b.frameNumber===1;
}
function metric(rows=[]){
 const usable=rows.filter(Boolean),first=usable.filter(r=>Number.isFinite(r.firstPins));
 const strikes=usable.filter(r=>r.strike).length,firstPinsTotal=first.reduce((n,r)=>n+r.firstPins,0),tenPinLeaves=usable.filter(r=>r.tenPinLeave).length;
 return{frames:usable.length,strikes,strikePct:usable.length?strikes/usable.length*100:null,firstPinsTotal,firstPinFrames:first.length,avgFirstPins:first.length?firstPinsTotal/first.length:null,tenPinLeaves};
}
function changeType(from,to){
 const ball=key(from.ballUsed)!==key(to.ballUsed),stand=!sameNum(from.standBoard,to.standBoard),target=!sameNum(from.targetBoard,to.targetBoard);
 if(ball&&(stand||target))return'Ball + line';
 if(ball)return'Ball';
 if(stand&&target)return'Feet + target';
 if(stand)return'Feet';
 if(target)return'Target';
 return'Setup';
}
function changeText(from,to){
 const line=s=>`${s.standBoard??'—'} → ${s.targetBoard??'—'}`;
 const fromBall=text(from.ballUsed)||'Ball not named',toBall=text(to.ballUsed)||'Ball not named';
 return`${fromBall} ${line(from)} → ${toBall} ${line(to)}`;
}
function delta(a,b){return a==null||b==null?null:b-a}

export function transitionEvents(sessions=[]){
 const events=[];
 for(const session of sessions){
  const byLane=new Map();
  for(const [gameIndex,game] of(session.games||[]).entries()){
   if(!gameComplete(game))continue;
   for(const [frameIndex,frame] of(game.frames||[]).slice(0,10).entries()){
    const row=frameRow(session,game,gameIndex,frame,frameIndex);
    if(!row)continue;
    const actual=String(frame.firstBallLane||'');
    row.actualLane=actual;
    if(actual)row.lane=actual;
    const group=actual?'actual:'+actual:'legacy';
    if(!byLane.has(group))byLane.set(group,[]);
    byLane.get(group).push(row);
   }
  }
  for(const rows of byLane.values()){
   let segments=[],active=null,last=null;
   const adjacentLane=(a,b)=>{
    if(a.gameNumber===b.gameNumber)return b.frameNumber===a.frameNumber+(a.actualLane?2:1);
    return !a.actualLane&&b.gameNumber===a.gameNumber+1&&a.frameNumber===10&&b.frameNumber===1;
   };
   for(const row of rows){
    const sk=setupKey(row.setup),connected=last&&adjacentLane(last,row);
    if(active&&active.setupKey===sk&&connected){active.rows.push(row);active.end=row;last=row;continue}
    active={setupKey:sk,setup:row.setup,rows:[row],start:row,end:row,connected:!!connected};
    segments.push(active);last=row;
   }
   for(let i=1;i<segments.length;i++){
    const before=segments[i-1],after=segments[i];
    if(!after.connected||before.setupKey===after.setupKey)continue;
    const bm=metric(before.rows),am=metric(after.rows),type=changeType(before.setup,after.setup);
    events.push({
     sessionId:session.id||'',date:session.date||'',league:text(session.league)||'Practice',
     center:text(session.center),oil:text(session.oilPattern),lane:after.start.lane||before.end.lane,
     gameNumber:after.start.gameNumber,frameNumber:after.start.frameNumber,
     from:before.setup,to:after.setup,type,label:changeText(before.setup,after.setup),
     before:bm,after:am,strikeDelta:delta(bm.strikePct,am.strikePct),firstPinsDelta:delta(bm.avgFirstPins,am.avgFirstPins),
     ballChanged:key(before.setup.ballUsed)!==key(after.setup.ballUsed),
     standDelta:before.setup.standBoard==null||after.setup.standBoard==null?null:after.setup.standBoard-before.setup.standBoard,
     targetDelta:before.setup.targetBoard==null||after.setup.targetBoard==null?null:after.setup.targetBoard-before.setup.targetBoard
    });
   }
  }
 }
 return events.sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.gameNumber-a.gameNumber||b.frameNumber-a.frameNumber);
}

export function aggregateTransitions(events=[]){
 const groups=new Map();
 for(const event of events){
  const k=[key(event.center),key(event.oil),key(event.lane),setupKey(event.from),setupKey(event.to)].join('||');
  let g=groups.get(k);
  if(!g){g={center:event.center,oil:event.oil,lane:event.lane,type:event.type,label:event.label,from:event.from,to:event.to,occurrences:0,beforeFrames:0,beforeStrikes:0,beforePins:0,beforePinFrames:0,beforeTenPins:0,afterFrames:0,afterStrikes:0,afterPins:0,afterPinFrames:0,afterTenPins:0,dates:new Set()};groups.set(k,g)}
  g.occurrences++;g.dates.add(event.date||'');
  g.beforeFrames+=event.before.frames;g.beforeStrikes+=event.before.strikes;g.beforePins+=event.before.firstPinsTotal;g.beforePinFrames+=event.before.firstPinFrames;g.beforeTenPins+=event.before.tenPinLeaves;
  g.afterFrames+=event.after.frames;g.afterStrikes+=event.after.strikes;g.afterPins+=event.after.firstPinsTotal;g.afterPinFrames+=event.after.firstPinFrames;g.afterTenPins+=event.after.tenPinLeaves;
 }
 return[...groups.values()].map(g=>{
  const beforeStrikePct=g.beforeFrames?g.beforeStrikes/g.beforeFrames*100:null,afterStrikePct=g.afterFrames?g.afterStrikes/g.afterFrames*100:null,
   beforeAvgFirstPins=g.beforePinFrames?g.beforePins/g.beforePinFrames:null,afterAvgFirstPins=g.afterPinFrames?g.afterPins/g.afterPinFrames:null,
   dates=g.dates.size,minFrames=Math.min(g.beforeFrames,g.afterFrames);
  const evidenceLevel=g.occurrences>=5&&dates>=3&&minFrames>=20?'Strong':g.occurrences>=3&&dates>=2&&minFrames>=12?'Useful':g.occurrences>=2||minFrames>=8?'Building':'Early';
  return{center:g.center,oil:g.oil,lane:g.lane,type:g.type,label:g.label,from:g.from,to:g.to,occurrences:g.occurrences,dates,
   beforeFrames:g.beforeFrames,afterFrames:g.afterFrames,beforeStrikePct,afterStrikePct,strikeDelta:delta(beforeStrikePct,afterStrikePct),
   beforeAvgFirstPins,afterAvgFirstPins,firstPinsDelta:delta(beforeAvgFirstPins,afterAvgFirstPins),beforeTenPins:g.beforeTenPins,afterTenPins:g.afterTenPins,evidenceLevel};
 }).sort((a,b)=>({Strong:4,Useful:3,Building:2,Early:1}[b.evidenceLevel]-({Strong:4,Useful:3,Building:2,Early:1}[a.evidenceLevel]))||b.occurrences-a.occurrences||(b.afterFrames+b.beforeFrames)-(a.afterFrames+a.beforeFrames)||a.label.localeCompare(b.label));
}
