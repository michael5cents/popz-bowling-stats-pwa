import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const files=['app.js','scoring.mjs','cloud-sync.mjs','live-share.mjs','entry.js'];
for(const file of files){
 const source=readFileSync(new URL('../'+file,import.meta.url),'utf8');
 for(const match of source.matchAll(/from\s*['"](\.\/[^'"]+\.mjs(?:\?v=[^'"]+)?)['"]/g))
  assert.match(match[1],/\?v=39\.020$/,file+' imported '+match[1]);
}
assert.match(readFileSync(new URL('../app.js',import.meta.url),'utf8'),/scoring\.mjs\?v=39\.020/);
console.log('iOS atomic module import tests passed');
