const SW_VERSION='public-v34';
const CACHE='popz-bowling-public-v34';
const ASSETS=['./','./index.html','./style.css?v=34','./app.js?v=34','./scoring.mjs?v=34','./history.mjs?v=34','./transfer.mjs?v=34','./update.mjs?v=34','./telemetry.mjs?v=34','./telemetry-client.mjs?v=34','./telemetry-milestones.mjs?v=34','./cloud-sync-core.mjs?v=34','./cloud-sync.mjs?v=34','./entitlements.mjs?v=34','./multiplayer.mjs?v=34','./manifest.webmanifest','./icon-192.png?v=34','./icon-512.png?v=34','./apple-touch-icon.png?v=34'];

self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE).then(c=>c.addAll([...ASSETS,'./live-share.mjs','./live-share-client.mjs','./live-share-ui.mjs','./live-share.css'])).then(()=>self.skipWaiting())
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
  // Never store spectator snapshots or turn a network failure into the scoring app shell.
  if(u.origin===self.location.origin&&(u.pathname.startsWith('/api/live/')||u.pathname.startsWith('/live/'))){e.respondWith(fetch(e.request));return}
  if(u.pathname.endsWith('/latest-version.json')){e.respondWith(fetch(e.request));return}
  if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request).then(async hit=>{
    if(hit)return hit;
    if(u.origin===self.location.origin&&!u.search&&u.pathname.endsWith('.mjs')){
      const versioned=await caches.match(`${u.pathname}?v=34`);
      if(versioned)return versioned;
    }
    return fetch(e.request).then(r=>{
      const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;
    }).catch(()=>caches.match('./index.html'));
  }));
});
