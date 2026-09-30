const SW_VERSION='public-v35';
const CACHE='popz-bowling-public-v35';
const ASSETS=['./','./index.html','./style.css?v=35','./app.js?v=35','./scoring.mjs?v=35','./history.mjs?v=35','./transfer.mjs?v=35','./update.mjs?v=35','./telemetry.mjs?v=35','./telemetry-client.mjs?v=35','./telemetry-milestones.mjs?v=35','./cloud-sync-core.mjs?v=35','./cloud-sync.mjs?v=35','./entitlements.mjs?v=35','./multiplayer.mjs?v=35','./runtime-monitor.js?v=35','./manifest.webmanifest','./icon-192.png?v=35','./icon-512.png?v=35','./apple-touch-icon.png?v=35'];

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
      const versioned=await caches.match(`${u.pathname}?v=35`);
      if(versioned)return versioned;
    }
    return fetch(e.request).then(r=>{
      const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;
    }).catch(()=>caches.match('./index.html'));
  }));
});
