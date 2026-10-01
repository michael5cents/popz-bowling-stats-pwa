// Isolated synthetic data only. Requires Node 24+ and PLAYWRIGHT_MODULE pointing to playwright/index.mjs.
// Does not contact production, telemetry, Firebase, or the private Bowling relay.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {handleLiveRequest} from '../live-share-server.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve(import.meta.dirname,'..');
const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(resolve(root,'live-migrations/0001_live_shares.sql'),'utf8'));
const db={prepare(query){const stmt=sql.prepare(query);return {bind(...args){return {first:async()=>stmt.get(...args)||null,run:async()=>stmt.run(...args)};}};}};
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
const requests=[],errors=[];
const server=createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://'+req.headers.host);requests.push(url.pathname);
    if(url.pathname.startsWith('/api/live/')) {
      const chunks=[];for await(const chunk of req)chunks.push(chunk);
      const request=new Request(url,{method:req.method,headers:req.headers,body:['POST','PUT'].includes(req.method)?Buffer.concat(chunks):undefined});
      const response=await handleLiveRequest({request,params:{token:url.pathname.split('/').at(-1)},env:{LIVE_SHARE_DB:db,LIVE_SHARE_PREVIEW:'true'}});
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
    }
    const path=resolve(root,'.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));
    if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
    res.writeHead(200,{'Content-Type':types[extname(path)]||'text/plain','Cache-Control':'no-store'});res.end(readFileSync(path));
  }catch{if(!res.headersSent)res.writeHead(404);res.end();}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
