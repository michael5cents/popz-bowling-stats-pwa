// Owner QA iPad installation smoke test, isolated: never transmits production events.
import assert from'node:assert/strict';
import{readFileSync,existsSync}from'node:fs';
import{execFileSync}from'node:child_process';
import{resolve,extname}from'node:path';
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=resolve(import.meta.dirname,'..');
execFileSync(resolve(repo,'scripts/build-dist.sh'),{cwd:repo,stdio:'pipe'});
const root=resolve(repo,'dist');
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
let telemetryPosts=0,runtimePosts=0;
const ctx=await browser.newContext({viewport:{width:820,height:1180},screen:{width:820,height:1180},serviceWorkers:'block',
 userAgent:'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
await ctx.addInitScript(()=>{
 Object.defineProperty(navigator,'webdriver',{get:()=>false,configurable:true});
 Object.defineProperty(navigator,'standalone',{get:()=>true,configurable:true});
});
await ctx.route('**/*',route=>{
 const u=new URL(route.request().url());
 if(u.hostname!=='popzbowling.com')return route.abort();
 if(u.pathname==='/api/telemetry'&&route.request().method()==='POST')telemetryPosts++;
 if(u.pathname==='/api/runtime'&&route.request().method()==='POST')runtimePosts++;
 if(u.pathname.startsWith('/api/'))return route.fulfill({status:503,contentType:'application/json',body:'{}'});
 const rel=u.pathname==='/'?'index.html':u.pathname==='/qa-ipad/'?'qa-ipad/index.html':u.pathname.slice(1),f=resolve(root,rel);
 if(!f.startsWith(root+'/')||!existsSync(f))return route.fulfill({status:404,body:''});
 return route.fulfill({status:200,contentType:types[extname(f)]||'application/octet-stream',body:readFileSync(f)});
});
try{
 const page=await ctx.newPage(),errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.goto('https://popzbowling.com/qa-ipad/');
 await page.waitForFunction(()=>document.querySelector('#qaTabletIndicator')&&!document.querySelector('#qaTabletIndicator').classList.contains('hidden'));
 assert.match(await page.locator('#qaTabletIndicator').textContent(),/TELEMETRY OFF/);
 assert.equal(await page.locator('link[rel=manifest]').getAttribute('href'),'/qa-tablet.webmanifest');
 assert.match(await page.title(),/Popz Bowling QA/);
 assert.equal(await page.locator('#installGate').isVisible(),false);
 const manifest=await page.evaluate(async()=>await(await fetch(document.querySelector('link[rel=manifest]').href)).json());
 assert.equal(manifest.start_url,'/qa-ipad/');
 assert.equal(manifest.id,'/qa-ipad/');
 await page.waitForFunction(()=>!!document.querySelector('#appVersion')?.textContent?.trim()&&document.querySelector('#appVersion').textContent!=='—',{timeout:15000});
 assert.equal(await page.locator('#appVersion').textContent(),'public-v39.022');
 assert.equal(await page.locator('#qaTabletIndicator').isVisible(),true);
 // A real QA test series must carry an ineligible milestone marker in IndexedDB,
 // even if it is later completed or the PWA reopens after an offline session.
 await page.locator('#seriesLeague').fill('OWNER QA Evaluation');
 await page.locator('#seriesCenter').fill('Owner iPad Test');
 await page.locator('#seriesGameCount').fill('1');
 await page.locator('#startSeriesBtn').click();
 await page.waitForFunction(()=>!document.querySelector('#scoringArea').classList.contains('hidden'),null,{timeout:10000});
 const localSession=await page.evaluate(()=>new Promise((resolve,reject)=>{
  const req=indexedDB.open('popz-bowling-public',1);
  req.onsuccess=()=>{
   const db=req.result;
   const get=db.transaction('state').objectStore('state').get('master');
   get.onsuccess=()=>{const s=get.result?.sessions||[];resolve(s[s.length-1]||null);db.close()};
   get.onerror=()=>reject(get.error);
  };
  req.onerror=()=>reject(req.error);
 }));
 assert.equal(localSession?._telemetry?.eligible,false,'QA series must never reconcile to customer telemetry');
 assert.ok(localSession?.id,'QA scoring must save locally');
 const badge=await page.locator('#settingsView .version-badge').allTextContents();
 assert.ok(badge.some(s=>s.includes('QA · telemetry off')),'settings badge must reflect QA mode');
 await page.waitForTimeout(1600);
 assert.equal(telemetryPosts,0,'QA activity must not generate adoption POSTs');
 assert.equal(runtimePosts,0,'QA activity must not generate runtime POSTs');
 const relaunch=await ctx.newPage();
 await relaunch.goto('https://popzbowling.com'+manifest.start_url);
 await relaunch.waitForFunction(()=>document.querySelector('#qaTabletIndicator')?.classList.contains('hidden')===false);
 assert.equal(await relaunch.locator('#qaTabletIndicator').isVisible(),true);
 await relaunch.waitForTimeout(500);
 assert.equal(telemetryPosts,0,'QA relaunch must not count as customer adoption');
 assert.equal(runtimePosts,0,'QA relaunch must not count as runtime traffic');
 assert.deepEqual(errors,[],'unexpected QA app page errors');
 console.log('QA_TABLET_IPAD_INSTALL_AND_REOPEN_TELEMETRY_EXCLUSION_PASS');
}finally{await ctx.close();await browser.close()}
