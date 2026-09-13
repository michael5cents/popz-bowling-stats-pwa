const clean=value=>String(value??'').trim();
const norm=value=>clean(value).toLocaleLowerCase();

export function groupHistorySessions(sessions=[]){
  const groups=new Map();
  for(const session of sessions){
    const name=clean(session?.league)||'Practice';
    const key=norm(name);
    if(!groups.has(key))groups.set(key,{name,sessions:[]});
    groups.get(key).sessions.push(session);
  }
  return [...groups.values()]
    .sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:'base'}))
    .map(group=>{
      const dates=new Map();
      for(const session of group.sessions){
        const date=clean(session?.date)||'Unknown date';
        if(!dates.has(date))dates.set(date,[]);
        dates.get(date).push(session);
      }
      const orderedDates=[...dates.entries()]
        .sort(([a],[b])=>a==='Unknown date'?1:b==='Unknown date'?-1:b.localeCompare(a))
        .map(([date,items])=>({
          date,
          sessions:[...items].sort((a,b)=>String(b?.createdAt||b?.updatedAt||'').localeCompare(String(a?.createdAt||a?.updatedAt||'')))
        }));
      return {name:group.name,sessionCount:group.sessions.length,dates:orderedDates};
    });
}
