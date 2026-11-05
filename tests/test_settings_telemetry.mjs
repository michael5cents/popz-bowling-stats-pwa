import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { normalizeTelemetryEvent } from '../telemetry.mjs';
import { configureTelemetry, trackTelemetry, flushTelemetry, setTelemetryEnabled, startTelemetry, telemetryEnabled, telemetrySuppressed } from '../telemetry-client.mjs';
import { onRequestPost } from '../functions/api/telemetry.js';
import { renderTelemetryDashboard } from '../dashboard.mjs';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const version = app.match(/APP_VERSION='([^']+)'/)[1];
const keys = ['id','deviceId','event','appVersion','occurredAt','installMode','platform'].sort();
const dirty = { id:'evt-settings-test', deviceId:'dev-settings-test', event:'settings_viewed',
  appVersion:version, occurredAt:'2026-09-21T20:00:00Z', installMode:'installed', platform:'android',
  settings:{bowlerName:'PRIVATE_SETTINGS_SENTINEL',leagueAverageRules:{private:9}}, email:'PRIVATE_SETTINGS_SENTINEL', score:300 };
const clean = normalizeTelemetryEvent(dirty);
assert.equal(clean.event, 'settings_viewed');
assert.deepEqual(Object.keys(clean).sort(), keys);
assert.equal(JSON.stringify(clean).includes('PRIVATE_SETTINGS_SENTINEL'), false);

const storage = new Map();
globalThis.localStorage = { getItem:k=>storage.get(k)??null, setItem:(k,v)=>storage.set(k,String(v)), removeItem:k=>storage.delete(k) };
Object.defineProperty(globalThis, 'navigator', { configurable:true, value:{onLine:false,userAgent:'Android'} });
configureTelemetry({deviceId:'dev-settings-test',appVersion:version,isInstalled:()=>true});
const queue = ()=>JSON.parse(storage.get('popz-bowling-telemetry-queue-v2')||'[]');
let renders = 0;
const source = app.match(/^function showView\(name\)\{.*\}$/m)?.[0];
assert.ok(source, 'view navigation function found');
const renderSettings = ()=>{renders++};
const showView = vm.runInNewContext(source+';showView', {
  document:{body:{classList:{remove(){}}},querySelectorAll:()=>[]}, $:()=>({classList:{add(){}}}),
  trackTelemetry, renderSettings, renderHistory(){}, renderScoring(){}
});
showView('settings');
assert.equal(renders, 1);
assert.equal(queue().length, 1, 'one event on entering Settings');
assert.equal(queue()[0].event, 'settings_viewed');
assert.deepEqual(Object.keys(queue()[0]).sort(), keys);
renderSettings();
assert.equal(queue().length, 1, 'background redraw is not an extra view');
assert.doesNotMatch(app.match(/^function renderSettings\(\)\{.*\}$/m)[0], /trackTelemetry/);
assert.equal(telemetryEnabled(), true, 'beta telemetry is always enabled for normal users');
assert.doesNotMatch(index,/id="telemetryEnabled"/,'beta Settings has no telemetry opt-out control');
assert.match(index,/Beta telemetry: On/);
setTelemetryEnabled(false);
assert.equal(queue().length, 1, 'legacy disable calls cannot clear or disable beta telemetry');
showView('settings');
assert.equal(queue().length, 2, 'normal beta usage continues to queue while offline');

const inserts = [];
const db = {
  prepare(sql){ assert.match(sql, /INSERT OR IGNORE INTO telemetry_events/); return {bind:(...values)=>values} },
  async batch(rows){ inserts.push(...rows); return rows.map(()=>({success:true})) }
};
let requests = 0;
globalThis.fetch = async (url, options)=>{
  requests++;
  assert.equal(url, '/api/telemetry');
  const sent = JSON.parse(options.body).events;
  assert.equal(sent.length, 2);
  assert.deepEqual(Object.keys(sent[0]).sort(), keys);
  assert.deepEqual(Object.keys(sent[1]).sort(), keys);
  return onRequestPost({request:new Request('https://example.test/api/telemetry',options),env:{TELEMETRY_DB:db}});
};
navigator.onLine = true;
await flushTelemetry();
assert.equal(requests, 1);
assert.equal(queue().length, 0, 'successful ingestion clears the queue');
assert.equal(inserts.length, 2);
assert.ok(inserts.every(row=>row[2]==='settings_viewed'));
assert.ok(inserts.every(row=>row.length===7));
const response = await onRequestPost({
  request:new Request('https://example.test/api/telemetry',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({events:[dirty]})}),
  env:{TELEMETRY_DB:db}
});
assert.equal(response.status, 200);
assert.equal(JSON.stringify(inserts).includes('PRIVATE_SETTINGS_SENTINEL'), false);
const html = renderTelemetryDashboard({events:[{event:'settings_viewed',events:1,devices:1}]});
assert.match(html, /<td>settings_viewed<\/td><td>1<\/td><td>1<\/td>/);
assert.doesNotMatch(html, /dev-settings-test|PRIVATE_SETTINGS_SENTINEL/);

// Automated/headless QA must never enter the adoption telemetry dataset.
navigator.onLine = false;
Object.defineProperty(globalThis, 'location', { configurable:true, value:{search:''} });
navigator.webdriver = false;
navigator.userAgent = 'Android';
trackTelemetry('app_open');
assert.equal(queue().length, 1, 'normal offline telemetry still queues');
location.search = '?qa=1';
assert.equal(telemetrySuppressed(), true, 'qa=1 explicitly suppresses telemetry');
startTelemetry();
assert.equal(queue().length, 0, 'QA mode clears stale queued test telemetry');
trackTelemetry('app_open');
assert.equal(queue().length, 0, 'QA mode does not queue events');
location.search = '';
navigator.webdriver = true;
assert.equal(telemetrySuppressed(), true, 'WebDriver automation is suppressed');
trackTelemetry('app_open');
assert.equal(queue().length, 0, 'WebDriver automation does not queue events');
navigator.webdriver = false;
navigator.userAgent = 'Mozilla/5.0 HeadlessChrome/153.0';
assert.equal(telemetrySuppressed(), true, 'HeadlessChrome is suppressed');
trackTelemetry('app_open');
assert.equal(queue().length, 0, 'HeadlessChrome does not queue events');
navigator.userAgent = 'Android';
location.search = '?telemetry=off';
assert.equal(telemetrySuppressed(), false, 'public beta users cannot disable telemetry with a URL flag');
location.search = '?qa=1';
assert.equal(telemetrySuppressed(), true, 'internal qa=1 remains the explicit non-telemetry test path');

console.log('Settings navigation, mandatory beta telemetry, privacy, offline queue, QA suppression, ingestion and dashboard tests passed');
