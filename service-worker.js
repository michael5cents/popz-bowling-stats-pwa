const SW_VERSION='public-v36';
const CACHE='popz-bowling-public-v36';
const ASSETS=['./','./index.html','./style.css?v=36','./app.js?v=36','./scoring.mjs?v=36','./history.mjs?v=36','./transfer.mjs?v=36','./update.mjs?v=36','./telemetry.mjs?v=36','./telemetry-client.mjs?v=36','./telemetry-milestones.mjs?v=36','./cloud-sync-core.mjs?v=36','./cloud-sync.mjs?v=36','./entitlements.mjs?v=36','./multiplayer.mjs?v=36','./runtime-monitor.js?v=36','./manifest.webmanifest','./icon-192.png?v=36','./icon-512.png?v=36','./apple-touch-icon.png?v=36'];

self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE).then(c=>c.addAll([...ASSETS,'./live-share.mjs?v=36','./live-share-client.mjs?v=36','./live-share-ui.mjs?v=36'])).then(()=>self.skipWaiting())
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
      const versioned=await caches.match(`${u.pathname}?v=36`);
      if(versioned)return versioned;
    }
    return fetch(e.request).then(r=>{
      const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;
    }).catch(async()=>{
      if(e.request.mode==='navigate')return (await caches.match('./index.html'))||Response.error();
      return Response.error();
    });
  }));
});
