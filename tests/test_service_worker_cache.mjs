import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import vm from'node:vm';

const source=readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
const appHTML=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const version=JSON.parse(readFileSync(new URL('../latest-version.json',import.meta.url),'utf8')).version;
const release=version.replace('public-v',''),origin='https://popzbowling.com';
const cacheName='popz-bowling-'+version;
const shell=(label='offline scoring')=>'<meta name="popz-app-version" content="'+version+'"><div id="appShell">'+label+'</div>';
const html=(body,options={})=>new Response(body,{status:options.status||200,headers:{'content-type':'text/html; charset=utf-8',...options.headers}});
const offline=()=>{throw Error('offline')};

function worker(){
  const listeners={},stores=new Map(),writes=[],requests=[];
  let network=offline,failWrites=false,skipWaitingCalls=0;
  const absolute=value=>new URL(typeof value==='string'?value:value.url,origin+'/').href;
  const bucket=name=>{if(!stores.has(name))stores.set(name,new Map());return stores.get(name)};
  const caches={
    async open(name){return{
      async match(key){return bucket(name).get(absolute(key))?.clone()},
      async put(key,response){
        if(failWrites)throw Error('quota exceeded');
        writes.push(absolute(key));bucket(name).set(absolute(key),response.clone());
      }
    }},
    async keys(){return[...stores.keys()]},
    async delete(name){return stores.delete(name)}
  };
  const fetch=async request=>{
    const url=new URL(absolute(request));requests.push(url.href);
    return network(url,request);
  };
  vm.runInNewContext(source,{
    URL,Request,Response,Set,caches,fetch,console,
    self:{
      location:new URL(origin+'/service-worker.js'),
      addEventListener(name,handler){listeners[name]=handler},
      async skipWaiting(){skipWaitingCalls++},
      clients:{async claim(){},async matchAll(){return[]}}
    }
  });
  return{
    writes,requests,
    setNetwork(fn){network=fn},
    failWrites(){failWrites=true},
    seed(path,response){bucket(cacheName).set(absolute(path),response.clone())},
    async cached(path){return bucket(cacheName).get(absolute(path))?.clone()},
    async fetch(path,{mode='cors',method='GET'}={}){
      const request={url:absolute(path),mode,method};
      let result;
      listeners.fetch({request,respondWith(promise){result=promise}});
      return result?await result:fetch(request);
    },
    async install(){
      let pending;
      listeners.install({waitUntil(promise){pending=promise}});
      await pending;
    },
    get installed(){return skipWaitingCalls>0}
  };
}

{
  const h=worker(),original=shell();
  h.seed('/index.html',html(original));
  h.seed('/telemetry-dashboard',html('stale cached administrator page'));
  h.setNetwork(()=>html('current administrator page',{headers:{'cache-control':'private, no-store'}}));
  assert.equal(await(await h.fetch('/telemetry-dashboard',{mode:'navigate'})).text(),'current administrator page');
  assert.equal(await(await h.cached('/index.html')).text(),original,'admin navigation must never replace the scoring shell');
  assert.equal(h.writes.length,0);
  h.setNetwork(offline);
  assert.equal(await(await h.fetch('/',{mode:'navigate'})).text(),original,'scoring must still open offline after an administrator visit');
  assert.equal(await(await h.fetch('/?qa_phone=1',{mode:'navigate'})).text(),original,'root query parameters must retain offline app access');
  await assert.rejects(h.fetch('/telemetry-dashboard',{mode:'navigate'}),/offline/,'admin pages must never fall back to the scoring shell');
}

{
  const h=worker(),original=shell();
  h.seed('/index.html',html(original));
  for(const path of['/missing-page','/another-page','/index.html/extra']){
    for(const status of[200,404,503]){
      h.setNetwork(()=>html(shell('unrelated navigation'),{status}));
      assert.equal((await h.fetch(path,{mode:'navigate'})).status,status);
      assert.equal(await(await h.cached('/index.html')).text(),original,'only the root/index route may refresh the scoring shell');
    }
  }
  for(const status of[404,503]){
    h.setNetwork(()=>html(shell('server error'),{status}));
    assert.equal((await h.fetch('/',{mode:'navigate'})).status,status);
    assert.equal(await(await h.cached('/index.html')).text(),original,'HTTP errors must not poison offline navigation');
  }
  assert.equal(h.writes.length,0);
}

