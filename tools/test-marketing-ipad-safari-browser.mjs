// Local integration: iPad Safari uses native player, desktops retain the modal.
// Never contacts the live public site or telemetry.
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=resolve(import.meta.dirname,'..');
execFileSync(resolve(repo,'scripts/build-dist.sh'),{cwd:repo,stdio:'pipe'});
const root=resolve(repo,'dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.mp4':'video/mp4','.jpg':'image/jpeg','.png':'image/png'};
const video='Popz-Bowling-League-Night-Safari-Compatible.mp4',requestPaths=[];
const server=createServer((req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1');requestPaths.push(u.pathname);
 const rel=u.pathname==='/'?'index.html':u.pathname==='/features/'?'features/index.html':u.pathname.slice(1);
 const file=resolve(root,decodeURIComponent(rel));
 if(!file.startsWith(root+'/')||!existsSync(file)){res.writeHead(404);res.end('Not found');return}
 const len=statSync(file).size;
 if(rel.endsWith('.mp4')&&req.headers.range){
  const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
  if(!match){res.writeHead(416);res.end();return}
  const start=Number(match[1]),end=Math.min(len-1,match[2]?Number(match[2]):len-1);
  if(start>len-1||end<start){res.writeHead(416);res.end();return}
  res.writeHead(206,{'content-type':'video/mp4','accept-ranges':'bytes','content-range':'bytes '+start+'-'+end+'/'+len,'content-length':end-start+1,'cache-control':'public, max-age=0'});
  res.end(readFileSync(file).subarray(start,end+1));return;
 }
 res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','accept-ranges':'bytes','content-length':len,'cache-control':'no-store'});
 res.end(readFileSync(file));
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
const tests=[
 {label:'iPad Safari',ua:'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',touch:5,native:true},
 {label:'iPad Chrome',ua:'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/154.0.0.0 Mobile/15E148 Safari/604.1',touch:5,native:true},
 {label:'iPad desktop UA',ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',touch:5,native:true},
 {label:'Desktop Safari',ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',touch:0,native:false}
];
try{
 for(const t of tests){
  const ctx=await browser.newContext({viewport:{width:t.native?820:1300,height:960},userAgent:t.ua,serviceWorkers:'block'});
  await ctx.addInitScript(touches=>Object.defineProperty(navigator,'maxTouchPoints',{value:touches,configurable:true}),t.touch);
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/features/',{waitUntil:'domcontentloaded',timeout:25000});
  await page.locator('.video-preview').click();
  if(t.native){
   await page.waitForURL('**/assets/'+video,{timeout:18000});
   assert.equal(new URL(page.url()).pathname,'/features/assets/'+video);
   assert.equal(await page.locator('#demo-dialog[open]').count(),0,'iPad should not show modal');
  }else{
   await page.locator('#demo-dialog[open]').waitFor({timeout:15000});
   const dims=await page.evaluate(async()=>{
    const video=document.getElementById('demo-video');
    if(video.readyState<2)await new Promise((resolve,reject)=>{
      video.addEventListener('loadeddata',resolve,{once:true});
      video.addEventListener('error',()=>reject(new Error('video failed')),{once:true});
      setTimeout(()=>reject(new Error('media not loaded')),15000);
    });
    return{w:video.videoWidth,h:video.videoHeight,d:video.duration};
   });
   assert.equal(dims.w,1280);assert.equal(dims.h,720);assert.ok(dims.d>52&&dims.d<54);
   await page.locator('#demo-close').click();
   assert.equal(await page.locator('#demo-dialog[open]').count(),0);
  }
  assert.deepEqual(errors,[],t.label+' console errors');
  console.log('MARKETING_VIDEO_PASS '+t.label+(t.native?' native direct video':' 1280x720 modal playable'));
  await ctx.close();
 }
 assert.ok(requestPaths.some(p=>p.endsWith(video)),'clean commercial media must actually be requested');
}finally{await browser.close();await new Promise(ok=>server.close(ok))}
