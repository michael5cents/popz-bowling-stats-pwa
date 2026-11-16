import{localTrialEntitlement,activeTrialDays}from'./trial-policy.mjs';
export const PRO_FEATURES=Object.freeze({
  GOOGLE_SYNC:'google_sync',
  ADVANCED_SHOT_TRACKING:'advanced_shot_tracking',
  MULTI_PLAYER_SCORING:'multi_player_scoring',
  LIVE_SCORE_SHARING:'live_score_sharing',
  ADVANCED_LINE_ANALYTICS:'advanced_line_analytics',
  CLOUD_BACKUP:'cloud_backup'
});

export const PRO_PREVIEW_ENABLED=false;

const ACTIVE_STATUSES=new Set(['active','trial','lifetime','complimentary','founder']);

export function normalizeEntitlement(raw={}){
  const plan=raw?.plan==='pro'?'pro':'free';
  const status=String(raw?.status||'inactive').toLowerCase();
  const source=String(raw?.source||'none').toLowerCase();
  const expiresAt=raw?.expiresAt||null;
  return{plan,status,source,expiresAt,updatedAt:raw?.updatedAt||null};
}

export function entitlementIsActive(raw={},now=Date.now()){
  const e=normalizeEntitlement(raw);
  if(e.plan!=='pro'||!ACTIVE_STATUSES.has(e.status))return false;
  if(['lifetime','complimentary','founder'].includes(e.status))return true;
  // Trial grants without a valid expiration must NEVER become indefinite.
  if(!e.expiresAt)return e.status!=='trial';
  const end=Date.parse(e.expiresAt);
  return Number.isFinite(end)&&end>now;
}

export function effectiveAccess(raw={},options={}){
  const preview=options.preview??PRO_PREVIEW_ENABLED;
  const now=options.now??Date.now();
  if(entitlementIsActive(raw,now)){
    const status=normalizeEntitlement(raw).status;
    const label=status==='founder'?'Founder Pro - Lifetime':
      status==='complimentary'?'Complimentary Pro - Lifetime':
      status==='lifetime'?'Lifetime Pro':
      status==='trial'?('Pro Trial - '+activeTrialDays(raw.expiresAt,now)+' days left'):'Popz Bowling Pro';
    return{tier:status==='trial'?'trial':'pro',label,pro:true,preview:false};
  }
  if(preview){
    return{tier:'pro-preview',label:'Pro Preview',pro:true,preview:true};
  }
  // Device-local preview is only available before sign-in and is anchored to
  // the first installed-app launch. Once signed in, server entitlement wins.
  if(options.signedOut===true){
    const local=localTrialEntitlement(options.localTrialStartedAt,
      options.localTrialLastSeenAt,now);
    if(local&&local.daysRemaining>0){
      return{tier:'trial',label:'Pro Trial - '+local.daysRemaining+' days left',
        pro:true,preview:false};
    }
  }
  return{tier:'free',label:'Popz Bowling Free',pro:false,preview:false};
}

export function canUseFeature(feature,raw={},options={}){
  const access=effectiveAccess(raw,options);
  if(!Object.values(PRO_FEATURES).includes(feature))return true;
  return access.pro;
}
