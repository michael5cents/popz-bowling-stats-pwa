import assert from 'node:assert/strict';
import {test} from 'node:test';
import {emptyFrames,addRoll,runningLeagueAverage} from '../scoring.mjs';
const game=()=>{const g={frames:emptyFrames()};for(let i=0;i<10;i++){addRoll(g,9);addRoll(g,0)}return g};
const session=(date,enteringAverage)=>({league:'League',date,gameCount:3,enteringAverage,games:[game()]});

test('blank early entering averages do not hide a later book average',()=>{
 for(const blank of [null,undefined,'','   ']){
  const rows=[session('2026-10-01',blank),session('2026-10-08',180.8)];
  const out=runningLeagueAverage(rows);
  assert.equal(out.seedAverage,180);
  assert.equal(out.currentAverage,(180*3+180)/5);
  assert.equal(runningLeagueAverage(rows,{mode:'establish',games:9}).currentAverage,180);
  assert.equal(runningLeagueAverage(rows,{mode:'establish',games:2}).currentAverage,90);
 }
});

test('zero is a real entering average; all missing averages remain unknown',()=>{
 assert.equal(runningLeagueAverage([session('2026-10-01',0),session('2026-10-08',180)]).seedAverage,0);
 assert.equal(runningLeagueAverage([session('2026-10-01',null),session('2026-10-08','')]),null);
});
