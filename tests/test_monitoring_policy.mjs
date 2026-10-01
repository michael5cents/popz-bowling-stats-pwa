import assert from'node:assert/strict';
import{issueKey,runtimeDiagnosticOnly,alertCooldownFor,shouldSendAlert}from'../monitoring/alert-policy.mjs';

const runtime=[{name:'Health API',message:'status=degraded ok=false'},{name:'Runtime errors',message:'recent client runtime error reported'}];
const outage=[{name:'Homepage',message:'HTTP 503'}];
const normal=15*60_000,runtimeCd=60*60_000,at=1_000_000;

assert.equal(runtimeDiagnosticOnly(runtime),true);
assert.equal(runtimeDiagnosticOnly(outage),false);
assert.equal(alertCooldownFor(runtime,normal,runtimeCd),runtimeCd);
assert.equal(alertCooldownFor(outage,normal,runtimeCd),normal);
assert.equal(shouldSendAlert({issues:runtime,lastIssues:[],lastAlertAt:0,now:at,normalCooldown:normal,runtimeCooldown:runtimeCd}),true);
assert.equal(shouldSendAlert({issues:runtime,lastIssues:runtime,lastAlertAt:at,now:at+20*60_000,normalCooldown:normal,runtimeCooldown:runtimeCd}),false);
assert.equal(shouldSendAlert({issues:runtime,lastIssues:runtime,lastAlertAt:at,now:at+60*60_000,normalCooldown:normal,runtimeCooldown:runtimeCd}),true);
assert.equal(shouldSendAlert({issues:outage,lastIssues:outage,lastAlertAt:at,now:at+20*60_000,normalCooldown:normal,runtimeCooldown:runtimeCd}),true);
assert.equal(issueKey([{name:'B',message:'2'},{name:'A',message:'1'}]),'A=1|B=2');
console.log('Telegram alert policy tests passed');
