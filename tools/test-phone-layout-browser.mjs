// Synthetic browser QA for public-v38 Compact Phone layout.
import assert from'node:assert/strict';
import{createServer}from'node:http';
import{readFileSync}from'node:fs';
import{resolve,extname}from'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve(import.meta.dirname,'..');
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
const server=createServer((req,res)=>{
  try{
    const url=new URL(req.url,'http://'+req.headers.host);
    const path=resolve(root,'.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));
    if(!path.startsWith(root+'/')){res.writeHead(403).end();return}
    res.writeHead(200,{'Content-Type':types[extname(path)]||'text/plain','Cache-Control':'no-store'});res.end(readFileSync(path));
  }catch{if(!res.headersSent)res.writeHead(404);res.end()}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});

async function contextFor(width,height,installed=true){
  const ctx=await browser.newContext({viewport:{width,height},screen:{width,height},serviceWorkers:'block',acceptDownloads:true});
  if(installed)await ctx.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true}));
  await ctx.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:')?route.continue():route.abort());
  return ctx;
}

try{
  const phone=await contextFor(390,844,true),p=await phone.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(base+'/?qa=1&phone-layout=auto');
  await p.waitForFunction(()=>document.body.classList.contains('phone-layout'));
  assert.equal(await p.locator('#layoutMode').inputValue(),'automatic');
  assert.match(await p.locator('#layoutModeStatus').textContent(),/Automatic.*Compact Phone/);

  await p.locator('[data-nav="bowl"]').click();
  assert.ok(await p.locator('#liveSharePanel').evaluate(e=>e.classList.contains('hidden')),'Share Live Scores stays absent during initial setup');
  assert.equal(await p.locator('#phoneMoreSeriesBtn').isVisible(),true);
  assert.equal(await p.locator('#seriesOilPattern').isVisible(),false,'secondary setup fields are collapsed');
  await p.locator('#phoneMoreSeriesBtn').click();
  assert.equal(await p.locator('#seriesOilPattern').isVisible(),true,'More Series Options reveals secondary fields');
  await p.locator('#phoneMoreSeriesBtn').click();
  await p.screenshot({path:'/tmp/popz-phone-after-setup.png',fullPage:false});

  await p.locator('#seriesGameCount').fill('1');
  await p.locator('#startSeriesBtn').click();
  await p.waitForFunction(()=>!document.querySelector('#scoringArea')?.classList.contains('hidden'));
  assert.equal(await p.locator('#phoneScoringHeader').isVisible(),true);
  assert.equal(await p.locator('#liveSharePanel').isVisible(),true);
  assert.equal(await p.locator('#liveShareDetails').evaluate(e=>e.classList.contains('hidden')),true,'share bar appears collapsed');
  assert.equal(await p.locator('#finishSeriesBtn').isVisible(),false);
  assert.equal(await p.locator('#phoneFinishSeriesBtn').isVisible(),true);
  assert.equal((await p.locator('#pinPad button').first().textContent()).trim(),'1');
  assert.equal((await p.locator('#pinPad button').last().textContent()).trim(),'Miss');
  assert.equal(await p.locator('#currentEnteringAverage').isVisible(),false);
  await p.locator('#phoneScoringDetailsBtn').click();
  assert.equal(await p.locator('#currentEnteringAverage').isVisible(),true,'secondary scoring details remain accessible');
  await p.locator('#phoneScoringDetailsBtn').click();
  await p.screenshot({path:'/tmp/popz-phone-after-scoring.png',fullPage:false});

  await p.locator('[data-pins="10"]').click();
  await p.waitForFunction(()=>document.querySelector('#phoneFrameNo')?.textContent.trim()==='2');
  assert.equal((await p.locator('#phoneFrameNo').textContent()).trim(),'2');
  assert.equal(await p.locator('#liveSharePanel').isVisible(),true,'share bar remains available while scoring');

  await p.locator('[data-nav="settings"]').click();
  await p.locator('#layoutMode').selectOption('full');
  await p.waitForFunction(()=>!document.body.classList.contains('phone-layout'));
  assert.equal(await p.evaluate(()=>localStorage.getItem('popz-bowling-layout-mode')),'full');
  await p.locator('[data-nav="bowl"]').click();
  assert.equal(await p.locator('#phoneScoringHeader').isVisible(),false,'Full Layout override removes phone-only scoring header');
  assert.equal(await p.locator('#finishSeriesBtn').isVisible(),true,'Full Layout keeps original Finish Series control');
  assert.deepEqual(errors,[]);
  await phone.close();

  const tablet=await contextFor(820,1180,true),t=await tablet.newPage(),tabletErrors=[];
  t.on('pageerror',e=>tabletErrors.push(e.message));t.on('dialog',d=>d.accept());
  await t.goto(base+'/?qa=1&tablet-layout=auto');
  await t.waitForFunction(()=>document.querySelector('#layoutModeStatus')?.textContent.includes('Full Layout'));
  assert.equal(await t.evaluate(()=>document.body.classList.contains('phone-layout')),false,'installed tablet must retain current Full Layout');
  assert.match(await t.locator('#layoutModeStatus').textContent(),/tablet \/ larger screen/);
  await t.locator('[data-nav="bowl"]').click();
  assert.equal(await t.locator('#phoneMoreSeriesBtn').isVisible(),false);
  assert.equal(await t.locator('#seriesOilPattern').isVisible(),true,'full tablet setup fields stay visible exactly as before');
  await t.screenshot({path:'/tmp/popz-tablet-after-setup.png',fullPage:false});
  await t.locator('#seriesGameCount').fill('1');
  await t.locator('#startSeriesBtn').click();
  await t.waitForFunction(()=>!document.querySelector('#scoringArea')?.classList.contains('hidden'));
  await t.locator('[data-pins="10"]').click();
  assert.equal(await t.locator('#phoneScoringHeader').isVisible(),false);
  assert.equal(await t.locator('#finishSeriesBtn').isVisible(),true);
  await t.screenshot({path:'/tmp/popz-tablet-after-scoring.png',fullPage:false});

  await t.locator('[data-nav="settings"]').click();
  await t.locator('#layoutMode').selectOption('compact-phone');
  await t.waitForFunction(()=>document.body.classList.contains('phone-layout'));
  assert.equal(await t.evaluate(()=>localStorage.getItem('popz-bowling-layout-mode')),'compact-phone','Compact Phone override works on larger devices for testing');
  assert.deepEqual(tabletErrors,[]);
  await tablet.close();

  const browserPhone=await contextFor(390,844,false),b=await browserPhone.newPage();
  await b.goto(base+'/?qa=1&phone-browser=auto');
  await b.waitForFunction(()=>document.querySelector('#layoutModeStatus')?.textContent.includes('Full Layout'));
  assert.equal(await b.evaluate(()=>document.body.classList.contains('phone-layout')),false,'phone-sized regular browser stays on current Full Layout');
  assert.match(await b.locator('#layoutModeStatus').textContent(),/not running as an installed PWA/);
  await browserPhone.close();

  console.log('PHONE_LAYOUT_BROWSER_PASS');
}finally{
  await browser.close();
  await new Promise(ok=>server.close(ok));
}
