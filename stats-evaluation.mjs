const finite=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const fmt=v=>finite(v)==null?'—':String(Math.floor(Number(v)));
const pct=v=>finite(v)==null?'—':Number(v).toFixed(1)+'%';
const plural=(n,one,many=one+'s')=>`${n} ${n===1?one:many}`;
const LEVEL_RANK={None:0,Early:1,Building:2,Useful:3,Strong:4};

export function sampleLevel(games=0,dates=0){
 const g=Math.max(0,Number(games)||0),d=Math.max(0,Number(dates)||0);
 if(g>=36&&d>=8)return'Strong';
 if(g>=18&&d>=5)return'Useful';
 if(g>=6&&d>=2)return'Building';
 if(g>0)return'Early';
 return'None';
}

function evaluation(level,text){return{level:level||'None',text:String(text||'')}}

function weightedAverage(rows=[]){
 let pinsLike=0,games=0;
 for(const row of rows){
  const g=Number(row?.games)||0,a=finite(row?.average);
  if(g>0&&a!=null){pinsLike+=a*g;games+=g}
 }
 return games?pinsLike/games:null;
}

function recentForm(sessionRows=[]){
 const rows=[...sessionRows].filter(r=>(Number(r?.games)||0)>0).sort((a,b)=>
  String(b?.date||'').localeCompare(String(a?.date||''))||
  String(b?.createdAt||'').localeCompare(String(a?.createdAt||''))
 );
 const recent=rows.slice(0,3),prior=rows.slice(3,6),recentAvg=weightedAverage(recent),priorAvg=weightedAverage(prior);
 const recentGames=recent.reduce((n,r)=>n+(Number(r.games)||0),0);
 if(!recent.length)return{rows,recent,recentAvg:null,priorAvg:null,recentGames:0,delta:null};
 return{rows,recent,recentAvg,priorAvg,recentGames,delta:recent.length===3&&prior.length===3&&recentAvg!=null&&priorAvg!=null?recentAvg-priorAvg:null};
}

function topSupported(rows=[],minCount=1,countKey='games',metric='average'){
 return rows.filter(r=>(Number(r?.[countKey])||0)>=minCount&&finite(r?.[metric])!=null)
  .sort((a,b)=>Number(b[metric])-Number(a[metric])||(Number(b[countKey])||0)-(Number(a[countKey])||0))[0]||null;
}

function datesInRows(sessionRows=[]){
 return new Set(sessionRows.filter(r=>(Number(r?.games)||0)>0).map(r=>String(r?.date||'')).filter(Boolean)).size;
}

function trendSentence(form){
 if(form.recentAvg==null)return'';
 if(form.delta==null)return form.recent.length>=3?`The latest three series average ${Math.floor(form.recentAvg)} across ${plural(form.recentGames,'game')}.`:'Recent-form comparison is still early.';
 const abs=Math.abs(form.delta);
 if(abs<3)return`The latest three-series average is ${Math.floor(form.recentAvg)}, essentially steady versus the prior three (${form.delta>=0?'+':''}${form.delta.toFixed(1)} pins).`;
 return`The latest three-series average is ${Math.floor(form.recentAvg)}, ${abs.toFixed(1)} pins ${form.delta>0?'better':'lower'} than the prior three.`;
}

function prioritySentence(st={}){
 const tenOpps=Number(st.tenOpps)||0,singleOpps=Number(st.singleOpps)||0,games=Number(st.games)||0;
 const ten=finite(st.tenPinPct),single=finite(st.singlePinPct),spare=finite(st.sparePct),strike=finite(st.strikePct);
 if(tenOpps>=4&&ten!=null&&ten<65)return`The clearest current spare priority is the 10-pin: ${pct(ten)} on ${plural(tenOpps,'chance')}.`;
 if(singleOpps>=6&&single!=null&&single<75)return`The clearest current spare priority is single pins: ${pct(single)} on ${plural(singleOpps,'chance')}.`;
 if(games>=6&&spare!=null&&spare<55)return`Spare conversion (${pct(spare)}) is the clearest scoring opportunity in this sample.`;
 if(games>=6&&strike!=null&&strike<30)return`First-ball strike production (${pct(strike)}) is the clearest scoring opportunity in this sample.`;
 if(singleOpps>=6&&single!=null&&single>=80)return`Single-pin conversion is a current strength at ${pct(single)} over ${plural(singleOpps,'chance')}.`;
 return'The current sample does not show one dominant weakness strongly enough to call it proven.';
}

