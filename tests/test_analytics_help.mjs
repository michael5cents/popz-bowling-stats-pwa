import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const sw=readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
const help=html.split('<section id="helpView"',2)[1]?.split('</section>',1)[0]||'';
assert(help,'Help view must exist');
const cards=[...help.matchAll(/<article class="help-card"><span>(\d+)<\/span><div><h3>([^<]+)<\/h3><p>(.*?)<\/p><\/div><\/article>/gs)];
assert.equal(cards.length,19,'the existing 16 cards plus three analytics cards are all in the printable Help view');
assert.deepEqual(cards.map(x=>Number(x[1])),Array.from({length:19},(_,i)=>i+1));
const byNum=n=>cards.find(x=>Number(x[1])===n)?.[3]||'';
for(const text of ['Advanced Shot Tracking is off by default','Game details &amp; actions','Game Starts on Lane',
 'own Stand Board','opposite lane','Save Setup']){
 assert(byNum(4).includes(text),'setup guide missing '+text);
}
for(const text of ['one Bowler','mixed-ball games','Advanced Ball &amp; Line Results','Lane Transition Analysis','Bowling Performance Evaluations']){
 assert(byNum(9).includes(text),'Stats navigation guide missing '+text);
}
for(const text of ['Full-game Avg','mixed-ball game','first-ball','stand &rarr; target','10-pin leaves','older games']){
 assert(byNum(10).includes(text),'Ball & Line guide missing '+text);
}
for(const text of ['same physical lane','strike percentage','Early','Building','Useful','Strong','Recent Transition Events']){
 assert(byNum(11).includes(text),'Transition guide missing '+text);
}
for(const text of ['Overall','Spare &amp; Leave','Recent Form','locally','offline','not an AI coach']){
 assert(byNum(12).includes(text),'Evaluations guide missing '+text);
}
assert.match(help,/id="printGuideBtn"/);
assert.match(html,/id="proAnalyticsContent"/);
assert.match(app,/APP_VERSION='public-v39\.018'/);
assert.match(sw,/SW_VERSION='public-v39\.018'/);
assert.match(sw,/popz-bowling-public-v39\.018/);
assert.doesNotMatch(help,/During <strong>PRO PREVIEW/);
console.log('Verified all 19 in-app/printable Help cards, setup instructions, data interpretation, evidence limits, and matching PWA version.');
