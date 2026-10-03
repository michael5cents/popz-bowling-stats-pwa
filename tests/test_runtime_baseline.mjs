import assert from'node:assert/strict';
import{onRequestPost}from'../functions/api/runtime.js';

const inserts=[];
const db={
 prepare(sql){return{bind:(...values)=>({sql,values})}},
 async batch(rows){inserts.push(...rows);return rows.map(()=>({success:true}))}
};
const event=(version,{at='2026-10-02T15:00:00Z',mode='installed'}={})=>({id:'rte-baseline-123-'+version.replace(/\W/g,''),runtimeId:'run-baseline-123',bootId:'boot-baseline-123',event:'boot_started',appVersion:version,occurredAt:at,installMode:mode,platform:'android'});
const post=async (version,options={})=>{
 const request=new Request('https://example.test/api/runtime',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({events:[event(version,options)]})});
 const response=await onRequestPost({request,env:{RUNTIME_DB:db}});
 return await response.json();
};
assert.deepEqual(await post('public-v39.003',{at:'2026-10-02T14:44:59Z'}),{ok:true,accepted:1,stored:0});
assert.equal(inserts.length,0,'pre-reset legacy runtime rows stay excluded');
assert.deepEqual(await post('public-v39.003',{at:'2026-10-02T15:00:00Z'}),{ok:true,accepted:1,stored:1});
assert.equal(inserts.length,1,'fresh legacy installed runtime rows are retained');
assert.deepEqual(await post('public-v39.003',{at:'2026-10-02T15:00:00Z',mode:'browser'}),{ok:true,accepted:1,stored:0});
assert.equal(inserts.length,1,'legacy browser runtime traffic stays excluded');
assert.deepEqual(await post('public-v39.004',{at:'2026-10-02T14:00:00Z'}),{ok:true,accepted:1,stored:1});
assert.equal(inserts.length,2,'current baseline version remains accepted');
console.log('runtime fresh-baseline timestamp and installed-client compatibility tests passed');