export function buildStatsEvaluations(data={}){
 const st=data.summary||{},sessionRows=data.sessionRows||[],games=Number(st.games)||0,dates=datesInRows(sessionRows),level=sampleLevel(games,dates),form=recentForm(sessionRows);
 const overallParts=[];
 if(!games)overallParts.push('No completed games match the current Stats filters yet.');
 else{
  overallParts.push(`${level} sample: ${plural(games,'game')} across ${plural(dates,'bowling date')}. Current average ${fmt(st.average)}, strike rate ${pct(st.strikePct)}, spare rate ${pct(st.sparePct)}.`);
  const trend=trendSentence(form);if(trend)overallParts.push(trend);
  overallParts.push(prioritySentence(st));
  const supported=(data.transitionGroups||[]).filter(g=>LEVEL_RANK[g.evidenceLevel]>=3).length;
  if((data.transitionGroups||[]).length&&!supported)overallParts.push('Lane-move evidence is still Early/Building, so no transition rule should be treated as proven yet.');
 }
 const leagueRows=data.leagueRows||[],leagueQualified=leagueRows.filter(r=>(Number(r.games)||0)>=6&&(Number(r.dates)||0)>=2);
 let leagueText='No league/category comparison is available yet.';
 if(leagueRows.length){
  if(!leagueQualified.length)leagueText=`League/category comparisons are still early. The dashboard has ${plural(leagueRows.reduce((n,r)=>n+(Number(r.games)||0),0),'game')}, but no category yet has at least 6 games across 2 dates.`;
  else{
   const best=[...leagueQualified].sort((a,b)=>(Number(b.average)||0)-(Number(a.average)||0))[0];
   const largest=[...leagueQualified].sort((a,b)=>(Number(b.games)||0)-(Number(a.games)||0))[0];
   leagueText=`Best supported league/category average: ${best.name} at ${fmt(best.average)} over ${plural(best.games,'game')} across ${plural(best.dates,'date')}.`;
   if(largest&&largest.name!==best.name)leagueText+=` Largest usable sample: ${largest.name} with ${plural(largest.games,'game')}.`;
   const early=leagueRows.length-leagueQualified.length;if(early)leagueText+=` ${plural(early,'category','categories')} remain too small to rank confidently.`;
  }
 }

 const la=data.leagueAverage||null;
 let leagueAverageText='Select one league to evaluate its running-average status.',leagueAverageLevel='None';
 if(la){
  leagueAverageLevel=sampleLevel(la.games,Math.max(1,la.dates||0));
  if(la.mode==='establish'&&!la.established){
   leagueAverageText=`${la.name} is still establishing: ${la.games}/${la.establishGames} actual games recorded. The book/starting average ${fmt(la.seedAverage)} remains in effect until the threshold is reached${finite(la.latestAverage)==null?'':`; latest night averaged ${fmt(la.latestAverage)}`}.`;
  }else if(la.mode==='establish'){
   const diff=finite(la.latestAverage)!=null&&finite(la.currentAverage)!=null?la.latestAverage-la.currentAverage:null;
   leagueAverageText=`${la.name} is established from ${plural(la.games,'actual game')}. Current next-week average is ${fmt(la.currentAverage)}${finite(la.latestAverage)==null?'':`; latest night was ${fmt(la.latestAverage)}${diff==null?'':` (${diff>=0?'+':''}${diff.toFixed(1)} vs current)`}`}.`;
  }else{
   leagueAverageText=`${la.name} is using the carry-forward rule. Book/starting average ${fmt(la.seedAverage)} plus ${plural(la.games,'recorded game')} currently produces a next-week average of ${fmt(la.currentAverage)}${finite(la.latestAverage)==null?'':`; latest night averaged ${fmt(la.latestAverage)}`}.`;
  }
 }

 const perf=[];
 const center=topSupported(data.centerRows||[],6,'games','average');if(center)perf.push(`Center: ${center.label} has the highest supported average at ${fmt(center.average)} over ${plural(center.games,'game')}.`);
 const lane=topSupported(data.laneRows||[],3,'games','average');if(lane)perf.push(`Lane(s): ${lane.label} leads supported lane samples at ${fmt(lane.average)} over ${plural(lane.games,'game')}.`);
 const oil=topSupported(data.oilRows||[],6,'games','average');if(oil)perf.push(`Oil: ${oil.label} has the highest supported average at ${fmt(oil.average)} over ${plural(oil.games,'game')}.`);
 const ball=topSupported(data.ballRows||[],20,'trackedFrames','strikePct');
 if(ball)perf.push(`Ball: ${ball.label} has the highest strike rate among balls with 20+ tracked frames: ${pct(ball.strikePct)} over ${plural(ball.trackedFrames,'frame')}.`);
 else if((data.ballRows||[]).length)perf.push('Ball tracking is still building; no ball has 20 tracked first-ball frames in this view yet.');
 const line=topSupported(data.lineRows||[],12,'frames','strikePct');
 if(line)perf.push(`Line: ${line.label} ${line.standBoard??'—'} → ${line.targetBoard??'—'} leads lines with 12+ frames at ${pct(line.strikePct)} strikes over ${plural(line.frames,'frame')}.`);
 else if((data.lineRows||[]).length)perf.push('Ball + line comparisons are still early; no line has 12 tracked frames in this view yet.');
 const performanceText=perf.length?perf.slice(0,5).join(' '):'Not enough recorded center/lane/ball/line/oil data exists in this view to evaluate performance differences yet.';

 const groups=data.transitionGroups||[],counts={Strong:0,Useful:0,Building:0,Early:0};
 for(const g of groups)if(counts[g.evidenceLevel]!=null)counts[g.evidenceLevel]++;
 let transitionText='No tracked setup changes are available in this Stats view yet.',transitionLevel='None';
 if(groups.length){
  const strongest=[...groups].sort((a,b)=>LEVEL_RANK[b.evidenceLevel]-LEVEL_RANK[a.evidenceLevel]||(Number(b.occurrences)||0)-(Number(a.occurrences)||0))[0];
  transitionLevel=strongest.evidenceLevel||'Early';
  const proven=groups.filter(g=>LEVEL_RANK[g.evidenceLevel]>=3),building=groups.filter(g=>g.evidenceLevel==='Building');
  if(proven.length){
   const candidate=[...proven].sort((a,b)=>(Number(b.strikeDelta)||-999)-(Number(a.strikeDelta)||-999))[0];
   const delta=finite(candidate.strikeDelta);
   transitionText=`${counts.Strong} Strong, ${counts.Useful} Useful, ${counts.Building} Building, ${counts.Early} Early patterns. Strongest supported current move: ${candidate.label}${delta==null?'':`, with strike rate ${delta>=0?'up':'down'} ${Math.abs(delta).toFixed(1)} points after the move`}.`;
  }else if(building.length){
   const candidate=[...building].sort((a,b)=>(Number(b.occurrences)||0)-(Number(a.occurrences)||0))[0],delta=finite(candidate.strikeDelta);
   transitionText=`Transition evidence is still building: ${counts.Building} Building and ${counts.Early} Early patterns; none are Useful/Strong yet. Best repeated candidate so far: ${candidate.label}${delta==null?'':` (${delta>=0?'+':''}${delta.toFixed(1)} strike-rate points)`}, but it is not proven.`;
  }else transitionText=`All ${groups.length} recorded transition ${groups.length===1?'pattern is':'patterns are'} still Early. Keep recording moves; there is not enough repeated evidence yet to call any adjustment reliable.`;
 }

 const leaves=st.leaveDetails||[],most=leaves[0]||null,leaveParts=[];
 if(most)leaveParts.push(`Most common tracked leave: ${most.label} with ${plural(most.attempts,'attempt')} and ${pct(most.pct)} conversion.`);
 if((Number(st.singleOpps)||0)>0)leaveParts.push(`Single pins: ${pct(st.singlePinPct)} on ${plural(st.singleOpps,'chance')}.`);
 if((Number(st.tenOpps)||0)>0)leaveParts.push(`10-pin: ${pct(st.tenPinPct)} on ${plural(st.tenOpps,'chance')}.`);
 if((Number(st.splitOpps)||0)>0)leaveParts.push(`Splits: ${pct(st.splitPct)} on ${plural(st.splitOpps,'chance')}.`);
 const leaveLevel=sampleLevel(Math.min(36,(Number(st.singleOpps)||0)+(Number(st.tenOpps)||0)+(Number(st.splitOpps)||0)),Math.min(8,dates));
 const leavesText=leaveParts.length?leaveParts.join(' '):'No exact first-ball leave data is available in this Stats view yet.';

 let recentText='No completed recent series match the current filters.',recentLevel='None';
 if(form.recent.length){
  recentLevel=sampleLevel(form.recentGames,Math.min(3,form.recent.length));
  recentText=`Latest ${form.recent.length} ${form.recent.length===1?'series averages':'series average'} ${form.recentAvg==null?'—':Math.floor(form.recentAvg)} over ${plural(form.recentGames,'game')}.`;
  if(form.delta!=null)recentText+=` That is ${Math.abs(form.delta).toFixed(1)} pins ${Math.abs(form.delta)<3?'roughly even with':form.delta>0?'above':'below'} the prior three-series average.`;
  else if(form.recent.length<3)recentText+=' More completed series are needed for a short-term trend.';
 }

 return{
  overall:evaluation(level,overallParts.join(' ')),
  leagueStats:evaluation(sampleLevel(leagueRows.reduce((n,r)=>n+(Number(r.games)||0),0),leagueRows.reduce((n,r)=>n+(Number(r.dates)||0),0)),leagueText),
  leagueAverage:evaluation(leagueAverageLevel,leagueAverageText),
  performance:evaluation(level,performanceText),
  transition:evaluation(transitionLevel,transitionText),
  leaves:evaluation(leaveLevel,leavesText),
  recent:evaluation(recentLevel,recentText)
 };
}
