// Real Chrome service-worker test: installed owner QA opens at a PATH with no query.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=resolve(import.meta.dirname,'..');
execFileSync(resolve(repo,'scripts/build-dist.sh'),{cwd:repo,stdio:'pipe'});
const root=resolve(repo,'dist');
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
let posts=0;
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/runtime'||url.pathname==='/api/telemetry')posts++;
 if(url.pathname.startsWith('/api/')){
  res.writeHead(503,{'content-type':'application/json','cache-control':'no-store'});
  res.end('{}');return;
 }
 const rel=url.pathname==='/'?'index.html':url.pathname==='/qa-ipad/'?'qa-ipad/index.html':url.pathname.slice(1);
 const file=resolve(root,rel);
 if(!file.startsWith(root+'/')||!existsSync(file)){res.writeHead(404);res.end('Not found');return}
 res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','cache-control':'no-store, max-age=0'});
 res.end(readFileSync(file));
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port+'/qa-ipad/';
const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
try{
 const context=await browser.newContext({serviceWorkers:'allow',viewport:{width:820,height:1180},
  userAgent:'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/155 Mobile/15E148 Safari/604.1'});
 await context.addInitScript(()=>{
  Object.defineProperty(navigator,'webdriver',{get:()=>false,configurable:true});
  Object.defineProperty(navigator,'standalone',{get:()=>true,configurable:true});
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#qaTabletIndicator')?.classList.contains('hidden')===false,null,{timeout:18000});
 await page.waitForFunction(()=>document.querySelector('#appVersion')?.textContent==='public-v39.022',null,{timeout:18000});
 const manifest=await page.evaluate(async()=>await(await fetch('/qa-tablet.webmanifest')).json());
 assert.equal(manifest.start_url,'/qa-ipad/');
 assert.ok(new URL(page.url()).search==='','real QA page must work without query args');
 await page.evaluate(async()=>await navigator.serviceWorker.ready);
 await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,null,{timeout:25000});
 await page.waitForFunction(async()=>{const c=await caches.open('popz-bowling-public-v39.022');return !!(await c.match('/qa-ipad/index.html'))},null,{timeout:12000});
 await context.setOffline(true);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#qaTabletIndicator')?.classList.contains('hidden')===false,null,{timeout:20000});
 await page.waitForFunction(()=>document.querySelector('#appVersion')?.textContent==='public-v39.022',null,{timeout:20000});
 await page.locator('#seriesLeague').fill('Offline QA iPad');
 await page.locator('#seriesCenter').fill('QA');
 await page.locator('#seriesGameCount').fill('1');
 await page.locator('#startSeriesBtn').click();
 await page.waitForFunction(()=>document.querySelector('#scoringArea')?.classList.contains('hidden')===false,null,{timeout:15000});
 const data=await page.evaluate(()=>new Promise((resolve,reject)=>{
  const request=indexedDB.open('popz-bowling-public',1);
  request.onsuccess=()=>{
   const db=request.result,get=db.transaction('state').objectStore('state').get('master');
   get.onsuccess=()=>{const ss=get.result?.sessions||[];resolve(ss.at(-1)?._telemetry?.eligible);db.close()};
   get.onerror=()=>reject(get.error);
  };
  request.onerror=()=>reject(request.error);
 }));
 assert.equal(data,false,'offline QA series must remain telemetry-ineligible');
 assert.equal(posts,0,'no QA posts even when it reopens offline and stores series');
 assert.deepEqual(errors,[],'no uncaught JS errors across offline reopening');
 console.log('QA_IPAD_PATH_NO_QUERY_OFFLINE_REOPEN_AND_SCORING_PASS');
 await context.close();
} finally {await browser.close();await new Promise(ok=>server.close(ok))}
