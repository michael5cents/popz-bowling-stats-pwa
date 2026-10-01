import assert from'node:assert/strict';
import{onRequestGet}from'../functions/api/health.js';

const db={prepare(sql){return{async first(){return sql.includes('COUNT(*)')?{value:0}:{value:1}}}}};
const env={TELEMETRY_DB:db,LIVE_SHARE_DB:db,RUNTIME_DB:db,ASSETS:{async fetch(){return new Response(JSON.stringify({version:'public-v37.002'}),{status:200,headers:{'content-type':'application/json'}})}}};
const res=await onRequestGet({request:new Request('https://popzbowling.com/api/health'),env});
assert.equal(res.status,200);
const body=await res.json();
assert.equal(body.version,'public-v37.002');
assert.equal(body.ok,true);
assert.equal(body.status,'ok');
console.log('Health endpoint dynamically reports patch version from latest-version.json');
