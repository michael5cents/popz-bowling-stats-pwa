const SW_VERSION='public-v32';
const CACHE='popz-bowling-public-v32';
const ASSETS=['./','./index.html','./style.css?v=32','./app.js?v=32','./scoring.mjs?v=32','./history.mjs?v=32','./transfer.mjs?v=32','./update.mjs?v=32','./telemetry.mjs?v=32','./telemetry-client.mjs?v=32','./cloud-sync-core.mjs?v=32','./cloud-sync.mjs?v=32','./entitlements.mjs?v=32','./multiplayer.mjs?v=32','./manifest.webmanifest','./icon-192.png?v=32','./icon-512.png?v=32','./apple-touch-icon.png?v=32'];

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
      const versioned=await caches.match(`${u.pathname}?v=32`);
      if(versioned)return versioned;
    }
    return fetch(e.request).then(r=>{
      const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;
    }).catch(()=>caches.match('./index.html'));
  }));
});
