import assert from'node:assert/strict';
import{readFileSync}from'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),app=read('app.js');

assert.match(html,/id="dashboardProtectionBtn"[^>]*>Protect My Data</);
assert.doesNotMatch(html,/id="backupNowHero"/);
assert.match(html,/id="googleSyncSetting"/);
assert.match(html,/Extra manual backup \/ recovery copy/);
assert.match(app,/Google Sync: Up to date across your devices\./);
assert.match(app,/Google Sync Issue — Retry/);
assert.match(app,/Your bowling history is currently stored on this device only\./);
assert.match(app,/handleDashboardProtection/);
assert.match(app,/dashboardProtectionBtn.*handleDashboardProtection/);
assert.match(app,/googleSyncSetting.*scrollIntoView/);
console.log('Dashboard protection status and manual-backup placement tests passed');
