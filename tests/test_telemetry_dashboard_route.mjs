import assert from'node:assert/strict';
import{onRequestGet,onRequestPost}from'../functions/telemetry-dashboard.js';

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
assert.equal(res.status,200,'browser request should receive the HTTPS login page instead of a Basic Auth challenge');
assert.match(await res.text(),/Popz Bowling Telemetry/);
assert.equal(prepared,0,'login page must not touch telemetry D1');

res=await onRequestPost({
 request:new Request('https://popzbowling.com/telemetry-dashboard',{
  method:'POST',
  headers:{'content-type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({password:'wrong'})
 }),
 env
});
assert.equal(res.status,401);
assert.match(await res.text(),/password was not accepted/i);
assert.equal(prepared,0,'bad login must not touch telemetry D1');

res=await onRequestPost({
 request:new Request('https://popzbowling.com/telemetry-dashboard',{
  method:'POST',
  headers:{'content-type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({password:'secret123'})
 }),
 env
});
assert.equal(res.status,303);
assert.equal(res.headers.get('location'),'/telemetry-dashboard');
const setCookie=res.headers.get('set-cookie')||'';
assert.match(setCookie,/popz_telemetry_session=/);
assert.match(setCookie,/HttpOnly/);
assert.match(setCookie,/Secure/);
assert.match(setCookie,/SameSite=Strict/);
const cookie=setCookie.split(';')[0];

res=await onRequestGet({request:new Request('https://popzbowling.com/telemetry-dashboard',{headers:{cookie}}),env});
assert.equal(res.status,503,'valid session cookie should reach the dashboard and contain D1 failures');
assert.match(await res.text(),/Telemetry dashboard temporarily unavailable/);

res=await onRequestGet({request:new Request('https://popzbowling.com/telemetry-dashboard',{headers:{authorization:auth}}),env});
assert.equal(res.status,503,'Basic Auth fallback must remain valid for the maintenance fetch script');
const body=await res.text();
assert.match(body,/Telemetry dashboard temporarily unavailable/);
assert.match(body,/Production bowling data and scoring are not affected/);
console.log('telemetry dashboard browser-login and error-boundary tests passed');
