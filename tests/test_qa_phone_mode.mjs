import assert from'node:assert/strict';
import{readFileSync}from'node:fs';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const telemetry=readFileSync(new URL('../telemetry-client.mjs',import.meta.url),'utf8');
const runtime=readFileSync(new URL('../runtime-monitor.js',import.meta.url),'utf8');

assert.match(app,/q\.get\('qa'\)==='1'&&q\.get\('phone'\)==='1'/);
assert.match(app,/installGateRequired=.*!qaPhoneMode\(\)/);
assert.match(app,/qaPhoneMode\(\)\?LAYOUT_MODES\.COMPACT_PHONE/);
assert.match(app,/QA Phone Simulator.*telemetry suppressed/);
assert.doesNotMatch(index,/id="telemetryEnabled"/);
assert.match(index,/Beta telemetry: On/);
assert.match(telemetry,/q\.get\('qa'\)==='1'/);
assert.doesNotMatch(telemetry,/q\.get\('telemetry'\)==='off'/);
assert.match(runtime,/q\.get\('qa'\)==='1'/);
assert.doesNotMatch(runtime,/q\.get\('telemetry'\)==='off'/);
console.log('QA phone mode and mandatory beta telemetry structure tests passed');
