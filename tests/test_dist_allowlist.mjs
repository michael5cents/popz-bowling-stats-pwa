import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import {resolve,relative} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const build=resolve(root,'scripts/build-dist.sh');
execFileSync(build,{cwd:root,stdio:'pipe'});

const wrangler=readFileSync(resolve(root,'wrangler.toml'),'utf8');
assert.match(wrangler,/pages_build_output_dir\s*=\s*"dist"/);

const dist=resolve(root,'dist');
const walk=dir=>readdirSync(dir).flatMap(name=>{
  const full=resolve(dir,name),rel=relative(dist,full).replaceAll('\\','/');
  return statSync(full).isDirectory()?walk(full):[rel];
}).sort();

const required=[
  '_headers',
  'app.js',
  'apple-touch-icon.png',
  'backup-validation.mjs',
  'billing-client.mjs',
  'cloud-sync-core.mjs',
  'cloud-sync.mjs',
  'entitlements.mjs',
  'trial-policy.mjs',
  'entry.js',
  'history.mjs',
  'icon-192.png',
  'icon-512.png',
  'index.html',
  'terms.html',
  'privacy.html',
  'refund-policy.html',
  'latest-version.json',
  'robots.txt',
  'sitemap.xml',
  'features/index.html',
  'features/styles.css',
  'features/script.js',
  'features/assets/00-install-gate-phone.png',
  'features/assets/04-scoring-progress-phone.png',
  'features/assets/06b-series-complete-phone.png',
  'features/assets/07-stats-phone.png',
  'features/assets/08-history-phone.png',
  'features/assets/12-pro-team-scoring.png',
  'features/assets/14-pro-google-sync.png',
  'features/assets/15-pro-lane-pair-tracking.png',
  'features/assets/16-pro-ball-line-results.png',
  'features/assets/17-pro-lane-transition-analysis.png',
  'features/assets/18-pro-performance-evaluations.png',
  'features/assets/Popz-Bowling-League-Night-Safari-Compatible.mp4',
  'features/assets/Popz-Bowling-League-Night-Poster.jpg',
  'features/assets/app-icon.png',
  'features/assets/bowling-lanes-anna-shvets-pexels-5952998.jpg',
  'layout-mode.mjs',
  'live-share-client.mjs',
  'live-share-ui.mjs',
  'live-share.mjs',
  'live/index.html',
  'live/viewer.css',
  'live/viewer.mjs',
  'manifest.webmanifest',
  'qa-tablet.webmanifest',
  'qa-ipad/index.html',
  'multiplayer.mjs',
  'payment/cancel/index.html',
  'payment/success/index.html',
  'roll-undo.mjs',
  'runtime-monitor.js',
  'scoring.mjs',
  'transition-analytics.mjs',
  'stats-evaluation.mjs',
  'service-worker.js',
  'style.css',
  'telemetry-client.mjs',
  'telemetry-milestones.mjs',
  'telemetry.mjs',
  'transfer.mjs',
  'update.mjs'
].sort();

assert.deepEqual(walk(dist),required,'dist must contain only the exact approved runtime allowlist');

const forbidden=[
  'README.md','TELEMETRY-ACCESS.md','PRO-PLAN.md','LIVE-SHARING.md',
  'COMMERCIALIZATION-ROADMAP.md','USER-GUIDE.md','wrangler.toml','.firebaserc',
  'firebase.json','firestore.rules','firestore.indexes.json','scripts','monitoring',
  'migrations','live-migrations','runtime-migrations','docs','tests','tools','functions',
  'dashboard.mjs','runtime.mjs','live-share-server.mjs','mac-founder-admin'
];
for(const rel of forbidden)assert.equal(existsSync(resolve(dist,rel)),false,rel+' must not be published');

const sw=readFileSync(resolve(dist,'service-worker.js'),'utf8');
const refs=[...sw.matchAll(/['"]\.\/([^'"]*)['"]/g)].map(m=>m[1]);
for(const ref of refs){
  const clean=ref.split('?')[0];
  if(!clean)assert.ok(existsSync(resolve(dist,'index.html')),'root shell requires index.html');
  else assert.ok(existsSync(resolve(dist,clean)),'service-worker runtime asset missing from dist: '+clean);
}

const index=readFileSync(resolve(dist,'index.html'),'utf8');
for(const ref of ['manifest.webmanifest','style.css','runtime-monitor.js','entry.js']){
  assert.match(index,new RegExp(ref.replace('.','\\.')),'index runtime reference must exist: '+ref);
  assert.ok(existsSync(resolve(dist,ref)),'index runtime asset missing from dist: '+ref);
}

for(const ref of ['index.html','viewer.css','viewer.mjs'])
  assert.ok(existsSync(resolve(dist,'live',ref)),'live spectator runtime asset missing: '+ref);

console.log('Allowlisted dist build, Wrangler target, service-worker bundle, and live spectator assets verified');
