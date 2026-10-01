export const LAYOUT_MODES=Object.freeze({AUTOMATIC:'automatic',COMPACT_PHONE:'compact-phone',FULL:'full'});
export const PHONE_SHORT_SIDE_MAX=500;
export const LAYOUT_STORAGE_KEY='popz-bowling-layout-mode';

export function normalizeLayoutMode(value){
  return Object.values(LAYOUT_MODES).includes(value)?value:LAYOUT_MODES.AUTOMATIC;
}

export function isStandaloneEnvironment(env=globalThis){
  try{
    return !!env.matchMedia?.('(display-mode: standalone)')?.matches||env.navigator?.standalone===true;
  }catch{return env.navigator?.standalone===true}
}

export function shortScreenSide(env=globalThis){
  const width=Number(env.screen?.width),height=Number(env.screen?.height);
  if(Number.isFinite(width)&&width>0&&Number.isFinite(height)&&height>0)return Math.min(width,height);
  const innerWidth=Number(env.innerWidth),innerHeight=Number(env.innerHeight);
  if(Number.isFinite(innerWidth)&&innerWidth>0&&Number.isFinite(innerHeight)&&innerHeight>0)return Math.min(innerWidth,innerHeight);
  return Infinity;
}

export function resolveLayoutMode(preference=LAYOUT_MODES.AUTOMATIC,env=globalThis){
  const selected=normalizeLayoutMode(preference),installed=isStandaloneEnvironment(env),shortSide=shortScreenSide(env);
  const compact=selected===LAYOUT_MODES.COMPACT_PHONE||(selected===LAYOUT_MODES.AUTOMATIC&&installed&&shortSide<=PHONE_SHORT_SIDE_MAX);
  return{preference:selected,mode:compact?LAYOUT_MODES.COMPACT_PHONE:LAYOUT_MODES.FULL,compact,installed,shortSide};
}

export function readLayoutMode(storage=globalThis.localStorage){
  try{return normalizeLayoutMode(storage?.getItem?.(LAYOUT_STORAGE_KEY))}catch{return LAYOUT_MODES.AUTOMATIC}
}

export function writeLayoutMode(value,storage=globalThis.localStorage){
  const normalized=normalizeLayoutMode(value);
  try{storage?.setItem?.(LAYOUT_STORAGE_KEY,normalized)}catch{}
  return normalized;
}

export function layoutStatus(result){
  if(result.preference===LAYOUT_MODES.COMPACT_PHONE)return'Compact Phone is forced on this device.';
  if(result.preference===LAYOUT_MODES.FULL)return'Full Layout is forced on this device.';
  const size=Number.isFinite(result.shortSide)?` • ${Math.round(result.shortSide)}px short side`:'';
  if(result.compact)return`Automatic → Compact Phone (installed PWA${size})`;
  if(!result.installed)return'Automatic → Full Layout (not running as an installed PWA)';
  return`Automatic → Full Layout (tablet / larger screen${size})`;
}
