import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),app=read('app.js');

assert.match(html,/<section id="dashboardView" class="view">/,'Stats must not be the initial view');
assert.match(html,/<section id="bowlView" class="view active">/,'Bowl must be the initial view');
assert.match(html,/<button class="nav-btn" data-nav="dashboard">Stats<\/button><button class="nav-btn active" data-nav="bowl">Bowl<\/button>/,'Bowl nav must be active initially');
assert.match(app,/function reopenApp\(\).*showView\('bowl'\)/,'Reopen App must return to Bowl');
assert.match(app,/startTelemetry\(\);showView\('bowl'\);initCloudSync/,'initialized installed app must explicitly select Bowl');
console.log('Universal Bowl landing tests passed');
