import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const base=resolve(import.meta.dirname,'..');
const read=p=>readFileSync(resolve(base,p),'utf8');
const root=read('index.html'),marketing=read('marketing/professional-site/index.html');
const manifest=JSON.parse(read('manifest.webmanifest'));
const sw=read('service-worker.js');
assert.match(root,/id="installGate"/);
assert.match(root,/id="exploreWebsiteBtn"[^>]*href="\/features\/"/);
assert.match(root,/id="installGateBtn"[^>]*>Install Popz Bowling</);
assert.match(root,/id="appShell"/);
assert.equal(manifest.start_url,'./');
assert.equal(manifest.scope,'./');
assert.match(sw,/const shellURL=/);
assert.match(marketing,/<title>Popz Bowling Stats/);
assert.match(marketing,/rel="canonical" href="https:\/\/popzbowling.com\/features\/"/);
assert.doesNotMatch(marketing,/noindex,nofollow|LOCAL DESIGN PREVIEW|NOT PUBLISHED/);
assert.match(marketing,/href="https:\/\/popzbowling.com\/"/);
assert.match(marketing,/\$9\.99/);
assert.match(marketing,/30.day/i);
assert.match(marketing,/Popz-Bowling-League-Night-Official-Commercial.mp4/);
for(const a of [...marketing.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)]){
  assert.ok(existsSync(resolve(base,'marketing/professional-site',a[1])),'missing '+a[1]);
}
assert.equal(existsSync(resolve(base,'marketing/professional-site/index.html')),true);
console.log('Professional site and two-choice browser gate preserve installed scoring and marketing asset links');

const oldMovie='marketing/professional-site/assets/Popz-Bowling-Demo.mp4';
assert.equal(existsSync(resolve(base,oldMovie)),false,'old demo must not ship');
assert.equal(existsSync(resolve(base,'marketing/professional-site/assets/YouTube-Pro-Focused-Thumbnail.png')),false,'old video thumbnail must not ship');
assert.match(marketing,/00:53.*WATCH THE COMMERCIAL/);
assert.match(marketing,/ClaviCrazy/);
assert.match(marketing,/Popz-Bowling-League-Night-Poster.jpg/);
