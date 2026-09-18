const CACHE='popz-bowling-public-v21';
const ASSETS=['./','./index.html','./style.css?v=21','./app.js?v=21','./scoring.mjs?v=21','./history.mjs?v=21','./transfer.mjs?v=21','./update.mjs?v=21','./manifest.webmanifest','./icon-192.png?v=21','./icon-512.png?v=21','./apple-touch-icon.png?v=21'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.pathname.endsWith('/latest-version.json')){e.respondWith(fetch(e.request));return}if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match('./index.html'))))});
