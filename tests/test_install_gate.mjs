import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),css=read('style.css'),app=read('app.js');

assert.match(html,/body class="install-check"/);
assert.match(html,/id="installGate"/);
assert.match(html,/id="installGateBtn"[^>]*>Install Popz Bowling</);
assert.match(css,/\.install-check #appShell,\.install-required #appShell\{display:none!important\}/);
assert.match(css,/\.install-required \.install-gate\{display:grid\}/);
assert.match(app,/isProductionWebHost=.*popzbowling/);
assert.match(app,/installGateRequired=.*isProductionWebHost\(\).*isInstalled\(\)/);
assert.match(app,/if\(installGateRequired\(\)\)\{showInstallGate\(\);.*setupServiceWorkerUpdates\(true\);window\.PopzRuntimeMonitor\?\.ready\(\);return\}/);
const init=app.slice(app.indexOf('async function init()'));
assert.ok(init.indexOf('installGateRequired()')<init.indexOf('state=await loadState()'),'install gate must run before bowling state loads');
assert.ok(init.indexOf('installGateRequired()')<init.indexOf('configureTelemetry'),'install gate must run before adoption telemetry config');
assert.match(app,/On iPhone\/iPad:\\n1\. Open this page in Safari/);
assert.match(app,/Chrome menu > Install app \/ Add to Home screen/);
console.log('Production install-gate structure and early-boot isolation tests passed');
