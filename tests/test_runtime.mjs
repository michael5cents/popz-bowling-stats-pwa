import assert from'node:assert/strict';
import{normalizeRuntimeEvent,normalizeRuntimeBatch,sanitizeRuntimeText}from'../runtime.mjs';

const base={id:'rte-12345678',runtimeId:'run-12345678',bootId:'boot-12345678',event:'boot_started',appVersion:'public-v35',occurredAt:'2026-09-30T16:00:00Z',installMode:'installed',platform:'android'};
const boot=normalizeRuntimeEvent({...base,bowlerName:'Must not survive',score:300});
assert.equal(boot.event,'boot_started');
assert.equal(boot.installMode,'installed');
assert.equal('bowlerName'in boot,false);
assert.equal('score'in boot,false);

const err=normalizeRuntimeEvent({...base,id:'rte-err-12345678',event:'window_error',errorKind:'TypeError',errorMessage:'Failed https://popzbowling.com/live/#abcdef1234567890abcdef1234567890 for Person@example.com token abcdef1234567890abcdef1234567890',source:'https://popzbowling.com/app.js?v=35',line:77,col:9});
assert.equal(err.errorKind,'TypeError');
assert.match(err.errorMessage,/\[url\]/);
assert.match(err.errorMessage,/\[email\]/);
assert.doesNotMatch(err.errorMessage,/abcdef1234567890abcdef1234567890/);
assert.match(err.source,/\[url\]/);
assert.equal(err.line,77);
assert.equal(err.col,9);

assert.equal(normalizeRuntimeEvent({...base,event:'series_started'}),null);
assert.equal(normalizeRuntimeEvent({...base,id:'bad id'}),null);
assert.equal(sanitizeRuntimeText('a   b'),'a b');

const many=Array.from({length:25},(_,i)=>({...base,id:'rte-batch-'+String(i).padStart(8,'0')}));
assert.equal(normalizeRuntimeBatch({events:many}).length,20);
console.log('runtime diagnostic privacy and normalization tests passed');
