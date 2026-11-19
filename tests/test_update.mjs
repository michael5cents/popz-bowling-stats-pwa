import assert from'node:assert/strict';
import{versionNeedsUpdate,resolveUpdateNotice}from'../update.mjs';

assert.equal(versionNeedsUpdate('public-v15','public-v15'),false);
assert.equal(versionNeedsUpdate('public-v14','public-v15'),true);
assert.equal(versionNeedsUpdate('public-v15',''),false);
assert.equal(versionNeedsUpdate('public-v15','public-v16'),true);
assert.equal(versionNeedsUpdate('public-v16','public-v16'),false);
assert.equal(versionNeedsUpdate('public-v37','public-v37.002'),true);
assert.equal(versionNeedsUpdate('public-v37.002','public-v37.002'),false);

assert.deepEqual(
  resolveUpdateNotice('public-v24','public-v25',''),
  {needed:true,version:'public-v25',source:'latest-version'}
);
assert.deepEqual(
  resolveUpdateNotice('public-v24','public-v24','public-v25'),
  {needed:true,version:'public-v25',source:'service-worker'}
);
assert.deepEqual(
  resolveUpdateNotice('public-v24','public-v24','public-v24'),
  {needed:false,version:'public-v24',source:'current'}
);
assert.deepEqual(resolveUpdateNotice('public-v39.020','public-v39.020','public-v39.018'),
 {needed:false,version:'public-v39.020',source:'current'},'stale worker signal must not trigger update');
console.log('update-version and dual-signal tests passed');