try {
  const scorer=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow',acceptDownloads:true});
  const page=await scorer.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await scorer.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  await page.goto(base+'/?qa=1');
  await page.waitForFunction(()=>document.querySelector('#lastSyncText')?.textContent.includes('stored on this device only'));assert.equal((await page.locator('#dashboardProtectionBtn').textContent()).trim(),'Protect My Data');assert.match(await page.locator('#lastSyncText').textContent(),/stored on this device only/);await page.locator('#dashboardProtectionBtn').click();await page.locator('#settingsView.active').waitFor();await page.locator('#googleSyncSetting').waitFor();
  const navVisible=async()=>{const b=await page.locator('.bottom-nav').boundingBox();return b&&b.y>=0&&b.y+b.height<=844};assert.ok(await navVisible(),'bottom navigation must remain visible at Settings top');const beforeWindowTop=await page.evaluate(()=>scrollY);const scrollState=await page.evaluate(()=>{const m=document.querySelector('main');m.scrollTop=m.scrollHeight;return{mainTop:m.scrollTop,windowTop:scrollY}});assert.ok(scrollState.mainTop>0,'Settings content must scroll inside main');assert.equal(scrollState.windowTop,beforeWindowTop,'window position must not change while Settings content scrolls');assert.ok(await navVisible(),'bottom navigation must remain visible at Settings bottom');
  await page.locator('#bowlerName').scrollIntoViewIfNeeded();await page.locator('#bowlerName').fill('QA Bowler');await page.locator('#bowlerName').press('Tab');
  await page.locator('[data-nav="bowl"]').click();await page.locator('#seriesGameCount').fill('1');assert.ok(await page.locator('#liveSharePanel').evaluate(e=>e.classList.contains('hidden')),'live-share prompt must stay hidden before Start Series');
  await page.locator('#startSeriesBtn').click();await page.waitForFunction(()=>document.querySelector('#liveShareToggleBtn')?.getAttribute('aria-expanded')==='true');assert.match(await page.locator('#liveShareToggleBtn').innerText(),/Share Live Scores/);assert.ok(!await page.locator('#liveSharePanel').evaluate(e=>e.classList.contains('hidden')),'Start Series must reveal live sharing');assert.ok(!await page.locator('#liveShareDetails').evaluate(e=>e.classList.contains('hidden')),'Start Series must automatically open live-sharing choices before scoring');assert.equal(await page.locator('#liveShareToggleBtn').getAttribute('aria-expanded'),'true');assert.match(await page.locator('#liveShareDetails').innerText(),/Live session only/);await page.locator('#closeLiveShareBtn').click();assert.ok(await page.locator('#liveShareDetails').evaluate(e=>e.classList.contains('hidden')),'Not Now must collapse live sharing');await page.locator('#liveShareToggleBtn').click();await page.locator('#startLiveShareBtn').click();
  await page.waitForFunction(()=>document.getElementById('liveShareLink').value.includes('/live/#'));
  const link=await page.locator('#liveShareLink').inputValue();await page.locator('#closeLiveShareBtn').click();assert.equal((await page.locator('#liveShareToggleState').textContent()).trim(),'LIVE');assert.ok(await page.locator('#liveShareDetails').evaluate(e=>e.classList.contains('hidden')));
  const spectator=await browser.newContext({viewport:{width:390,height:844}});const view=await spectator.newPage();view.on('pageerror',e=>errors.push(e.message));
  await view.goto(link);await view.locator('#live:not(.hidden)').waitFor();assert.equal(await view.locator('#bowler').textContent(),'QA Bowler');
  for(let i=0;i<12;i++)await page.locator('[data-pins="10"]').click();
  await view.waitForFunction(()=>document.getElementById('score').textContent==='300');
  assert.equal(await view.locator('.frame').count(),10);
  // Failure to reach the relay must not prevent Finish Series or local persistence.
  await scorer.setOffline(true);await page.locator('#finishSeriesBtn').click();
  await page.locator('#seriesSummaryView.active').waitFor();
  const saved=await page.evaluate(()=>new Promise((ok,no)=>{const r=indexedDB.open('popz-bowling-public',1);r.onsuccess=()=>{const q=r.result.transaction('state').objectStore('state').get('master');q.onsuccess=()=>ok(q.result);q.onerror=no;};}));
  assert.ok(saved.sessions[0].finishedAt);assert.equal(saved.activeSessionId,null);
  await scorer.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')));
  await view.waitForFunction(()=>document.getElementById('status').textContent==='FINAL');
  assert.match(await view.locator('#finalGrid').textContent(),/300/);assert.match(await view.locator('#finalGrid').textContent(),/Strike %/);assert.match(await view.locator('#finalSummary').innerText(),/not the bowler's Stats screen or History/);
  await view.screenshot({path:'/private/tmp/popz-live-spectator-qa.png',fullPage:true});
  // Stop must work after Finish Series, with no active scoring session.
  await page.locator('[data-nav="bowl"]').click();await page.locator('#liveShareToggleBtn').click();await page.locator('#stopLiveShareBtn').click();
  await view.reload();await view.waitForFunction(()=>document.getElementById('message').textContent.includes('stopped or expired'));
  assert.equal(await view.locator('#gameBoards .frame').count(),0);
  // A team rotation must never switch the bowler behind an already-shared link.
  await page.locator('#seriesMode').selectOption('multi');
  await page.locator('[data-roster-name="1"]').fill('QA Partner');
  await page.locator('#startSeriesBtn').click();await page.waitForFunction(()=>document.querySelector('#liveShareToggleBtn')?.getAttribute('aria-expanded')==='true');assert.ok(!await page.locator('#liveShareDetails').evaluate(e=>e.classList.contains('hidden')),'team Start Series must also open live-sharing choices before scoring');await page.locator('#startLiveShareBtn').click();
  await page.waitForFunction(()=>document.getElementById('liveShareLink').value.includes('/live/#'));
  const teamLink=await page.locator('#liveShareLink').inputValue();await view.goto(teamLink);
  await page.locator('[data-pins="10"]').click();
  await page.waitForFunction(()=>document.getElementById('activeSeriesTitle').textContent.includes('Partner'));
  await page.locator('[data-pins="8"]').click();await page.locator('[data-pins="0"]').click();
  await view.reload();await view.locator('#live:not(.hidden)').waitFor();
  await view.waitForFunction(()=>document.querySelector('.roll')?.textContent==='X');
  assert.equal(await view.locator('#bowler').textContent(),'QA Bowler');assert.equal(await view.locator('.roll').first().textContent(),'X');
  await page.locator('#liveSharePanel').screenshot({path:'/private/tmp/popz-live-controls-qa.png'});
  // Offline Stop must not claim success, and must retry on reconnect.
  await scorer.setOffline(true);await page.locator('#stopLiveShareBtn').click();
  await page.waitForFunction(()=>document.getElementById('liveShareStatus').textContent.includes('Stop pending'));
  await scorer.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')));
  await page.waitForFunction(()=>document.getElementById('stopLiveShareBtn').classList.contains('hidden'));
  await view.reload();await view.waitForFunction(()=>document.getElementById('message').textContent.includes('stopped or expired'));
  // Confirm installed service worker excludes live APIs and cache still supports offline scoring.
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
  const keys=await page.evaluate(async()=>{const names=await caches.keys();const all=await Promise.all(names.map(async n=>(await (await caches.open(n)).keys()).map(r=>r.url)));return all.flat();});
  assert.ok(keys.some(k=>k.includes('live-share-client.mjs')));
  assert.ok(!keys.some(k=>k.includes('/api/live/')));
  await scorer.setOffline(true);await page.reload();await page.locator('#liveSharePanel').waitFor({state:'attached'});
  assert.ok(!requests.includes('/api/telemetry'),'QA must never deliver telemetry');assert.deepEqual(errors,[]);
  console.log('Browser PASS: mobile score sharing, 300 game, offline Finish, final retry, team isolation, offline Stop, revoke after Finish, service-worker isolation and offline reload.');
} finally {await browser.close();await new Promise(ok=>server.close(ok));sql.close();}
