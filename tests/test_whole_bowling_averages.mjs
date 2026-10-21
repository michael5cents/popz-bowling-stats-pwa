import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('every bowling-average UI uses whole number formatting, without changing percent precision',()=>{
 const app=source('app.js'),viewer=source('live/viewer.mjs'),markup=source('index.html');
 assert.match(app,/function fmtAverage\(v\)/);
 for(const v of ['avg','suggested','st.average','r.average','ds.average','run.seedAverage','run.latestAverage','run.currentAverage'])
  assert.doesNotMatch(app,new RegExp(v.replaceAll('.','\\.')+'\\.toFixed\\(1\\)'),'decimal average remains: '+v);
 assert.match(app,/Avg \${fmtAverage\(s.enteringAverage\)} = \${hdcp}\/game/);
 assert.match(app,/s.enteringAverage=wholeBowlingAverage\(avg\)/);
 assert.match(app,/enteringAverage:wholeBowlingAverage\(enteringAverage\)/);
 assert.match(app,/fmtAverage\(st.average\)/);
 assert.match(app,/fmtAverage\(run.currentAverage\)/);
 assert.match(app,/fmtAverage\(suggested\)/);
 assert.match(viewer,/fmtAverage\(st.average\)/);
 assert.match(viewer,/Number\(v\).toFixed\(1\)\+'%'/);
 assert.match(app,/v.toFixed\(1\)\}\%/);
 assert.doesNotMatch(markup,/step="0\.1"/);
 assert.doesNotMatch(app,/step="0\.1"/);
});
