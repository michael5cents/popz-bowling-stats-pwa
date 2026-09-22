const SW_VERSION='public-v28';
const CACHE='popz-bowling-public-v28';
const ASSETS=['./','./index.html','./style.css?v=28','./app.js?v=28','./scoring.mjs?v=28','./history.mjs?v=28','./transfer.mjs?v=28','./update.mjs?v=28','./telemetry.mjs?v=28','./telemetry-client.mjs?v=28','./cloud-sync-core.mjs?v=28','./cloud-sync.mjs?v=28','./entitlements.mjs?v=28','./manifest.webmanifest','./icon-192.png?v=28','./icon-512.png?v=28','./apple-touch-icon.png?v=28'];

self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',e=>e.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(x=>x!==CACHE).map(x=>caches.delete(x)));
  await self.clients.claim();
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of clients)client.postMessage({type:'POPZ_UPDATE_READY',version:SW_VERSION});
})()));

self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.pathname.endsWith('/latest-version.json')){e.respondWith(fetch(e.request));return}
  if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request).then(async hit=>{
    if(hit)return hit;
    if(u.origin===self.location.origin&&!u.search&&u.pathname.endsWith('.mjs')){
      const versioned=await caches.match(`${u.pathname}?v=28`);
      if(versioned)return versioned;
    }
    return fetch(e.request).then(r=>{
      const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;
    }).catch(()=>caches.match('./index.html'));
  }));
});
