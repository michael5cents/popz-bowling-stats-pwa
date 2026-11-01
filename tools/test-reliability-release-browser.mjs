// Synthetic release regression: local server only, no production/Firebase/telemetry writes.
// Run with Node 22+ and PLAYWRIGHT_MODULE pointing to an installed Playwright index.mjs.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {emptyFrames,addRoll} from '../scoring.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve(import.meta.dirname,'..');
const oldCommit='56576182b190f6ea863c6c2d559af4a4d7ae2ea7';
const version=JSON.parse(readFileSync(resolve(root,'latest-version.json'),'utf8')).version;
const oldVersion=JSON.parse(execFileSync('git',['show',oldCommit+':latest-version.json'],{cwd:root,encoding:'utf8'})).version;
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
let phase='old',failShell=false;
const requests=[],oldFiles=new Map();
function file(rel){
 if(phase==='new')return readFileSync(resolve(root,rel));
 if(!oldFiles.has(rel))oldFiles.set(rel,execFileSync('git',['show',oldCommit+':'+rel],{cwd:root,maxBuffer:2000000}));
 return oldFiles.get(rel);
}
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://'+req.headers.host),path=url.pathname;
 requests.push({path,method:req.method});
 if(path==='/telemetry-dashboard'){res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'private, no-store'});res.end('<!doctype html><title>Admin fixture</title><h1>ADMIN FIXTURE</h1>');return;}
 if(path.startsWith('/api/')){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ok:true,status:'ok'}));return;}
 if(failShell&&(path==='/'||path==='/index.html')){res.writeHead(503,{'Content-Type':'text/html'});res.end('<h1>Temporary fixture outage</h1>');return;}
 try{
  const rel=path==='/'?'index.html':decodeURIComponent(path).slice(1);
  const target=resolve(root,rel);
  if(!target.startsWith(root+'/')||!existsSync(target)){res.writeHead(404).end();return;}
  // Explicit bundled precache is allowed, dynamic app-shell caching is exercised
  // with ordinary successful HTML and no-store admin/API responses above.
  res.writeHead(200,{'Content-Type':types[extname(rel)]||'application/octet-stream','Cache-Control':rel==='service-worker.js'||rel==='latest-version.json'?'no-store':'max-age=0'});
  res.end(file(rel));
 }catch{res.writeHead(404).end();}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1100,height:900},serviceWorkers:'allow',acceptDownloads:true});
