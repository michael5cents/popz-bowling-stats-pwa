import assert from'node:assert/strict';
import{versionNeedsUpdate,resolveUpdateNotice}from'../update.mjs';

assert.equal(versionNeedsUpdate('public-v15','public-v15'),false);
assert.equal(versionNeedsUpdate('public-v14','public-v15'),true);
assert.equal(versionNeedsUpdate('public-v15',''),false);
assert.equal(versionNeedsUpdate('public-v15','public-v16'),true);
assert.equal(versionNeedsUpdate('public-v16','public-v16'),false);

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
console.log('update-version and dual-signal tests passed');
