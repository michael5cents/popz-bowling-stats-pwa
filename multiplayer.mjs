export const cleanBowlerName=value=>String(value??'').trim().replace(/\s+/g,' ');

export function normalizeRoster(rows=[]){
  const seen=new Set(),out=[];
  for(const row of rows){
    const name=cleanBowlerName(row?.name);
    if(!name)continue;
    const key=name.toLocaleLowerCase();
    if(seen.has(key))throw Error(`Duplicate bowler: ${name}`);
    seen.add(key);
    const raw=row?.enteringAverage;
    const enteringAverage=raw===''||raw==null?null:Number(raw);
    if(enteringAverage!=null&&(!Number.isFinite(enteringAverage)||enteringAverage<0||enteringAverage>300))throw Error(`Invalid entering average for ${name}`);
    out.push({name,enteringAverage});
  }
  return out;
}

export function activeSessionIds(state){
  const ids=new Set();
  if(state?.activeSessionId)ids.add(state.activeSessionId);
  for(const id of state?.activeGroup?.sessionIds||[])if(id)ids.add(id);
  return ids;
}

export function activeGroupSessions(state){
  const ids=state?.activeGroup?.sessionIds||[];
  if(!ids.length)return[];
  const byId=new Map((state?.sessions||[]).filter(s=>s?.id).map(s=>[s.id,s]));
  return ids.map(id=>byId.get(id)).filter(Boolean);
}

export function nextIncompleteGroupIndex(state,currentIndex,isComplete){
  const sessions=activeGroupSessions(state);
  if(!sessions.length)return-1;
  const start=Number.isInteger(currentIndex)?currentIndex:0;
  for(let step=1;step<=sessions.length;step++){
    const i=(start+step)%sessions.length;
    if(!isComplete(sessions[i]))return i;
  }
  return-1;
}

export function groupCurrentGamesComplete(state,isComplete){
  const sessions=activeGroupSessions(state);
  return sessions.length>1&&sessions.every(isComplete);
}
