import assert from'node:assert/strict';
import{readFileSync,existsSync}from'node:fs';
import{resolve,extname}from'node:path';
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve(import.meta.dirname,'..');
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
const browser=await chromium.launch({headless:true});

async function installed(width,height){
  const ctx=await browser.newContext({viewport:{width,height},screen:{width,height},serviceWorkers:'block'});
  await ctx.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true}));
  await ctx.route('**/*',route=>{
    const u=new URL(route.request().url());
    if(u.hostname!=='popzbowling.com')return route.abort();
    if(u.pathname.startsWith('/api/'))return route.fulfill({status:204,body:''});
    const rel=u.pathname==='/'?'index.html':u.pathname.slice(1),file=resolve(root,rel);
    if(!file.startsWith(root+'/')||!existsSync(file))return route.fulfill({status:404,body:''});
    return route.fulfill({status:200,contentType:types[extname(file)]||'text/plain',body:readFileSync(file)});
  });
  return ctx;
}

try{
  for(const [label,w,h] of [['phone',390,844],['tablet',820,1180]]){
    const ctx=await installed(w,h),p=await ctx.newPage();
    await p.goto('https://popzbowling.com/?qa=1&landing='+label,{waitUntil:'domcontentloaded'});
    await p.waitForFunction(()=>document.querySelector('#bowlView')?.classList.contains('active'));
    assert.equal(await p.locator('#bowlView').evaluate(e=>e.classList.contains('active')),true,label+' must land on Bowl');
    assert.equal(await p.locator('#dashboardView').evaluate(e=>e.classList.contains('active')),false,label+' must not land on Stats');
    assert.equal(await p.locator('[data-nav="bowl"]').evaluate(e=>e.classList.contains('active')),true,label+' Bowl nav must be active');
    await p.evaluate(()=>{window.close=()=>{}});
    await p.locator('#closeAppBtn').click();await p.waitForTimeout(240);
    await p.locator('#reopenAppBtn').click();
    assert.equal(await p.locator('#bowlView').evaluate(e=>e.classList.contains('active')),true,label+' reopen must return to Bowl');
    await ctx.close();
  }
  console.log('DEFAULT_BOWL_BROWSER_PASS');
}finally{await browser.close()}
