import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),app=read('app.js'),css=read('style.css');

for(const id of['leagueStatsPanel','leagueAveragePanel','performancePanel','leaveStatsPanel','recentSeriesPanel']){
  assert.match(html,new RegExp('id="'+id+'"'));
}
assert.match(app,/const STATS_PANEL_IDS=\['leagueStatsPanel','leagueAveragePanel','performancePanel','leaveStatsPanel','recentSeriesPanel'\]/);
assert.match(app,/function initStatsPanels\(\)/);
assert.match(app,/popz-public-stats-panel-/);
assert.match(app,/initStatsPanels\(\);renderAll\(\)/);
assert.doesNotMatch(app,/class="stats-league-group" open/,'league/category stat groups should start collapsed');
assert.doesNotMatch(app,/class="history-league-group recent-league-group" open/,'recent-series groups should start collapsed');
assert.doesNotMatch(app,/class="history-league-group" open/,'History league/category groups should start collapsed');
assert.match(css,/\.stats-collapsed>:not\(\.panel-title\)\{display:none!important\}/);
assert.match(css,/\.panel-collapse-btn/);
assert.match(css,/history-league-group\[open\]>summary \.history-group-hint::before\{content:"Hide"\}/);
console.log('Compact Stats panels and collapsed History grouping tests passed');
