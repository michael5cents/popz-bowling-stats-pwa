// Installed QA iPad opening in Chrome; exercise the actual instruction path.
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
let posts=0;
const ctx=await browser.newContext({viewport:{width:820,height:1180},serviceWorkers:'block',
 userAgent:'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/155.0.0.0 Mobile/15E148 Safari/604.1'});
await ctx.addInitScript(()=>Object.defineProperty(navigator,'webdriver',{get:()=>false,configurable:true}));
await ctx.route('**/*',route=>{
 const u=new URL(route.request().url());
 if(u.hostname!=='popzbowling.com')return route.abort();
 if(route.request().method()==='POST'&&['/api/telemetry','/api/runtime'].includes(u.pathname))posts++;
 if(u.pathname.startsWith('/api/'))return route.fulfill({status:503,contentType:'application/json',body:'{}'});
 const rel=u.pathname==='/'?'index.html':u.pathname==='/qa-ipad/'?'qa-ipad/index.html':u.pathname.slice(1),f=resolve(root,rel);
 if(!f.startsWith(root+'/')||!existsSync(f))return route.fulfill({status:404,body:''});
 return route.fulfill({status:200,contentType:types[extname(f)]||'application/octet-stream',body:readFileSync(f)});
});
try{
 const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('https://popzbowling.com/qa-ipad/');
 await p.waitForFunction(()=>document.querySelector('#qaTabletIndicator')?.classList.contains('hidden')===false,{timeout:15000});
 assert.equal(await p.locator('link[rel=manifest]').getAttribute('href'),'/qa-tablet.webmanifest');
 const btn=p.locator('#installAppBtn');
 await btn.waitFor({state:'visible',timeout:20000});
 await btn.click();
 await p.waitForFunction(()=>document.querySelector('#toast')?.textContent?.includes('Stay in Chrome on this page'),null,{timeout:12000});
 const help=await p.locator('#toast').textContent();
 assert.match(help,/Chrome’s Share icon/);
 assert.match(help,/Add to Home Screen/);
 assert.match(help,/Confirm Add/);
 assert.match(help,/OWNER QA · TELEMETRY OFF/);
 assert.doesNotMatch(help,/Open this page in Safari/);
 await p.waitForTimeout(1000);
 assert.equal(posts,0,'Chrome QA install flow must not count as adoption or runtime');
 assert.deepEqual(errors,[],'Chrome QA instructions must not trigger JS errors');
 console.log('QA_IPAD_CHROME_INSTALL_HELP_PASS');
}finally{await ctx.close();await browser.close()}
