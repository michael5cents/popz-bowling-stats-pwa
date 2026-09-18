const stamp=value=>{
  const t=Date.parse(value||'');
  return Number.isFinite(t)?t:0;
};

const sessionStamp=session=>Math.max(
  stamp(session?.updatedAt),
  stamp(session?.finishedAt),
  stamp(session?.createdAt)
);

export function mergeBowlingStates(current,incoming,mergedAt=new Date().toISOString()){
  if(!current||!Array.isArray(current.sessions))throw Error('Current bowling data is invalid');
  if(!incoming||!Array.isArray(incoming.sessions))throw Error('Invalid bowling backup');

  const localActiveId=current.activeSessionId||null;
  const deleted=new Map();
  for(const item of [...(current.deletedSessions||[]),...(incoming.deletedSessions||[])]){
    if(!item?.id)continue;
    const old=deleted.get(item.id);
    if(!old||stamp(item.deletedAt)>=stamp(old.deletedAt))deleted.set(item.id,item);
  }

  if(localActiveId)deleted.delete(localActiveId);

  const mergedSessions=[...current.sessions];
  const byId=new Map();
  mergedSessions.forEach((session,index)=>{if(session?.id)byId.set(session.id,index)});

  let added=0,updated=0,kept=0,deletedCount=0;
  for(const remote of incoming.sessions){
    if(!remote||!remote.id){kept++;continue}
    const tomb=deleted.get(remote.id);
    if(tomb&&stamp(tomb.deletedAt)>=sessionStamp(remote)){deletedCount++;continue}
    const index=byId.get(remote.id);
    if(index==null){
      byId.set(remote.id,mergedSessions.length);
      mergedSessions.push(remote);
      added++;
      continue;
    }
    const local=mergedSessions[index];
    if(remote.id===localActiveId){kept++;continue}
    if(sessionStamp(remote)>sessionStamp(local)){
      mergedSessions[index]=remote;
      updated++;
    }else kept++;
  }
  const survivingSessions=mergedSessions.filter(session=>{
    if(!session?.id||session.id===localActiveId)return true;
    const tomb=deleted.get(session.id);
    if(!tomb)return true;
    const remove=stamp(tomb.deletedAt)>=sessionStamp(session);
    if(remove)deletedCount++;
    return !remove;
  });

  const localSettings=current.settings||{};
  const remoteSettings=incoming.settings||{};
  const settings={...remoteSettings,...localSettings};
  settings.leagueAverageRules={...(remoteSettings.leagueAverageRules||{}),...(localSettings.leagueAverageRules||{})};
  if(!String(localSettings.bowlerName||'').trim()&&String(remoteSettings.bowlerName||'').trim())settings.bowlerName=remoteSettings.bowlerName;

  return {
    state:{
      ...incoming,
      ...current,
      version:Math.max(Number(current.version)||0,Number(incoming.version)||0,2),
      deviceId:current.deviceId,
      settings,
      settingsUpdatedAt:current.settingsUpdatedAt||incoming.settingsUpdatedAt||mergedAt,
      storagePersistent:current.storagePersistent??null,
      activeSessionId:localActiveId,
      sessions:survivingSessions,
      deletedSessions:[...deleted.values()],
      lastBackupAt:(()=>{const values=[current.lastBackupAt,incoming.lastBackupAt].filter(Boolean).sort();return values.length?values[values.length-1]:null})(),
      updatedAt:mergedAt
    },
    summary:{added,updated,kept,deleted:deletedCount,total:survivingSessions.length}
  };
}
