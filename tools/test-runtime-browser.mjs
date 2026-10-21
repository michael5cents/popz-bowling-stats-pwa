import assert from'node:assert/strict';
import{createServer}from'node:http';
import{readFileSync,existsSync}from'node:fs';
import{resolve,extname}from'node:path';
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve(import.meta.dirname,'..'),runtimeEvents=[],types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
const server=createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://'+req.headers.host);
  if(u.pathname==='/api/runtime'){
   const chunks=[];for await(const c of req)chunks.push(c);const body=JSON.parse(Buffer.concat(chunks).toString()||'{}');runtimeEvents.push(...(body.events||[]));
   res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({ok:true,accepted:(body.events||[]).length}));return;
  }
  if(u.pathname==='/api/telemetry'){
   const chunks=[];for await(const c of req)chunks.push(c);const body=JSON.parse(Buffer.concat(chunks).toString()||'{}');
   res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({ok:true,accepted:(body.events||[]).length}));return;
  }
  if(u.pathname==='/api/health'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({ok:true,status:'ok',version:'public-v39.011'}));return}
  const rel=u.pathname==='/'?'index.html':u.pathname.replace(/^\//,'');const path=resolve(root,rel);
  if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404);res.end();return}
  res.writeHead(200,{'content-type':types[extname(path)]||'text/plain','cache-control':'no-store'});res.end(readFileSync(path));
 }catch(e){res.writeHead(500);res.end(String(e))}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
const ua='Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36';
const makeContext=async()=>{const c=await browser.newContext({viewport:{width:390,height:844},userAgent:ua,serviceWorkers:'allow'});await c.addInitScript(()=>Object.defineProperty(navigator,'webdriver',{get:()=>false}));return c};
try{
 const normal=await makeContext(),page=await normal.newPage();await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appVersion')?.textContent==='public-v39.011');await page.waitForTimeout(700);
 const normalEvents=runtimeEvents.filter(x=>x.appVersion==='public-v39.011');
 assert.ok(normalEvents.some(x=>x.event==='boot_started'),'normal startup should report boot_started');
 assert.ok(normalEvents.some(x=>x.event==='app_ready'),'normal startup should report app_ready');
 assert.equal(await page.locator('#popzLoadFailure').count(),0);
 runtimeEvents.length=0;
 await page.evaluate(src=>{const s=document.createElement('script');s.src=src;document.body.appendChild(s)},base+'/v4bc70e2c01a94c73b74392e4234840661791215815920');
 await page.waitForTimeout(500);
 assert.ok(!runtimeEvents.some(x=>x.event==='resource_error'),'non-app injected script failures must not report as critical runtime errors');
 await normal.close();

 runtimeEvents.length=0;
 const broken=await makeContext(),bad=await broken.newPage();await bad.route('**/*',r=>{
  const u=r.request().url();if(u.startsWith(base)&&u.includes('/app.js?v=39.011'))return r.abort('failed');return u.startsWith(base)?r.continue():r.abort();
 });
 await bad.goto(base+'/',{waitUntil:'domcontentloaded'});
 await bad.waitForFunction(()=>document.getElementById('popzLoadFailure'));
 await bad.waitForFunction(()=>true,{timeout:200}).catch(()=>{});
 await bad.waitForTimeout(500);
 assert.ok(runtimeEvents.some(x=>x.event==='boot_started'),'broken startup should still report boot_started');
 assert.ok(runtimeEvents.some(x=>x.event==='resource_error'&&x.errorKind==='script_load'),'missing main module should report resource_error');
 assert.ok(!runtimeEvents.some(x=>x.event==='app_ready'),'broken startup must not claim app_ready');
 assert.match(await bad.locator('#popzLoadFailure').textContent(),/did not finish loading/i);
 await broken.close();
 console.log('runtime monitor browser PASS: normal ready, broken-module reporting, privacy-safe fallback UI.');
}finally{await browser.close();await new Promise(ok=>server.close(ok))}
