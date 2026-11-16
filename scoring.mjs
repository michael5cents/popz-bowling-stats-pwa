export const emptyFrames=()=>Array.from({length:10},()=>({rolls:[]}));
export function frameComplete(frame,index){const r=frame?.rolls||[];if(index<9)return r[0]===10||r.length>=2;if(r.length<2)return false;return(r[0]===10||r[0]+r[1]===10)?r.length>=3:true;}
export const gameComplete=g=>g.frames.every((f,i)=>frameComplete(f,i));
export function activeFrameIndex(g){const i=g.frames.findIndex((f,n)=>!frameComplete(f,n));return i===-1?9:i;}
export function nextRollMax(g){const i=activeFrameIndex(g),r=g.frames[i].rolls;if(i<9){if(!r.length)return 10;if(r[0]===10)return 0;return 10-r[0];}if(!r.length)return 10;if(r.length===1)return r[0]===10?10:10-r[0];if(r.length>=3)return 0;if(r[0]===10)return r[1]===10?10:10-r[1];if(r[0]+r[1]===10)return 10;return 0;}
export function addRoll(g,pins){if(gameComplete(g))throw Error('Game is complete');const max=nextRollMax(g);if(!Number.isInteger(pins)||pins<0||pins>max)throw Error(`Pins must be 0-${max}`);g.frames[activeFrameIndex(g)].rolls.push(pins);return g;}
const cleanSetupText=v=>String(v??'').trim().replace(/\s+/g,' ');
const cleanBoard=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=60?Math.round(n*2)/2:null};
export function normalizeFirstBallSetup(setup={}){return{ballUsed:cleanSetupText(setup.ballUsed),standBoard:cleanBoard(setup.standBoard),targetBoard:cleanBoard(setup.targetBoard)}}
export function laneNumbers(value=''){const text=String(value??'').trim(),match=text.match(/^(\d{1,3})(?:\s*[-–—\/,]\s*(\d{1,3}))?$/);return match?[...new Set([match[1],match[2]].filter(Boolean))]:[]}
export function frameLane(g,index=activeFrameIndex(g)){const lanes=laneNumbers(g?.lane);if(!lanes.length)return'';const start=lanes.includes(String(g?.startingLane??''))?String(g.startingLane):lanes[0];return lanes[(lanes.indexOf(start)+Math.max(0,Number(index)||0))%lanes.length]}
export function getCurrentFirstBallSetup(g,fallbackBall=''){const current=g?.currentFirstBallSetup;if(current)return normalizeFirstBallSetup(current);for(let i=(g?.frames?.length||0)-1;i>=0;i--){const saved=g.frames[i]?.firstBallSetup;if(saved)return normalizeFirstBallSetup(saved)}return normalizeFirstBallSetup({ballUsed:g?.ballUsed??fallbackBall})}
export function setCurrentFirstBallSetup(g,setup={}){if(!g)return normalizeFirstBallSetup(setup);g.currentFirstBallSetup=normalizeFirstBallSetup(setup);return g.currentFirstBallSetup}
export function captureFirstBallSetup(g,index=activeFrameIndex(g),fallbackBall=''){const f=g?.frames?.[index];if(!f||f.rolls?.length)return f?.firstBallSetup||null;const setup=getCurrentFirstBallSetup(g,fallbackBall);if(setup.ballUsed||setup.standBoard!=null||setup.targetBoard!=null)f.firstBallSetup={...setup};return f.firstBallSetup||null}
export function undoRoll(g){for(let i=9;i>=0;i--){if(g.frames[i].rolls.length){g.frames[i].rolls.pop();if(g.frames[i].rolls.length===0){delete g.frames[i].leave;delete g.frames[i].split;delete g.frames[i].firstBallSetup;delete g.frames[i].firstBallLane;}return true;}}return false;}
export function rollMark(frame,index,j){const r=frame.rolls,n=r[j];if(n==null)return'';if(index<9){if(j===0&&n===10)return'X';if(j===1&&r[0]+n===10)return'/';return n===0?'-':String(n);}if(n===0)return'-';if(j===0&&n===10)return'X';if(j===1){if(r[0]!==10&&r[0]+n===10)return'/';if(n===10)return'X';}if(j===2){if(n===10)return'X';if(r[0]===10&&r[1]!==10&&r[1]+n===10)return'/';}return String(n);}
function flatData(g){const flat=[],starts=[];g.frames.forEach(f=>{starts.push(flat.length);flat.push(...f.rolls)});return{flat,starts};}
export function scoreGame(g){const{flat,starts}=flatData(g),cum=Array(10).fill(null);let total=0;for(let i=0;i<10;i++){const r=g.frames[i].rolls,start=starts[i];let fs=null;if(i<9){if(r[0]===10){if(flat[start+1]!=null&&flat[start+2]!=null)fs=10+flat[start+1]+flat[start+2];}else if(r.length>=2){if(r[0]+r[1]===10){if(flat[start+2]!=null)fs=10+flat[start+2];}else fs=r[0]+r[1];}}else if(frameComplete(g.frames[9],9))fs=r.reduce((a,b)=>a+b,0);if(fs==null)break;total+=fs;cum[i]=total;}return{total,cumulative:cum,final:gameComplete(g)?total:null};}
export function wholeBowlingAverage(avg){if(avg===null||avg===undefined||avg===''||!Number.isFinite(Number(avg)))return null;return Math.floor(Number(avg));}
export function handicapPins(avg,pct=90,base=220){const whole=wholeBowlingAverage(avg);if(whole==null)return null;return Math.max(0,Math.floor((Number(base)-whole)*(Number(pct)/100)));}
export function runningLeagueAverage(sessions=[],rule={}){const ordered=[...sessions].filter(s=>String(s?.league||'').trim()).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.createdAt||'').localeCompare(b.createdAt||''));let pins=0,games=0;for(const s of ordered)for(const g of(s.games||[]))if(gameComplete(g)){pins+=scoreGame(g).final||0;games++;}const seed=ordered.find(s=>s.enteringAverage!=null&&String(s.enteringAverage).trim()!==''&&Number.isFinite(Number(s.enteringAverage))),seedAverage=seed?wholeBowlingAverage(seed.enteringAverage):null,seedGames=seed?Math.max(1,Number(seed.gameCount)||3):0,establishGames=rule?.mode==='establish'?Math.max(1,Number(rule.games)||1):0,established=!!establishGames&&games>=establishGames;let currentAverage=null;if(established&&games)currentAverage=Math.floor(pins/games);else if(!establishGames&&seedAverage!=null)currentAverage=(seedAverage*seedGames+pins)/(seedGames+games);else if(establishGames&&seedAverage!=null)currentAverage=seedAverage;const latest=[...ordered].reverse().find(s=>(s.games||[]).some(gameComplete)),latestScores=latest?(latest.games||[]).filter(gameComplete).map(g=>scoreGame(g).final):[],latestAverage=latestScores.length?latestScores.reduce((a,b)=>a+b,0)/latestScores.length:null;if(seedAverage==null&&currentAverage==null)return null;return{seedAverage,seedGames,pins,games,currentAverage,latestAverage,totalGames:establishGames?games:seedGames+games,averageMode:establishGames?'establish':'carry',establishGames,established};}
const xy={1:[2,0],2:[1.5,1],3:[2.5,1],4:[1,2],5:[2,2],6:[3,2],7:[.5,3],8:[1.5,3],9:[2.5,3],10:[3.5,3]};
export function isSplitLeave(pins=[]){const a=[...new Set(pins.map(Number))].filter(n=>n>=1&&n<=10);if(a.length<2||a.includes(1))return false;const near=(x,y)=>{const A=xy[x],B=xy[y],dx=A[0]-B[0],dy=A[1]-B[1];return Math.hypot(dx,dy)<=1.15};const seen=new Set([a[0]]),q=[a[0]];while(q.length){const x=q.shift();for(const y of a)if(!seen.has(y)&&near(x,y)){seen.add(y);q.push(y)}}return seen.size<a.length;}
export function leaveLabel(pins=[]){return pins?.length?[...pins].sort((a,b)=>a-b).join('-'):'—';}
const metaText=v=>String(v??'').trim().replace(/\s+/g,' ');
const metaKey=v=>metaText(v).toLocaleLowerCase();
function metaValue(s,g,kind){if(kind==='center')return metaText(s?.center);if(kind==='oil')return metaText(s?.oilPattern);if(kind==='lane')return metaText(g?.lane);if(kind==='ball')return metaText(g?.ballUsed??s?.ballUsed);return'';}
function hasTrackedFirstBallSetups(g){return(g?.frames||[]).slice(0,10).some(f=>!!f?.firstBallSetup);}
export function wholeGameBall(s,g){
 if(!gameComplete(g))return'';
 const frames=(g?.frames||[]).slice(0,10),tracked=hasTrackedFirstBallSetups(g);
 if(!tracked)return metaValue(s,g,'ball');
 if(frames.length<10||frames.some(f=>!f?.rolls?.length||!f?.firstBallSetup))return'';
 const balls=frames.map(f=>metaText(normalizeFirstBallSetup(f.firstBallSetup).ballUsed));
 if(balls.some(v=>!v))return'';
 return balls.every(v=>metaKey(v)===metaKey(balls[0]))?balls[0]:'';
}
export function firstBallFrameRows(sessions=[]){
 const rows=[];
 for(const s of sessions)for(const g of(s.games||[])){
  if(!gameComplete(g))continue;
  for(const [i,f] of(g.frames||[]).slice(0,10).entries()){
   if(!f?.rolls?.length||!f.firstBallSetup)continue;
   const setup=normalizeFirstBallSetup(f.firstBallSetup),leave=(f.leave||[]).map(Number).filter(n=>n>=1&&n<=10).sort((a,b)=>a-b),firstPins=Number(f.rolls[0]);
   rows.push({sessionId:s.id,gameId:g.id,frameNumber:i+1,ballUsed:setup.ballUsed,standBoard:setup.standBoard,targetBoard:setup.targetBoard,lane:metaValue(s,g,'lane'),actualLane:String(f.firstBallLane||''),center:metaValue(s,g,'center'),oil:metaValue(s,g,'oil'),firstPins,strike:firstPins===10,tenPinLeave:leave.length===1&&leave[0]===10,leave,spareOpportunity:firstPins!==10&&f.rolls.length>=2,spareMade:firstPins!==10&&f.rolls.length>=2&&firstPins+Number(f.rolls[1])===10});
  }
 }
 return rows;
}
export function filterFirstBallRows(rows=[],filters={}){
 return rows.filter(r=>!filters.center||metaKey(r.center)===metaKey(filters.center))
  .filter(r=>!filters.oil||metaKey(r.oil)===metaKey(filters.oil))
  .filter(r=>!filters.lane||metaKey(r.lane)===metaKey(filters.lane))
  .filter(r=>!filters.ball||metaKey(r.ballUsed)===metaKey(filters.ball));
}
function summarizeTrackedRows(rows=[]){
 const frames=rows.length,strikes=rows.filter(r=>r.strike).length,firstPins=rows.reduce((a,r)=>a+(Number.isFinite(r.firstPins)?r.firstPins:0),0),tenPinLeaves=rows.filter(r=>r.tenPinLeave).length,spareRows=rows.filter(r=>r.spareOpportunity),spareMade=spareRows.filter(r=>r.spareMade).length;
 return{frames,strikes,strikePct:frames?strikes/frames*100:null,avgFirstPins:frames?firstPins/frames:null,tenPinLeaves,spareOpps:spareRows.length,spareMade,sparePct:spareRows.length?spareMade/spareRows.length*100:null};
}
export function summarizeBallPerformance(sessions=[],filters={}){
 const context=filterSessionsByMeta(sessions,{center:filters.center||'',lane:filters.lane||'',oil:filters.oil||''}),by=new Map(),ensure=label=>{const key=metaKey(label);if(!key)return null;if(!by.has(key))by.set(key,{label,rows:[],scores:[],legacyGames:0,trackedFullGames:0});return by.get(key)};
 const rows=filterFirstBallRows(firstBallFrameRows(context),{ball:filters.ball||''});
 for(const r of rows){const item=ensure(r.ballUsed);if(item)item.rows.push(r)}
 for(const s of context)for(const g of(s.games||[])){if(!gameComplete(g))continue;const ball=wholeGameBall(s,g);if(!ball||filters.ball&&metaKey(ball)!==metaKey(filters.ball))continue;const item=ensure(ball);if(!item)continue;item.scores.push(scoreGame(g).final);hasTrackedFirstBallSetups(g)?item.trackedFullGames++:item.legacyGames++}
 return[...by.values()].map(item=>{const f=summarizeTrackedRows(item.rows),sum=item.scores.reduce((a,b)=>a+b,0);return{label:item.label,trackedFrames:f.frames,fullGames:item.scores.length,fullGameAverage:item.scores.length?sum/item.scores.length:null,highGame:item.scores.length?Math.max(...item.scores):null,legacyGames:item.legacyGames,trackedFullGames:item.trackedFullGames,strikes:f.strikes,strikePct:f.strikePct,avgFirstPins:f.avgFirstPins,tenPinLeaves:f.tenPinLeaves}}).sort((a,b)=>b.trackedFrames-a.trackedFrames||b.fullGames-a.fullGames||a.label.localeCompare(b.label));
}
export function summarizeLinePerformance(sessions=[],filters={}){
 const context=filterSessionsByMeta(sessions,{center:filters.center||'',lane:filters.lane||'',oil:filters.oil||''}),rows=filterFirstBallRows(firstBallFrameRows(context),{ball:filters.ball||''}),by=new Map();
 for(const r of rows){if(!r.ballUsed||r.standBoard==null&&r.targetBoard==null)continue;const key=[r.ballUsed,r.standBoard??'',r.targetBoard??'',r.lane,r.actualLane||'',r.center,r.oil].map(metaKey).join('|');if(!by.has(key))by.set(key,{label:r.ballUsed,standBoard:r.standBoard,targetBoard:r.targetBoard,lane:r.lane,actualLane:r.actualLane||'',center:r.center,oil:r.oil,rows:[]});by.get(key).rows.push(r)}
 return[...by.values()].map(item=>({...item,...summarizeTrackedRows(item.rows)})).sort((a,b)=>b.frames-a.frames||a.label.localeCompare(b.label)||(a.standBoard??0)-(b.standBoard??0)||(a.targetBoard??0)-(b.targetBoard??0));
}
export function filterSessionsByMeta(sessions=[],filters={}){
 return sessions.filter(s=>!filters.center||metaKey(metaValue(s,null,'center'))===metaKey(filters.center))
  .filter(s=>!filters.oil||metaKey(metaValue(s,null,'oil'))===metaKey(filters.oil))
  .map(s=>({...s,games:(s.games||[]).filter(g=>(!filters.lane||metaKey(metaValue(s,g,'lane'))===metaKey(filters.lane))&&(!filters.ball||metaKey(wholeGameBall(s,g))===metaKey(filters.ball)))})).filter(s=>s.games.length);
}
export function metadataValues(sessions=[],kind){
 const vals=new Map(),add=v=>{const x=metaText(v),k=metaKey(x);if(k)vals.set(k,x)};
 for(const s of sessions){
  if(kind==='center'||kind==='oil'){add(metaValue(s,null,kind));continue}
  for(const g of(s.games||[])){if(!gameComplete(g))continue;if(kind==='ball'&&hasTrackedFirstBallSetups(g)){for(const f of(g.frames||[]).slice(0,10))if(f?.firstBallSetup)add(normalizeFirstBallSetup(f.firstBallSetup).ballUsed)}else add(metaValue(s,g,kind))}
 }
 return[...vals.values()].sort((a,b)=>a.localeCompare(b));
}
export function summarizeBreakdown(sessions=[],kind){
 if(kind==='ball')return summarizeBallPerformance(sessions).filter(r=>r.fullGames>0).map(r=>({label:r.label,games:r.fullGames,average:r.fullGameAverage,highGame:r.highGame,strikePct:r.strikePct,sparePct:null}));
 return metadataValues(sessions,kind).map(label=>{const subset=(kind==='center'||kind==='oil')?sessions.filter(s=>metaKey(metaValue(s,null,kind))===metaKey(label)):sessions.map(s=>({...s,games:(s.games||[]).filter(g=>metaKey(metaValue(s,g,kind))===metaKey(label))})).filter(s=>s.games.length),st=summarizeSessions(subset);return{label,...st}}).filter(x=>x.games).sort((a,b)=>b.games-a.games||(b.average??0)-(a.average??0)||a.label.localeCompare(b.label));
}
export function summarizeSessions(sessions=[]){
 const scores=[],leaveStats={};
 let strikes=0,strikeOpps=0,spares=0,spareOpps=0,highSeries=null,splitOpps=0,splitMade=0,singleOpps=0,singleMade=0,tenOpps=0,tenMade=0;
 for(const s of sessions){
  let series=0,games=0;
  for(const g of(s.games||[])){
   if(!gameComplete(g))continue;
   const sc=scoreGame(g).final;scores.push(sc);series+=sc;games++;
   g.frames.slice(0,10).forEach(f=>{
    if(!f.rolls.length)return;
    strikeOpps++;
    if(f.rolls[0]===10){strikes++;return}
    if(f.rolls.length<2)return;
    spareOpps++;
    const made=f.rolls[0]+f.rolls[1]===10;
    if(made)spares++;
    const leave=(f.leave||[]).map(Number).sort((a,b)=>a-b);
    const split=!!(f.split||(leave.length&&isSplitLeave(leave)));
    if(split){splitOpps++;if(made)splitMade++}
    if(!leave.length)return;
    const key=leave.join('-'),row=leaveStats[key]||(leaveStats[key]={label:key,attempts:0,made:0,split,pins:leave});
    row.attempts++;if(made)row.made++;row.split=row.split||split;
    if(leave.length===1){singleOpps++;if(made)singleMade++;if(leave[0]===10){tenOpps++;if(made)tenMade++;}}
   });
  }
  if(games)highSeries=Math.max(highSeries??0,series);
 }
 const sum=scores.reduce((a,b)=>a+b,0),
  leaveDetails=Object.values(leaveStats).map(x=>({...x,pct:x.attempts?x.made/x.attempts*100:null})).sort((a,b)=>b.attempts-a.attempts||b.made-a.made||a.label.localeCompare(b.label)).slice(0,12),
  topLeaves=leaveDetails.map(x=>[x.label,x.attempts]);
 return{games:scores.length,average:scores.length?sum/scores.length:null,highGame:scores.length?Math.max(...scores):null,highSeries,strikePct:strikeOpps?strikes/strikeOpps*100:null,sparePct:spareOpps?spares/spareOpps*100:null,splitPct:splitOpps?splitMade/splitOpps*100:null,singlePinPct:singleOpps?singleMade/singleOpps*100:null,tenPinPct:tenOpps?tenMade/tenOpps*100:null,splitOpps,splitMade,singleOpps,singleMade,tenOpps,tenMade,topLeaves,leaveDetails};
}
