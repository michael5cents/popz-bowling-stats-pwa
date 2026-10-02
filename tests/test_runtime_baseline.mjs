import assert from'node:assert/strict';
import{onRequestPost}from'../functions/api/runtime.js';

const inserts=[];
const db={
 prepare(sql){return{bind:(...values)=>({sql,values})}},
 async batch(rows){inserts.push(...rows);return rows.map(()=>({success:true}))}
};
const event=version=>({id:'rte-baseline-123',runtimeId:'run-baseline-123',bootId:'boot-baseline-123',event:'boot_started',appVersion:version,occurredAt:'2026-10-02T14:00:00Z',installMode:'installed',platform:'android'});
const post=async version=>{
 const request=new Request('https://example.test/api/runtime',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({events:[event(version)]})});
 const response=await onRequestPost({request,env:{RUNTIME_DB:db}});
 return await response.json();
};
assert.deepEqual(await post('public-v39.003'),{ok:true,accepted:1,stored:0});
assert.equal(inserts.length,0);
assert.deepEqual(await post('public-v39.004'),{ok:true,accepted:1,stored:1});
assert.equal(inserts.length,1);
console.log('runtime fresh-baseline version gate tests passed');
