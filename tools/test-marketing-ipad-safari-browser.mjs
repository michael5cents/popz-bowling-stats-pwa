// Full-size owner video page: returns to the marketing site after playback.
// Local integration only; no live customer or analytics traffic.
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
const movie='Popz-Bowling-League-Night-Safari-Compatible.mp4',requestPaths=[];
const server=createServer((req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1');requestPaths.push(u.pathname);
 const rel=u.pathname==='/'?'index.html':u.pathname==='/features/'?'features/index.html':u.pathname==='/features/watch'?'features/watch.html':u.pathname.slice(1);
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
const cases=[
 {label:'iPad Safari',ua:'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',touch:5,native:true},
 {label:'iPad Chrome',ua:'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/154.0.0.0 Mobile/15E148 Safari/604.1',touch:5,native:true},
 {label:'iPad desktop UA',ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',touch:5,native:true},
 {label:'iPad Safari without JS',ua:'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',touch:5,native:true,noJS:true},
 {label:'Desktop Safari',ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',touch:0,native:false}
];
try{
 for(const t of cases){
  const ctx=await browser.newContext({viewport:{width:t.native?820:1300,height:960},userAgent:t.ua,serviceWorkers:'block',javaScriptEnabled:!t.noJS});
  await ctx.addInitScript(touches=>Object.defineProperty(navigator,'maxTouchPoints',{value:touches,configurable:true}),t.touch);
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/features/',{waitUntil:'domcontentloaded',timeout:25000});
  assert.equal(await page.locator('a[data-video-open]').count(),4);
  await page.locator('.video-preview').click();
  if(t.native){
   await page.waitForURL('**/features/watch',{timeout:16000});
   assert.equal(await page.locator('a.return-link').getAttribute('href'),'/features/#demo');
   assert.ok((await page.locator('.fallback a').getAttribute('href')).endsWith(movie));
   const dimensions=await page.evaluate(async()=>{
    const v=document.querySelector('#commercial');
    if(v.readyState<1)await new Promise((resolve,reject)=>{
      v.addEventListener('loadedmetadata',resolve,{once:true});
      v.addEventListener('error',()=>reject(new Error('media failed')),{once:true});
      setTimeout(()=>reject(new Error('metadata timed out')),16000);
    });
    return{width:v.videoWidth,height:v.videoHeight,duration:v.duration};
   });
   assert.equal(dimensions.width,1280);assert.equal(dimensions.height,720);
   assert.ok(dimensions.duration>52&&dimensions.duration<54);
   if(!t.noJS){
    if(t.label==='iPad Safari'){
     // Start the actual 1280x720 video through a gesture, seek near its end,
     // and verify the browser emits 'ended' naturally and navigates back.
     await page.locator('#play-commercial').click();
     await page.waitForFunction(()=>!document.querySelector('#commercial').paused,null,{timeout:15000});
     await page.evaluate(()=>{
      const v=document.querySelector('#commercial');
      v.currentTime=v.duration-1.1;
     });
    }else{
     // Other user-agent cases exercise the same completion handler quickly.
     await page.evaluate(()=>document.querySelector('#commercial').dispatchEvent(new Event('ended')));
    }
    await page.waitForURL('**/features/#demo',{timeout:15000});
    assert.equal(new URL(page.url()).hash,'#demo');
   }else{
    assert.equal(await page.locator('a.return-link').isVisible(),true,'with JS off, Back to website still works');
    await page.locator('a.return-link').click();
    await page.waitForURL('**/features/#demo',{timeout:15000});
   }
  }else{
   await page.locator('#demo-dialog[open]').waitFor({timeout:15000});
   await page.waitForFunction(()=>document.querySelector('#demo-video')?.videoWidth===1280,null,{timeout:16000});
   await page.evaluate(()=>document.querySelector('#demo-video').dispatchEvent(new Event('ended')));
   await page.locator('#demo-dialog[open]').waitFor({state:'hidden',timeout:15000});
   assert.equal(new URL(page.url()).pathname,'/features/');
  }
  assert.deepEqual(errors,[],t.label+' JS errors');
  console.log('COMMERCIAL_RETURN_PASS '+t.label);
  await ctx.close();
 }
 assert.ok(requestPaths.some(p=>p.endsWith(movie)),'full HD video must be loaded from local server');
}finally{await browser.close();await new Promise(ok=>server.close(ok))}
