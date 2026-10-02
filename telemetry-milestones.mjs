import{gameComplete}from'./scoring.mjs';

const iso=value=>{
 const t=Date.parse(String(value||''));
 return Number.isFinite(t)?new Date(t).toISOString():null;
};
const firstTime=(...values)=>values.map(iso).find(Boolean)||new Date().toISOString();
const minTime=values=>{
 const xs=values.map(iso).filter(Boolean).sort();
 return xs[0]||null;
};
const maxTime=values=>{
 const xs=values.map(iso).filter(Boolean).sort();
 return xs[xs.length-1]||null;
};
const tracked=(s,deviceId)=>s?._telemetry?.version===2&&s._telemetry?.eligible!==false&&s._telemetry?.originDeviceId===deviceId;
const hasRoll=s=>(s?.games||[]).some(g=>(g.frames||[]).some(f=>(f.rolls||[]).length));
const firstRollAt=s=>firstTime(
 s?._telemetry?.firstRollAt,
 minTime((s?.games||[]).filter(g=>(g.frames||[]).some(f=>(f.rolls||[]).length)).map(g=>g.updatedAt||g.createdAt)),
 s?.updatedAt,s?.createdAt
);
const gameDoneAt=g=>firstTime(g?._telemetryCompletedAt,g?.updatedAt,g?.createdAt);
const event=(id,name,occurredAt)=>({id,event:name,occurredAt:firstTime(occurredAt)});
function singleMilestones(s){
 const out=[event(`milestone:series:${s.id}:series_started`,'series_started',s._telemetry?.startedAt||s.createdAt)];
 if(hasRoll(s))out.push(event(`milestone:series:${s.id}:first_roll_recorded`,'first_roll_recorded',firstRollAt(s)));
 for(const g of(s.games||[]))if(gameComplete(g))out.push(event(`milestone:game:${g.id}:game_completed`,'game_completed',gameDoneAt(g)));
 if(s.finishedAt&&(s.games||[]).some(gameComplete))out.push(event(`milestone:series:${s.id}:series_completed`,'series_completed',s.finishedAt));
 return out;
}
function groupMilestones(id,rows){
 const out=[event(`milestone:group:${id}:series_started`,'series_started',minTime(rows.map(s=>s._telemetry?.startedAt||s.createdAt)))];
 if(rows.some(hasRoll))out.push(event(`milestone:group:${id}:first_roll_recorded`,'first_roll_recorded',minTime(rows.filter(hasRoll).map(firstRollAt))));
 const games=Math.max(0,...rows.map(s=>(s.games||[]).length));let completedGames=0;
 for(let i=0;i<games;i++){
  const set=rows.map(s=>s.games?.[i]);
  if(set.every(g=>g&&gameComplete(g))){completedGames++;out.push(event(`milestone:group:${id}:game:${i+1}:game_completed`,'game_completed',maxTime(set.map(gameDoneAt))))}
 }
 if(completedGames&&rows.length&&rows.every(s=>s.finishedAt))out.push(event(`milestone:group:${id}:series_completed`,'series_completed',maxTime(rows.map(s=>s.finishedAt))));
 return out;
}
export function buildTelemetryMilestones(state={}){
 const sessions=(state.sessions||[]).filter(s=>tracked(s,state.deviceId)),groups=new Map(),singles=[];
 for(const s of sessions){
  if(s.groupSessionId){if(!groups.has(s.groupSessionId))groups.set(s.groupSessionId,[]);groups.get(s.groupSessionId).push(s)}
  else singles.push(s);
 }
 const out=singles.flatMap(singleMilestones);
 for(const[id,rows]of groups)out.push(...groupMilestones(id,rows));
 return out.sort((a,b)=>Date.parse(a.occurredAt)-Date.parse(b.occurredAt)||a.id.localeCompare(b.id));
}
