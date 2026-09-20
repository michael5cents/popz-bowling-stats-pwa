import{mergeBowlingStates}from'./transfer.mjs';

const stamp=value=>{
  const t=Date.parse(value||'');
  return Number.isFinite(t)?t:0;
};

export function mergeCloudBowlingState(local,remote,mergedAt=new Date().toISOString()){
  const merged=mergeBowlingStates(local,remote,mergedAt);
  const localSettingsAt=stamp(local?.settingsUpdatedAt);
  const remoteSettingsAt=stamp(remote?.settingsUpdatedAt);
  const localRules=local?.settings?.leagueAverageRules||{};
  const hasMeaningfulLocalSettings=!!String(local?.settings?.bowlerName||'').trim()||Object.keys(localRules).length>0;
  if(remoteSettingsAt>0&&(!hasMeaningfulLocalSettings||remoteSettingsAt>localSettingsAt)){
    merged.state.settings={...(local.settings||{}),...(remote.settings||{})};
    merged.state.settings.leagueAverageRules={
      ...(local.settings?.leagueAverageRules||{}),
      ...(remote.settings?.leagueAverageRules||{})
    };
    merged.state.settingsUpdatedAt=remote.settingsUpdatedAt;
  }
  return merged;
}

export function stateForCloud(state){
  const active=state?.activeSessionId||null;
  const settings={
    bowlerName:state?.settings?.bowlerName||'',
    leagueAverageRules:state?.settings?.leagueAverageRules||{}
  };
  return{
    settings,
    settingsUpdatedAt:state?.settingsUpdatedAt||state?.updatedAt||null,
    sessions:(state?.sessions||[]).filter(s=>s?.id&&s.id!==active),
    deletedSessions:(state?.deletedSessions||[]).filter(x=>x?.id),
    updatedAt:state?.updatedAt||null
  };
}

export function cloudSnapshotToState(profile={},sessions=[],deletedSessions=[]){
  return{
    version:2,
    deviceId:'cloud',
    updatedAt:profile.updatedAt||null,
    settingsUpdatedAt:profile.settingsUpdatedAt||profile.updatedAt||null,
    settings:profile.settings||{},
    activeSessionId:null,
    sessions:sessions.filter(Boolean),
    deletedSessions:deletedSessions.filter(Boolean),
    lastBackupAt:null,
    storagePersistent:null
  };
}

export function cloudDocForSession(session){
  return{data:session,updatedAt:session?.updatedAt||session?.finishedAt||session?.createdAt||null};
}
