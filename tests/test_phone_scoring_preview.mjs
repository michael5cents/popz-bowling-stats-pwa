import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import * as scoring from '../scoring.mjs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8').split('\n');
const source=name=>app.find(line=>line.startsWith('function '+name+'('));
function element(){const classes=new Set(),attrs={};return {innerHTML:'',textContent:'',disabled:false,scrollLeft:0,classList:{add:value=>classes.add(value),remove:value=>classes.delete(value),contains:value=>classes.has(value),toggle(value,on){if(on??!classes.has(value)){classes.add(value);return true}classes.delete(value);return false}},setAttribute:(key,value)=>{attrs[key]=value},getAttribute:key=>attrs[key]}}
function harness(compact=true){
 const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)};
 const game={id:'game',frames:scoring.emptyFrames()},session={id:'a',bowlerName:'A',gameCount:3,games:[game]};
 const context={...scoring,$:get,compactPhoneActive:()=>compact,pendingLeave:null,detailedScoring:()=>false,groupActive:()=>false,groupCurrentGameComplete:()=>true,groupTargetComplete:()=>false,activeSession:()=>session,sessionBowlerName:s=>s.bowlerName,sessionActiveGame:s=>s.games[0],renderPinDeck:()=>{},esc:value=>String(value),state:{activeSessionId:'a'},groupSessions:()=>[session]};
 vm.createContext(context);for(const name of ['renderPhoneStatsFilterSummary','setPhoneStatsFilters','renderPhoneKeypadTools','renderPinPad','renderGroupTurnBar'])vm.runInContext(source(name),context);
 return {context,game,session,get};
}
const keys=h=>[...h.get('pinPad').innerHTML.matchAll(/<button class="([^"]*)" data-pins="(\d+)"( disabled)?>(.*?)<\/button>/g)].map(match=>({pins:Number(match[2]),disabled:!!match[3],label:match[4]}));

test('phone keypad keeps ten fixed pin slots while disabling impossible spare counts',()=>{
 const h=harness();h.context.renderPinPad(h.game);
 assert.deepEqual(keys(h).map(key=>key.pins),[1,2,3,4,5,6,7,8,9,10]);
 assert.equal(keys(h).some(key=>key.disabled),false);assert.equal(keys(h).at(-1).label,'X');
 assert.equal(h.get('phoneMissBtn').disabled,false);assert.equal(h.get('phoneSplitBtn').disabled,true);
 scoring.addRoll(h.game,7);h.context.renderPinPad(h.game);
 assert.deepEqual(keys(h).map(key=>key.pins),[1,2,3,4,5,6,7,8,9,10]);
 assert.deepEqual(keys(h).filter(key=>!key.disabled).map(key=>key.pins),[1,2,3]);assert.equal(keys(h)[2].label,'/');
 assert.equal(h.get('phoneSplitBtn').disabled,false);assert.doesNotMatch(h.get('pinPad').innerHTML,/data-pins="0"|data-toggle-split/);
});

test('phone utility Split follows existing eligibility and conveys its state accessibly',()=>{
 const h=harness();scoring.addRoll(h.game,7);h.game.frames[0].split=true;h.context.renderPinPad(h.game);
 assert.equal(h.get('phoneSplitBtn').textContent,'✓ Split');assert.equal(h.get('phoneSplitBtn').getAttribute('aria-label'),'Clear Split');assert.equal(h.get('phoneSplitBtn').getAttribute('aria-pressed'),'true');
 h.context.detailedScoring=()=>true;h.context.pendingLeave={gameId:'game',frameIndex:0,expected:3};h.context.renderPinPad(h.game);
 assert.equal(h.get('phoneMissBtn').disabled,true);assert.equal(h.get('phoneSplitBtn').disabled,true);assert.equal(h.get('pinPad').classList.contains('hidden'),true);
});

test('phone completion actions span the keypad and retain their existing handler data attributes',()=>{
 const h=harness();for(let i=0;i<12;i++)scoring.addRoll(h.game,10);
 h.context.renderPinPad(h.game);assert.equal(h.get('pinPad').innerHTML,'<button class="special phone-next-action" data-new-game="1">Start Next Game</button>');
 h.session.gameCount=1;h.context.renderPinPad(h.game);assert.equal(h.get('pinPad').innerHTML,'<button class="special phone-next-action" data-finish-series="1">Finish Series</button>');
 h.context.groupActive=()=>true;h.context.groupCurrentGameComplete=()=>false;h.context.renderPinPad(h.game);assert.equal(h.get('pinPad').innerHTML,'<button class="special phone-next-action" data-next-bowler="1">Next Bowler</button>');
 assert.equal(h.get('phoneMissBtn').disabled,true);assert.equal(h.get('phoneSplitBtn').disabled,true);
});

test('Full Layout retains its existing numeric, inline Split and completion markup',()=>{
 const h=harness(false);h.context.renderPinPad(h.game);
 assert.deepEqual(keys(h).map(key=>key.pins),[0,1,2,3,4,5,6,7,8,9,10]);assert.equal(keys(h)[0].label,'–');assert.doesNotMatch(h.get('pinPad').innerHTML,/disabled|phone-/);
 scoring.addRoll(h.game,9);h.context.renderPinPad(h.game);
 assert.equal(h.get('pinPad').innerHTML,'<button class="quick-split " data-toggle-split="1">Mark Split</button><button class="" data-pins="0">–</button><button class="special" data-pins="1">/</button>');
 h.game.frames=scoring.emptyFrames();for(let i=0;i<12;i++)scoring.addRoll(h.game,10);h.context.renderPinPad(h.game);
 assert.equal(h.get('pinPad').innerHTML,'<button class="special" data-new-game="1">Start Next Game</button>');
});

test('collapsed phone filters preserve a visible summary and expanded accessibility state',()=>{
 const h=harness();h.get('statsFilterSummary').textContent='A (Me) • League Night • Center A';
 h.context.setPhoneStatsFilters(false);assert.equal(h.get('phoneStatsFilterSummary').textContent,'A (Me) • League Night • Center A');assert.equal(h.get('phoneStatsFiltersBtn').getAttribute('aria-expanded'),'false');assert.equal(h.get('phoneStatsFiltersLabel').textContent,'Filters');
 h.context.setPhoneStatsFilters(true);assert.equal(h.get('dashboardView').classList.contains('phone-filters-open'),true);assert.equal(h.get('phoneStatsFiltersBtn').getAttribute('aria-expanded'),'true');assert.equal(h.get('phoneStatsFiltersLabel').textContent,'Hide Filters');
 assert.equal(h.get('statsFilterSummary').textContent,'A (Me) • League Night • Center A');
});

test('phone rotation brings only the active bowler tab into its horizontal container',()=>{
 for(const compact of [true,false]){
  const h=harness(compact),host=h.get('groupBowlerTabs'),moves=[];h.context.groupActive=()=>true;
  host.getBoundingClientRect=()=>({left:0,right:280});host.querySelector=()=>({getBoundingClientRect:()=>({left:350,right:454})});host.scrollTo=options=>moves.push(options);
  h.context.renderGroupTurnBar();assert.equal(moves.length,compact?1:0);if(compact){assert.equal(moves[0].left,174);assert.equal(moves[0].behavior,'auto')}
 }
});
