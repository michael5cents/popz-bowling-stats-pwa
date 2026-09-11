import assert from'node:assert/strict';
import{versionNeedsUpdate}from'../update.mjs';
assert.equal(versionNeedsUpdate('public-v15','public-v15'),false);
assert.equal(versionNeedsUpdate('public-v14','public-v15'),true);
assert.equal(versionNeedsUpdate('public-v15',''),false);
console.log('update-version comparison tests passed');
assert.equal(versionNeedsUpdate('public-v15','public-v16'),true);
assert.equal(versionNeedsUpdate('public-v16','public-v16'),false);
