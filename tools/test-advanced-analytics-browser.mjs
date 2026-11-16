import assert from 'node:assert/strict';
import {chromium} from '/Users/michaelnichols/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';

// Local candidate only; isolated browser profiles, no customer data or payments.
const browser=await chromium.launch({
 headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
});
const local='http://127.0.0.1:9136/';
const readState=async page=>page.evaluate(()=>new Promise((resolve,reject)=>{
 const req=indexedDB.open('popz-bowling-public',1);
 req.onsuccess=()=>{
  const db=req.result,r=db.transaction('state','readonly').objectStore('state').get('master');
  r.onsuccess=()=>{db.close();resolve(r.result)};
  r.onerror=()=>reject(r.error);
 };
 req.onerror=()=>reject(req.error);
}));
try{
 for(const [name,width,height] of [['phone',390,844],['tablet',820,1180]]){
  const context=await browser.newContext({
   viewport:{width,height},screen:{width,height},serviceWorkers:'block'
  });
  await context.addInitScript(()=>{
   Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.goto(local+'?qa=1&'+name+'=1',{waitUntil:'domcontentloaded',timeout:25000});
  await page.waitForFunction(()=>document.querySelector('#bowlView')?.classList.contains('active')===true,null,{timeout:25000});
  const meta=await page.locator('meta[name="popz-app-version"]').getAttribute('content');
  assert.equal(meta,'public-v39.017');
  await page.waitForFunction(expected=>document.querySelector('#layoutModeStatus')?.textContent?.includes(expected),name==='phone'?'QA Phone Simulator':'QA Tablet Simulator',{timeout:20000});
  const onPhone=await page.evaluate(()=>document.body.classList.contains('phone-layout'));
  assert.equal(onPhone,name==='phone');

  await page.locator('[data-nav="settings"]').first().click();
  // A new installation starts with a 30-day signed-out Pro trial, no charge.
  await page.waitForFunction(()=>document.querySelector('#advancedShotTrackingEnabled')?.disabled===false,null,{timeout:10000});
  await page.evaluate(()=>{
   const input=document.querySelector('#advancedShotTrackingEnabled');
   input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.waitForFunction(()=>document.querySelector('#advancedShotTrackingEnabled')?.checked===true);
  await page.locator('[data-nav="bowl"]').first().click();
  await page.locator('#seriesLeague').fill('QA Bowling Tuesday');
  await page.locator('#seriesCenter').fill('QA Bowling Center');
  await page.locator('#seriesGameCount').fill('2');
  await page.locator('#startSeriesBtn').click();
  await page.waitForFunction(()=>!document.querySelector('#scoringArea')?.classList.contains('hidden'));
  if(name==='phone')await page.locator('#phoneScoringDetailsBtn').click();
  await page.locator('#currentLane').fill('21-22');
  await page.locator('#currentLane').dispatchEvent('change');
  await page.waitForFunction(()=>!document.querySelector('#startingLaneWrap')?.classList.contains('hidden'));
  assert.equal(await page.locator('#laneSetupRows [data-lane-setup]').count(),2);
  assert.equal(await page.locator('#singleLaneSetup').isVisible(),false);
  await page.evaluate(()=>{
   const inputs=[['21','stand','25'],['21','target','12'],['22','stand','30'],['22','target','15']];
   for(const [lane,type,value] of inputs){
    document.querySelector('#laneSetupRows [data-lane-setup="'+lane+'"] [data-board="'+type+'"]').value=value;
   }
   document.getElementById('currentBallUsed').value='Ball A';
  });
  await page.locator('#saveCurrentSetupBtn').click();
  await page.waitForFunction(()=>document.getElementById('currentSetupStatus')?.textContent.includes('Lane 21'));
  const pinsButton=page.locator('#pinPad [data-pins="10"]');
  await pinsButton.click();
  await page.waitForFunction(async()=>{
   const req=indexedDB.open('popz-bowling-public',1);
   return await new Promise(resolve=>{
    req.onsuccess=()=>{
     const db=req.result,q=db.transaction('state').objectStore('state').get('master');
     q.onsuccess=()=>{const game=q.result?.sessions?.[0]?.games?.[0];db.close();resolve(game?.frames?.[0]?.firstBallLane==='21')};
     q.onerror=()=>resolve(false);
    };req.onerror=()=>resolve(false);
   });
  },null,{timeout:10000});
  let saved=await readState(page);
  let game=saved.sessions[0].games[0];
  assert.equal(game.frames[0].firstBallLane,'21');
  assert.equal(game.frames[0].firstBallSetup.standBoard,25);
  assert.equal(game.frames[0].firstBallSetup.targetBoard,12);
  assert.equal(game.laneSetups['22'].standBoard,30);
  await pinsButton.click();
  await page.waitForFunction(async()=>{
   const req=indexedDB.open('popz-bowling-public',1);
   return await new Promise(resolve=>{
    req.onsuccess=()=>{
     const db=req.result,q=db.transaction('state').objectStore('state').get('master');
     q.onsuccess=()=>{const f=q.result?.sessions?.[0]?.games?.[0]?.frames?.[1];db.close();resolve(f?.firstBallLane==='22')};
     q.onerror=()=>resolve(false);
    };req.onerror=()=>resolve(false);
   });
  },null,{timeout:10000});
  saved=await readState(page);
  game=saved.sessions[0].games[0];
  assert.equal(game.frames[1].firstBallLane,'22');
  assert.equal(game.frames[1].firstBallSetup.standBoard,30);
  assert.equal(game.frames[1].firstBallSetup.targetBoard,15);
  // Finish synthetic strike game in this isolated QA profile, no customer data.
  for(let n=2;n<12;n++){
   await pinsButton.click();
   const count=n+1;
   await page.waitForFunction(async expected=>{
    const req=indexedDB.open('popz-bowling-public',1);
    return await new Promise(resolve=>{
     req.onsuccess=()=>{
      const db=req.result,q=db.transaction('state').objectStore('state').get('master');
      q.onsuccess=()=>{const frames=q.result?.sessions?.[0]?.games?.[0]?.frames||[];db.close();resolve(frames.reduce((sum,f)=>sum+(f.rolls?.length||0),0)>=expected)};
      q.onerror=()=>resolve(false);
     };req.onerror=()=>resolve(false);
    });
   },count,{timeout:10000});
  }
  await page.locator('#pinPad [data-new-game]').click();
  await page.waitForFunction(async()=>{
   const req=indexedDB.open('popz-bowling-public',1);
   return await new Promise(resolve=>{
    req.onsuccess=()=>{const db=req.result,q=db.transaction('state').objectStore('state').get('master');q.onsuccess=()=>{const s=q.result?.sessions?.[0];db.close();resolve(s?.games?.length===2&&s.games[1].startingLane==='22')}};
    req.onerror=()=>resolve(false);
   });
  },null,{timeout:10000});
  assert.equal((await readState(page)).sessions[0].games[1].laneSetups['21'].standBoard,25);
  await page.locator('[data-nav="dashboard"]').first().click();
  await page.waitForFunction(()=>document.querySelector('#proBallBreakdown .breakdown-row')!==null,null,{timeout:11000});
  assert.equal(await page.locator('#proAnalyticsLock').isVisible(),false);
  assert.equal(await page.locator('#proBallBreakdown .breakdown-row').count(),1);
  assert.ok(await page.locator('#proLineBreakdown .breakdown-row').count()>=2);
  assert.match(await page.locator('#overallEvaluation').textContent(),/Early|Building|Overall Bowling Evaluation/i);
  assert.equal(errors.length,0,'No page errors during '+name+': '+errors.join(' | '));
  console.log(name.toUpperCase()+'_PASS: correct lane-specific first balls, Pro analytics, stats evaluation, '+(name==='phone'?'compact phone':'full tablet')+' layout');

  // Revert to Free only inside this disposable QA profile; history must remain.
  await page.evaluate(async()=>{
   const req=indexedDB.open('popz-bowling-public',1);
   await new Promise((ok,no)=>{req.onsuccess=ok;req.onerror=no});
   const db=req.result,tx=db.transaction('state','readwrite'),store=tx.objectStore('state');
   const val=await new Promise((ok,no)=>{const r=store.get('master');r.onsuccess=()=>ok(r.result);r.onerror=no});
   val.trialStartedAt='2026-01-01T00:00:00.000Z';
   val.trialLastSeenAt='2027-01-31T00:00:00.000Z';
   store.put(val,'master');
   await new Promise((ok,no)=>{tx.oncomplete=ok;tx.onerror=no});
   db.close();
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#bowlView')?.classList.contains('active')===true,null,{timeout:15000});
  await page.locator('[data-nav="dashboard"]').first().click();
  await page.waitForFunction(()=>!document.querySelector('#proAnalyticsLock')?.classList.contains('hidden'),null,{timeout:15000});
  assert.equal(await page.locator('#proAnalyticsLock').isVisible(),true);
  assert.equal(await page.locator('#proAnalyticsContent').isVisible(),false);
  assert.equal((await readState(page)).sessions.length,1,'Free fallback retains bowling history');
  console.log(name.toUpperCase()+'_FREE_FALLBACK_PASS: Pro analytics locked, scoring history kept');
  await context.close();
 }
}finally{await browser.close()}
