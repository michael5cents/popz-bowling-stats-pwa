export function versionNeedsUpdate(current,latest){
  const c=String(current||'').trim(),l=String(latest||'').trim();
  return Boolean(c&&l&&c!==l);
}

export function resolveUpdateNotice(current,latest,serviceWorkerSignal=''){
  const c=String(current||'').trim();
  const l=String(latest||'').trim();
  const s=String(serviceWorkerSignal||'').trim();
  if(c&&s&&s!==c)return{needed:true,version:s,source:'service-worker'};
  if(versionNeedsUpdate(c,l))return{needed:true,version:l,source:'latest-version'};
  return{needed:false,version:l||c,source:'current'};
}