const errors=[];let page;
const readState=page=>page.evaluate(()=>new Promise((ok,no)=>{
 const open=indexedDB.open('popz-bowling-public',1);
 open.onerror=()=>no(open.error);
 open.onsuccess=()=>{const db=open.result,read=db.transaction('state').objectStore('state').get('master');read.onsuccess=()=>{db.close();ok(read.result)};read.onerror=()=>{db.close();no(read.error)}};
}));
// App readiness is the release gate; optional SDK requests must not hold the load event hostage.
const loaded=async(page,want)=>page.waitForFunction(v=>document.getElementById('appVersion')?.textContent===v,want);
const roll=async pins=>{
 await page.locator('[data-pins="'+pins+'"]').click();
 await page.waitForFunction(()=>!document.querySelector('#scoringArea').classList.contains('hidden'));
};
try{
 await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(base+'/?qa=1',{waitUntil:'domcontentloaded'});await loaded(page,oldVersion);
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.reload({waitUntil:'domcontentloaded'});await loaded(page,oldVersion);
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 await page.locator('[data-nav="settings"]').click();
 await page.locator('#bowlerName').fill('QA Release A');await page.locator('#bowlerName').press('Tab');
 await page.locator('[data-nav="bowl"]').click();
 await page.locator('#seriesGameCount').fill('1');
 await page.locator('#seriesMode').selectOption('multi');
 await page.locator('[data-roster-name="1"]').fill('QA Release B');
 await page.locator('#startSeriesBtn').click();
 await page.waitForFunction(()=>!document.getElementById('scoringArea').classList.contains('hidden'));
 await roll(10);
 await page.waitForFunction(()=>document.getElementById('activeSeriesTitle').textContent.includes('QA Release B'));
 const oldState=await readState(page);
 assert.equal(oldState.sessions[0].games[0].frames[0].rolls[0],10);

 // A real worker update must preserve IndexedDB while replacing the old cache.
 phase='new';
 await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update()});
 await page.waitForFunction(v=>document.getElementById('updateLatestVersion')?.textContent===v,version,{timeout:30000});
 await page.close();
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(base+'/?qa=1',{waitUntil:'domcontentloaded'});await loaded(page,version);
 const updatedState=await readState(page);
 assert.deepEqual(updatedState.sessions,oldState.sessions);
 assert.deepEqual(updatedState.activeGroup,oldState.activeGroup);
 const cacheNames=await page.evaluate(()=>caches.keys());
 assert.ok(cacheNames.includes('popz-bowling-'+version));
 assert.ok(!cacheNames.includes('popz-bowling-'+oldVersion));

 // B's first-frame strike, then A's second-frame strike. Undo must target A.
 await roll(10);
 await page.waitForFunction(()=>document.getElementById('activeSeriesTitle').textContent.includes('QA Release A'));
 await roll(10);
 await page.waitForFunction(()=>document.getElementById('activeSeriesTitle').textContent.includes('QA Release B'));
 await page.locator('#undoRollBtn').click();
 await page.waitForFunction(()=>document.getElementById('activeSeriesTitle').textContent.includes('QA Release A'));
 let saved=await readState(page);
 assert.deepEqual(saved.sessions[0].games[0].frames[1].rolls,[]);
 assert.deepEqual(saved.sessions[1].games[0].frames[0].rolls,[10]);
 // Persisted action order must survive reload and undo B next.
 await page.reload({waitUntil:'domcontentloaded'});await loaded(page,version);
 await page.locator('#undoRollBtn').click();
 await page.waitForFunction(()=>document.getElementById('activeSeriesTitle').textContent.includes('QA Release B'));
 saved=await readState(page);
 assert.deepEqual(saved.sessions[0].games[0].frames[0].rolls,[10]);
 assert.deepEqual(saved.sessions[1].games[0].frames[0].rolls,[]);

 // A malformed import must not change saved state or prevent a later launch.
 await page.locator('[data-nav="settings"]').click();
 const beforeImport=await readState(page);
 await page.locator('#importFile').setInputFiles({name:'invalid-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({sessions:[{id:'bad',games:[{}]}]}))});
 await page.waitForFunction(()=>document.getElementById('toast').textContent.includes('Invalid bowling backup'));
 const afterReject=await readState(page);
 assert.deepEqual(afterReject,beforeImport);
 await page.reload({waitUntil:'domcontentloaded'});await loaded(page,version);

 // A valid legacy decimal-average backup still imports and keeps the active team.
 const legacyGame={id:'legacy-game',frames:emptyFrames()};
 for(let i=0;i<12;i++)addRoll(legacyGame,10);
 const legacy={sessions:[{id:'legacy-series',league:'QA Legacy',date:'2026-10-01',enteringAverage:180.8,games:[legacyGame]}]};
 await page.locator('[data-nav="settings"]').click();
 await page.locator('#importFile').setInputFiles({name:'legacy-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});
 await page.waitForFunction(()=>document.getElementById('toast').textContent.includes('Backup merged'));
 saved=await readState(page);
 assert.equal(saved.sessions.length,3);
 assert.equal(saved.sessions.find(s=>s.id==='legacy-series').enteringAverage,180.8);
 assert.deepEqual(saved.activeGroup,beforeImport.activeGroup);
 await page.evaluate(()=>fetch('/api/health').then(r=>r.json()));

 // Admin navigation and a failed root request must never replace the offline app.
 await page.goto(base+'/telemetry-dashboard',{waitUntil:'domcontentloaded'});assert.match(await page.textContent('body'),/ADMIN FIXTURE/);
 await context.setOffline(true);
 await page.goto(base+'/?qa=1',{waitUntil:'domcontentloaded'});await loaded(page,version);
 assert.equal((await readState(page)).sessions.length,3);
 await context.setOffline(false);failShell=true;
 const failed=await page.goto(base+'/?qa=1',{waitUntil:'domcontentloaded'});assert.equal(failed.status(),503);
 await context.setOffline(true);
 await page.goto(base+'/?qa=1',{waitUntil:'domcontentloaded'});await loaded(page,version);
 const cacheUrls=await page.evaluate(async()=>{const lists=await Promise.all((await caches.keys()).map(async key=>(await(await caches.open(key)).keys()).map(r=>r.url)));return lists.flat()});
 assert.ok(!cacheUrls.some(url=>url.includes('/telemetry-dashboard')||url.includes('/api/')));
 assert.ok(cacheUrls.some(url=>url.includes('/backup-validation.mjs')));
 assert.ok(cacheUrls.some(url=>url.includes('/roll-undo.mjs')));
 assert.deepEqual(errors,[]);
 assert.ok(!requests.some(r=>r.method==='POST'&&(r.path==='/api/telemetry'||r.path==='/api/runtime')));
 console.log('Release browser PASS: actual v39.011-to-current update preserves active team; correct Undo across rotation/reload; invalid import preserves storage and startup; valid legacy import; offline app survives admin visit and 503; API/admin cache isolation.');
}finally{await context.close();await browser.close();await new Promise(ok=>server.close(ok))}
