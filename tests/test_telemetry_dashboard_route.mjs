import assert from'node:assert/strict';
import{onRequestGet}from'../functions/telemetry-dashboard.js';

const auth='Basic '+Buffer.from('michael:secret123').toString('base64');
let prepared=0;
const env={
 TELEMETRY_DASHBOARD_PASSWORD:'secret123',
 TELEMETRY_DB:{
  prepare(sql){prepared++;return{sql}},
  async batch(){throw new Error('simulated transient D1 failure')}
 }
};

let res=await onRequestGet({request:new Request('https://popzbowling.com/telemetry-dashboard'),env});
assert.equal(res.status,401);
assert.equal(prepared,0,'unauthorized requests must not touch telemetry D1');

res=await onRequestGet({request:new Request('https://popzbowling.com/telemetry-dashboard',{headers:{authorization:auth}}),env});
assert.equal(res.status,503,'dashboard D1 failures must be contained instead of surfacing as Worker 1101');
const body=await res.text();
assert.match(body,/Telemetry dashboard temporarily unavailable/);
assert.match(body,/Production bowling data and scoring are not affected/);
console.log('telemetry dashboard route error-boundary tests passed');
