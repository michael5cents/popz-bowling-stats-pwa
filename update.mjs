export function versionNeedsUpdate(current,latest){
  const c=String(current||'').trim(),l=String(latest||'').trim();
  return Boolean(c&&l&&c!==l);
}

export function isNewerRelease(candidate,current){
 const parse=v=>/^public-v\d+(?:\.\d+)*$/.test(String(v||''))?String(v).slice(8).split('.').map(Number):null;
 const a=parse(candidate),b=parse(current);
 if(!a||!b)return false;
 for(let i=0;i<Math.max(a.length,b.length);i++){
  if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0);
 }
 return false;
}
export function resolveUpdateNotice(current,latest,serviceWorkerSignal=''){
  const c=String(current||'').trim();
  const l=String(latest||'').trim();
  const s=String(serviceWorkerSignal||'').trim();
  if(c&&l&&/^public-v\d+(?:\.\d+)*$/.test(l)){
    if(versionNeedsUpdate(c,l))return{needed:true,version:l,source:'latest-version'};
    if(isNewerRelease(s,c))return{needed:true,version:s,source:'service-worker'};
    return{needed:false,version:l,source:'current'};
  }
  if(c&&isNewerRelease(s,c))
    return{needed:true,version:s,source:'service-worker'};
  return{needed:false,version:l||c,source:'current'};
}