{
  const cases=[
    ()=>html(shell('no store'),{headers:{'cache-control':'no-store, max-age=0'}}),
    ()=>html(shell('private'),{headers:{'cache-control':'public, private="set-cookie"'}}),
    ()=>html('unrelated successful HTML'),
    ()=>new Response(shell('wrong MIME'),{headers:{'content-type':'application/json'}}),
    ()=>html(shell().replace(version,'public-v0')),
    ()=>{const r=html(shell('redirected admin'));Object.defineProperty(r,'url',{value:origin+'/telemetry-dashboard'});return r}
  ];
  for(const response of cases){
    const h=worker(),original=shell();
    h.seed('/index.html',html(original));h.setNetwork(response);
    await h.fetch('/index.html',{mode:'navigate'});
    assert.equal(await(await h.cached('/index.html')).text(),original);
    assert.equal(h.writes.length,0,'unverified/no-store/private shell responses must not be cached');
  }
  const h=worker(),fresh=shell('verified new shell');
  h.seed('/index.html',html(shell()));h.setNetwork(()=>html(fresh));
  assert.equal(await(await h.fetch('/?qa_phone=1',{mode:'navigate'})).text(),fresh);
  h.setNetwork(offline);
  assert.equal(await(await h.fetch('/index.html',{mode:'navigate'})).text(),fresh,'successful verified root navigation must refresh offline shell');
}

{
  const paths=['/api','/api/health','/api/telemetry/dashboard','/api/runtime/summary','/api/live/example','/telemetry-dashboard','/telemetry-dashboard/','/telemetry-dashboard.html','/live/example','/latest-version.json','https://www.gstatic.com/firebasejs/example.js'];
  for(const path of paths){
    const h=worker();
    h.seed(path,new Response('stale cached data'));
    h.setNetwork(()=>new Response('fresh network data',{headers:{'cache-control':'no-store'}}));
    assert.equal(await(await h.fetch(path)).text(),'fresh network data','sensitive/API/live/version/external routes must bypass cached entries: '+path);
    assert.equal(h.writes.length,0);
    h.setNetwork(offline);
    await assert.rejects(h.fetch(path),/offline/,'network-only routes must not return stale data or the app shell');
  }
}

{
  const h=worker();
  h.seed('/scoring.mjs?v='+release,new Response('cached scoring module'));
  h.seed('/app.js?v='+release,new Response('cached application'));
  assert.equal(await(await h.fetch('/scoring.mjs')).text(),'cached scoring module','unversioned module imports need the bundled versioned fallback');
  assert.equal(await(await h.fetch('/scoring.mjs?v='+release)).text(),'cached scoring module');
  assert.equal(await(await h.fetch('/app.js?v='+release)).text(),'cached application');
  assert.equal(h.requests.length,0,'offline bundle hits must not need the network');
}

{
  const asset='/style.css?v='+release;
  for(const options of[
    {status:503,headers:{}},
    {status:206,headers:{}},
    {status:200,headers:{'cache-control':'no-store'}},
    {status:200,headers:{'cache-control':'PRIVATE'}}
  ]){
    const h=worker();h.setNetwork(()=>new Response('response body',options));
    await h.fetch(asset);await h.fetch(asset);
    assert.equal(h.writes.length,0,'error, partial, private and no-store asset responses must not be cached');
    assert.equal(h.requests.length,2,'an uncacheable asset response must not become a later cache hit');
  }
  const h=worker();h.setNetwork(()=>new Response('valid stylesheet',{headers:{'content-type':'text/css'}}));
  await h.fetch(asset);h.setNetwork(offline);
  assert.equal(await(await h.fetch(asset)).text(),'valid stylesheet','cacheable known assets should remain available offline');
  assert.equal(h.writes.length,1);
  const unknown=worker();unknown.setNetwork(()=>new Response('unlisted response'));
  await unknown.fetch('/unlisted.json');
  assert.equal(unknown.writes.length,0,'only the known application bundle belongs in the offline cache');
}

