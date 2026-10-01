const SW_VERSION='public-v37.003';
const CACHE='popz-bowling-public-v37.003';
const ASSETS=['./','./index.html','./style.css?v=37.003','./app.js?v=37.003','./scoring.mjs?v=37.003','./history.mjs?v=37.003','./transfer.mjs?v=37.003','./update.mjs?v=37.003','./telemetry.mjs?v=37.003','./telemetry-client.mjs?v=37.003','./telemetry-milestones.mjs?v=37.003','./cloud-sync-core.mjs?v=37.003','./cloud-sync.mjs?v=37.003','./entitlements.mjs?v=37.003','./multiplayer.mjs?v=37.003','./runtime-monitor.js?v=37.003','./manifest.webmanifest','./icon-192.png?v=37.003','./icon-512.png?v=37.003','./apple-touch-icon.png?v=37.003'];

self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE).then(c=>c.addAll([...ASSETS,'./live-share.mjs?v=37.003','./live-share-client.mjs?v=37.003','./live-share-ui.mjs?v=37.003'])).then(()=>self.skipWaiting())
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
      const versioned=await caches.match(`${u.pathname}?v=37.003`);
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
