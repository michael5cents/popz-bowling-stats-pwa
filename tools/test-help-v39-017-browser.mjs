import assert from 'node:assert/strict';
import {chromium} from '/Users/michaelnichols/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const url=process.env.POPZ_HELP_QA_URL||'http://127.0.0.1:9136/';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
 for(const [name,width,height] of [['phone',390,844],['tablet',820,1180]]){
  const ctx=await browser.newContext({viewport:{width,height},screen:{width,height},serviceWorkers:'block'});
  await ctx.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true}));
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'?help-qa='+name,{waitUntil:'domcontentloaded',timeout:25000});
  await page.waitForFunction(()=>document.querySelector('#bowlView')?.classList.contains('active')===true,null,{timeout:15000});
  assert.equal(await page.locator('meta[name="popz-app-version"]').getAttribute('content'),'public-v39.017');
  await page.locator('[data-nav="help"]').first().click();
  await page.waitForFunction(()=>document.querySelector('#helpView')?.classList.contains('active')===true,null,{timeout:9000});
  assert.equal(await page.locator('#helpView .help-card').count(),19);
  const headings=await page.locator('#helpView .help-card h3').allTextContents();
  for(const title of ['Record Ball, Lane & Line','Use Stats','Read Advanced Ball & Line Results - PRO',
                      'Understand Lane Transition Analysis - PRO','Use Bowling Performance Evaluations - PRO'])
   assert(headings.includes(title),'Missing Help heading: '+title);
  assert.match(await page.locator('#helpView .help-card').nth(3).textContent(),/21-22/);
  assert.match(await page.locator('#helpView .help-card').nth(9).textContent(),/Full-game Avg/);
  assert.match(await page.locator('#helpView .help-card').nth(10).textContent(),/Early.*Building.*Useful.*Strong/s);
  assert.match(await page.locator('#helpView .help-card').nth(11).textContent(),/offline/);
  const dims=await page.evaluate(()=>{
   const panel=document.querySelector('#helpView .help-card'),rect=panel.getBoundingClientRect();
   return {width:window.innerWidth,cardWidth:rect.width,scrollWidth:document.documentElement.scrollWidth,
      cardDisplay:getComputedStyle(panel).display,help:document.querySelector('#helpView').className};
  });
  assert(dims.cardWidth<dims.width,'Help card must fit viewport');
  // The Print / Save Guide action uses window.print; Chrome PDF proves all cards are print-visible.
  await page.emulateMedia({media:'print'});
  const printState=await page.evaluate(()=>({
   helpDisplay:getComputedStyle(document.querySelector('#helpView')).display,
   cardDisplay:getComputedStyle(document.querySelector('#helpView .help-card')).display
  }));
  assert.notEqual(printState.helpDisplay,'none');
  assert.notEqual(printState.cardDisplay,'none');
  const pdf=await page.pdf({format:'A4',printBackground:true});
  assert(pdf.length>5000,'printable Help PDF unexpectedly empty');
  assert.equal(errors.length,0,'browser errors: '+errors.join(' | '));
  console.log(name.toUpperCase()+'_HELP_OK: 19 numbered cards and full printable guide; '+dims.width+'px viewport; '+pdf.length+' bytes');
  await ctx.close();
 }
}finally{await browser.close()}