{
  const h=worker(),fresh=shell('network shell despite quota');
  h.seed('/index.html',html(shell()));h.failWrites();h.setNetwork(()=>html(fresh));
  assert.equal(await(await h.fetch('/',{mode:'navigate'})).text(),fresh,'cache-write failure must not discard a working network response');
}

{
  const h=worker();
  h.setNetwork(url=>url.pathname==='/'||url.pathname==='/index.html'
    ?html(appHTML,{headers:{'cache-control':'no-store'}})
    :new Response('bundled asset',{headers:{'cache-control':'no-store'}}));
  await h.install();
  assert.equal(h.installed,true,'explicit bundle installation must still work on a no-store local test server');
  h.setNetwork(offline);
  assert.equal(await(await h.fetch('/',{mode:'navigate'})).text(),appHTML);
  assert.equal(await(await h.fetch('/cloud-sync-core.mjs')).text(),'bundled asset');
  assert.equal(await(await h.fetch('/live-share-ui.mjs?v='+release)).text(),'bundled asset');
}

{
  for(const invalid of['wrong shell','private response']){
    const h=worker();
    h.setNetwork(url=>url.pathname==='/'||url.pathname==='/index.html'
      ?html(invalid==='wrong shell'?'not the scoring app':appHTML,{headers:invalid==='private response'?{'cache-control':'private'}:{}})
      :new Response('bundled asset'));
    await assert.rejects(h.install(),/Invalid precache response/);
    assert.equal(h.installed,false,'an invalid/private shell must not finish installation');
    assert.equal(h.writes.length,0,'failed bundle validation must not replace any cached files');
  }
}

{
  // Simulate a small HTTP connection pool: each slot stays occupied until its
  // streamed response body is consumed. Merely fetching all headers deadlocks.
  const h=worker(),limit=3,waiting=[];
  let active=0,drained=0,timer;
  const acquire=()=>active<limit?(active++,Promise.resolve()):new Promise(resolve=>waiting.push(resolve));
  const releaseConnection=()=>{
    assert.equal(h.writes.length,0,'the complete bundle must be drained and validated before any cache write');
    drained++;
    const next=waiting.shift();if(next)next();else active--;
  };
  h.setNetwork(async url=>{
    await acquire();
    const isShell=url.pathname==='/'||url.pathname==='/index.html';
    const bytes=new TextEncoder().encode(isShell?appHTML:'body for '+url.pathname);
    let sent=false;
    const body=new ReadableStream({pull(controller){
      if(!sent){sent=true;controller.enqueue(bytes)}
      else{controller.close();releaseConnection()}
    }},{highWaterMark:0});
    return new Response(body,{status:200,statusText:'OK',headers:{'content-type':isShell?'text/html; charset=utf-8':'application/octet-stream','cache-control':'no-store','x-fixture':'streamed'}});
  });
  try{
    await Promise.race([h.install(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Precache exhausted its connection pool without draining response bodies')),1000)})]);
  }finally{clearTimeout(timer)}
  assert.equal(h.installed,true);
  assert.equal(drained,h.requests.length,'every fetched response must release its connection');
  assert.equal(active,0);assert.equal(waiting.length,0);
  const cached=await h.cached('/entry.js?v='+release);
  assert.equal(cached.status,200);assert.equal(cached.statusText,'OK');assert.equal(cached.headers.get('x-fixture'),'streamed');
  assert.equal(await cached.text(),'body for /entry.js');
}

console.log('Service worker preserves verified offline scoring, excludes APIs/admin/live data, rejects unsafe refreshes, drains streamed precache bodies, and retains bundled modules');
