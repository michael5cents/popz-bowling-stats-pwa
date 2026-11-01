const SW_VERSION='public-v39.012';
const CACHE='popz-bowling-public-v39.012';
const ASSETS=['./','./index.html','./style.css?v=39.012','./entry.js?v=39.012','./app.js?v=39.012','./scoring.mjs?v=39.012','./history.mjs?v=39.012','./transfer.mjs?v=39.012','./backup-validation.mjs?v=39.012','./roll-undo.mjs?v=39.012','./update.mjs?v=39.012','./telemetry.mjs?v=39.012','./telemetry-client.mjs?v=39.012','./telemetry-milestones.mjs?v=39.012','./cloud-sync-core.mjs?v=39.012','./cloud-sync.mjs?v=39.012','./entitlements.mjs?v=39.012','./multiplayer.mjs?v=39.012','./layout-mode.mjs?v=39.012','./runtime-monitor.js?v=39.012','./manifest.webmanifest','./icon-192.png?v=39.012','./icon-512.png?v=39.012','./apple-touch-icon.png?v=39.012'];

const PRECACHE_ASSETS=[...ASSETS,'./live-share.mjs?v=39.012','./live-share-client.mjs?v=39.012','./live-share-ui.mjs?v=39.012'];
const ASSET_URLS=new Set(PRECACHE_ASSETS.map(asset=>new URL(asset,self.location.href).href));
const MODULE_VERSION=SW_VERSION.replace('public-v','');
const shellURL=url=>url.origin===self.location.origin&&(url.pathname==='/'||url.pathname==='/index.html');

function cacheableResponse(response,{precache=false}={}){
  if(!response||response.status!==200||!response.ok)return false;
  const control=response.headers.get('cache-control')||'';
  // The explicit bundled precache also works on no-store development servers.
  // Private responses are never stored; later network refreshes honor no-store.
  return !/\bprivate\b/i.test(control)&&(precache||!/\bno-store\b/i.test(control));
}
async function verifiedShell(response,options){
  if(!cacheableResponse(response,options)||!/^text\/html(?:\s*;|$)/i.test(response.headers.get('content-type')||''))return false;
  if(response.url&&!shellURL(new URL(response.url)))return false;
  const tags=(await response.clone().text()).match(/<meta\b[^>]*>/gi)||[];
  return tags.some(tag=>/\bname\s*=\s*["']popz-app-version["']/i.test(tag)&&(tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)||[])[1]===SW_VERSION);
}
function cachedAssetURL(url){
  if(ASSET_URLS.has(url.href))return url.href;
  if(!url.search&&url.pathname.endsWith('.mjs')){
    const versioned=new URL(url.href);versioned.search='?v='+MODULE_VERSION;
    if(ASSET_URLS.has(versioned.href))return versioned.href;
  }
  return null;
}
async function refreshCache(cache,key,response,isShell=false){
  try{
    if(isShell?await verifiedShell(response):cacheableResponse(response))await cache.put(key,response.clone());
  }catch{
    // A storage/quota failure must not discard a successful network response.
  }
}

self.addEventListener('install',e=>e.waitUntil((async()=>{
  // Validate the whole known bundle before replacing any cache entries.
  const bundle=await Promise.all(PRECACHE_ASSETS.map(async asset=>{
    const url=new URL(asset,self.location.href);
    const response=await fetch(new Request(url,{cache:'reload'}));
    if(!cacheableResponse(response,{precache:true})||(shellURL(url)&&!await verifiedShell(response,{precache:true})))throw Error('Invalid precache response: '+url.pathname);
    return[asset,response];
  }));
  const cache=await caches.open(CACHE);
  await Promise.all(bundle.map(([asset,response])=>cache.put(asset,response)));
  await self.skipWaiting();
})()));

self.addEventListener('activate',e=>e.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(x=>x!==CACHE).map(x=>caches.delete(x)));
  await self.clients.claim();
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of clients)client.postMessage({type:'POPZ_UPDATE_READY',version:SW_VERSION});
})()));

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  // APIs, admin pages, live spectators and external services always use the network.
  // Never read a historical cache entry for any of these routes.
  if(u.origin!==self.location.origin||u.pathname==='/api'||u.pathname.startsWith('/api/')||/^\/telemetry-dashboard(?:[/.]|$)/.test(u.pathname)||u.pathname==='/live'||u.pathname.startsWith('/live/')||u.pathname.endsWith('/latest-version.json')){
    e.respondWith(fetch(e.request));return;
  }
  if(e.request.mode==='navigate'){
    if(!shellURL(u)){e.respondWith(fetch(e.request));return}
    e.respondWith((async()=>{
      try{
        const response=await fetch(e.request);
        try{await refreshCache(await caches.open(CACHE),'./index.html',response,true)}catch{}
        return response;
      }catch{
        const cache=await caches.open(CACHE);
        return(await cache.match('./index.html'))||Response.error();
      }
    })());
    return;
  }
  const assetURL=cachedAssetURL(u);
  if(!assetURL){e.respondWith(fetch(e.request));return}
  e.respondWith((async()=>{
    const cache=await caches.open(CACHE),hit=await cache.match(assetURL);
    if(hit)return hit;
    try{
      const response=await fetch(e.request);
      await refreshCache(cache,assetURL,response,shellURL(u));
      return response;
    }catch{return Response.error()}
  })());
});
