import assert from'node:assert/strict';
import{readFileSync,existsSync}from'node:fs';
import{resolve,extname}from'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve(import.meta.dirname,'..');
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
const browser=await chromium.launch({headless:true});
async function makeContext({standalone=false,userAgent}={}){
  const ctx=await browser.newContext({viewport:{width:390,height:844},screen:{width:390,height:844},serviceWorkers:'block',userAgent});
  if(standalone)await ctx.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true}));
  const requests=[];
  await ctx.route('**/*',route=>{
    const u=new URL(route.request().url());
    if(u.hostname!=='popzbowling.com')return route.abort();
    requests.push(u.pathname);
    if(u.pathname.startsWith('/api/'))return route.fulfill({status:204,body:''});
    const rel=u.pathname==='/'?'index.html':u.pathname==='/live/'?'live/index.html':u.pathname.slice(1);
    const file=resolve(root,rel);
    if(!file.startsWith(root+'/')||!existsSync(file))return route.fulfill({status:404,body:''});
    return route.fulfill({status:200,contentType:types[extname(file)]||'text/plain',body:readFileSync(file)});
  });
  return{ctx,requests};
}
try{
  const normal=await makeContext(),p=await normal.ctx.newPage();
  await p.goto('https://popzbowling.com/?qa=1&gate=1');
  await p.waitForFunction(()=>document.body.classList.contains('install-required'));
  assert.equal(await p.locator('#installGate').isVisible(),true);
  assert.equal(await p.locator('#appShell').isVisible(),false);
  assert.equal((await p.locator('#installGateBtn').textContent()).trim(),'Install Popz Bowling');
  const dbs=await p.evaluate(async()=>typeof indexedDB.databases==='function'?(await indexedDB.databases()).map(x=>x.name):[]);
  assert.equal(dbs.includes('popz-bowling-public'),false,'browser landing must not open bowling IndexedDB');
  assert.equal(normal.requests.some(x=>x==='/api/telemetry'),false,'browser landing must not start adoption telemetry');
  assert.equal(normal.requests.some(x=>x.endsWith('/app.js')),false,'browser install gate must not request the full bowling app');
  assert.equal(normal.requests.some(x=>x.endsWith('.mjs')),false,'browser install gate must not request bowling modules');
  await p.waitForTimeout(8300);
  assert.equal(await p.locator('#popzLoadFailure').count(),0,'healthy install gate must satisfy the startup watchdog');
  await normal.ctx.close();

  const ios=await makeContext({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'}),ip=await ios.ctx.newPage();
  await ip.goto('https://popzbowling.com/?ios=1');
  await ip.waitForFunction(()=>document.body.classList.contains('install-required'));
  await ip.locator('#installGateBtn').click();
  await ip.locator('#installGateHelp').waitFor();
  assert.match(await ip.locator('#installGateHelp').textContent(),/Add to Home Screen/);
  assert.equal(await ip.locator('#appShell').isVisible(),false);
  await ios.ctx.close();

  const android=await makeContext({userAgent:'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/153 Mobile Safari/537.36'}),ap=await android.ctx.newPage();
  await ap.goto('https://popzbowling.com/?android=1');
  await ap.waitForFunction(()=>document.body.classList.contains('install-required'));
  await ap.evaluate(()=>{const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=()=>{window.__installPrompted=true};e.userChoice=Promise.resolve({outcome:'accepted'});window.dispatchEvent(e)});
  await ap.locator('#installGateBtn').click();
  await ap.waitForFunction(()=>window.__installPrompted===true);
  assert.match(await ap.locator('#installGateHelp').textContent(),/Installation accepted/);
  await android.ctx.close();

  const installed=await makeContext({standalone:true}),pp=await installed.ctx.newPage();
  await pp.goto('https://popzbowling.com/?installed=1');
  await pp.waitForFunction(()=>!document.body.classList.contains('install-check'));
  assert.equal(await pp.locator('#installGate').isVisible(),false);
  assert.equal(await pp.locator('#appShell').isVisible(),true);
  await installed.ctx.close();

  const live=await makeContext(),lp=await live.ctx.newPage();
  await lp.goto('https://popzbowling.com/live/#synthetic');
  assert.equal(await lp.locator('#installGate').count(),0,'spectator page must not use app install gate');
  assert.equal(await lp.locator('text=SHARED LIVE SCORES').count()>0,true);
  await live.ctx.close();
  console.log('INSTALL_GATE_BROWSER_PASS');
}finally{await browser.close()}
