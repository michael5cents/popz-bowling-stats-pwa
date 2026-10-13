import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{runInNewContext}from'node:vm';

const source=readFileSync(new URL('../runtime-monitor.js',import.meta.url),'utf8');
const listeners={},sent=[],store=new Map();let seq=0;
const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const document={
 querySelector:s=>s==='meta[name="popz-app-version"]'?{content:'public-v39.009'}:null,
 addEventListener(){},getElementById(){return null},body:{appendChild(){}},documentElement:{appendChild(){}}
};
const window={addEventListener:(type,fn)=>{listeners[type]=fn}};
const context={window,document,location:{href:'https://popzbowling.com/',origin:'https://popzbowling.com',search:''},navigator:{userAgent:'Mozilla/5.0 (Linux; Android 15)',webdriver:false,onLine:true},localStorage,crypto:{randomUUID:()=>`id-${++seq}`},matchMedia:()=>({matches:false}),setTimeout:()=>0,URL,URLSearchParams,console,fetch:async(_url,opts)=>{const body=JSON.parse(opts.body);sent.push(...body.events);return{ok:true,json:async()=>({ok:true,accepted:body.events.length})}}};
runInNewContext(source,context,{filename:'runtime-monitor.js'});
const settle=async()=>{await new Promise(setImmediate);await new Promise(setImmediate)};
await settle();sent.length=0;

listeners.error({target:{tagName:'SCRIPT',rel:'',src:'https://popzbowling.com/v4bc70e2c01a94c73b74392e4234840661791215815920'}});
await settle();
assert.equal(sent.some(x=>x.event==='resource_error'),false,'opaque/injected script failures must be ignored');

listeners.error({target:{tagName:'SCRIPT',rel:'',src:'https://static.cloudflareinsights.com/beacon.min.js/v4bc70e2c01a94c73b74392e4234840661791215815920'}});
await settle();
assert.equal(sent.some(x=>x.event==='resource_error'),false,'third-party script failures must be ignored');

listeners.error({target:{tagName:'SCRIPT',rel:'',src:'https://popzbowling.com/app.js?v=39.009'}});
await settle();
assert.ok(sent.some(x=>x.event==='resource_error'&&x.errorKind==='script_load'&&x.source==='app.js'),'app.js failures must still report');

sent.length=0;
listeners.error({target:{tagName:'LINK',rel:'stylesheet',href:'https://popzbowling.com/style.css?v=39.009'}});
await settle();
assert.ok(sent.some(x=>x.event==='resource_error'&&x.errorKind==='stylesheet_load'&&x.source==='style.css'),'main stylesheet failures must still report');
console.log('runtime critical-resource filtering tests passed');
