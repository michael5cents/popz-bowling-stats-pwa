import assert from'node:assert/strict';
import{readFileSync}from'node:fs';

const monitor=readFileSync(new URL('../monitoring/telegram-health-monitor.mjs',import.meta.url),'utf8');
const source=monitor.match(/\^public-v\\d\+\(\?:\\\.\\d\+\)\*\$/);
assert.ok(source,'monitor must accept numeric patch versions such as public-v37.002');
assert.equal(monitor.includes('entry.js?v=${n}'),true,'monitor homepage check must follow the entry bootstrap');
assert.equal(monitor.includes("['Entry bootstrap',`${BASE}/entry.js?v=${n}`,`app.js?v=${n}`]"),true,'monitor must verify entry bootstrap points to the current app');
assert.equal(monitor.includes("['Main app',`${BASE}/app.js?v=${n}`,`APP_VERSION='${version}'`]"),true,'monitor must still verify the full installed app asset');

const valid=/^public-v\d+(?:\.\d+)*$/;
for(const v of['public-v37','public-v37.1','public-v37.002','public-v37.002.4'])assert.equal(valid.test(v),true,v);
for(const v of['v37.002','public-v37a','public-v37.','public-v37-beta'])assert.equal(valid.test(v),false,v);
console.log('Telegram monitor version-format tests passed');
