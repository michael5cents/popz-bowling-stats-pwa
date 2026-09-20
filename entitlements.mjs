export const PRO_FEATURES=Object.freeze({
  GOOGLE_SYNC:'google_sync',
  ADVANCED_SHOT_TRACKING:'advanced_shot_tracking',
  ADVANCED_LINE_ANALYTICS:'advanced_line_analytics',
  CLOUD_BACKUP:'cloud_backup'
});

export const PRO_PREVIEW_ENABLED=true;

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
  if(!e.expiresAt)return true;
  const end=Date.parse(e.expiresAt);
  return Number.isFinite(end)&&end>now;
}

export function effectiveAccess(raw={},options={}){
  const preview=options.preview??PRO_PREVIEW_ENABLED;
  if(entitlementIsActive(raw,options.now)){
    return{tier:'pro',label:'Popz Bowling Pro',pro:true,preview:false};
  }
  if(preview){
    return{tier:'pro-preview',label:'Pro Preview',pro:true,preview:true};
  }
  return{tier:'free',label:'Popz Bowling Free',pro:false,preview:false};
}

export function canUseFeature(feature,raw={},options={}){
  const access=effectiveAccess(raw,options);
  if(!Object.values(PRO_FEATURES).includes(feature))return true;
  return access.pro;
}
