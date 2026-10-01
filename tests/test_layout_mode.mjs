import assert from'node:assert/strict';
import{LAYOUT_MODES,PHONE_SHORT_SIDE_MAX,normalizeLayoutMode,isStandaloneEnvironment,shortScreenSide,resolveLayoutMode,readLayoutMode,writeLayoutMode,layoutStatus}from'../layout-mode.mjs';

const env=(width,height,standalone=false)=>({
  screen:{width,height},
  innerWidth:width,
  innerHeight:height,
  navigator:{standalone:false},
  matchMedia:()=>({matches:standalone})
});

assert.equal(PHONE_SHORT_SIDE_MAX,500);
assert.equal(normalizeLayoutMode('bogus'),LAYOUT_MODES.AUTOMATIC);
assert.equal(isStandaloneEnvironment(env(390,844,true)),true);
assert.equal(shortScreenSide(env(844,390,true)),390);

let r=resolveLayoutMode(LAYOUT_MODES.AUTOMATIC,env(390,844,true));
assert.equal(r.compact,true,'installed phone must use Compact Phone in Automatic');
assert.match(layoutStatus(r),/Compact Phone/);

r=resolveLayoutMode(LAYOUT_MODES.AUTOMATIC,env(820,1180,true));
assert.equal(r.compact,false,'installed tablet must keep Full Layout in Automatic');

r=resolveLayoutMode(LAYOUT_MODES.AUTOMATIC,env(390,844,false));
assert.equal(r.compact,false,'phone-sized browser must keep Full Layout unless installed');

r=resolveLayoutMode(LAYOUT_MODES.COMPACT_PHONE,env(820,1180,false));
assert.equal(r.compact,true,'Compact Phone override must work on any device for testing');

r=resolveLayoutMode(LAYOUT_MODES.FULL,env(390,844,true));
assert.equal(r.compact,false,'Full Layout override must beat automatic phone detection');

const memory=new Map();
const storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
assert.equal(readLayoutMode(storage),LAYOUT_MODES.AUTOMATIC);
assert.equal(writeLayoutMode(LAYOUT_MODES.COMPACT_PHONE,storage),LAYOUT_MODES.COMPACT_PHONE);
assert.equal(readLayoutMode(storage),LAYOUT_MODES.COMPACT_PHONE);

console.log('Layout mode detection and device-local override tests passed');
