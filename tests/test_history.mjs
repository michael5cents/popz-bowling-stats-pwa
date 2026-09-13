import assert from'node:assert/strict';
import{groupHistorySessions}from'../history.mjs';
const s=(id,league,date,createdAt='')=>({id,league,date,createdAt});
const groups=groupHistorySessions([
  s('t2','Tuesday Night Open','2026-09-15'),
  s('r1','Practice','2026-09-07'),
  s('t1','Tuesday Night Open','2026-09-08'),
  s('h1','Thursday Trios Fall','2026-09-10'),
  s('h2','thursday trios fall','2026-09-17'),
  s('r2','', '2026-09-01')
]);
assert.deepEqual(groups.map(g=>g.name),['Practice','Thursday Trios Fall','Tuesday Night Open']);
assert.equal(groups[0].sessionCount,2);
assert.deepEqual(groups[1].dates.map(d=>d.date),['2026-09-17','2026-09-10']);
assert.deepEqual(groups[2].dates.map(d=>d.date),['2026-09-15','2026-09-08']);
assert.equal(groups[1].dates[0].sessions[0].id,'h2');
console.log('history grouping tests passed');
