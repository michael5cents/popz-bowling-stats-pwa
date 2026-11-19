import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import vm from 'node:vm';
const root=resolve(import.meta.dirname,'..'),marketing=resolve(root,'marketing/professional-site');
const html=readFileSync(resolve(marketing,'index.html'),'utf8');
const script=readFileSync(resolve(marketing,'script.js'),'utf8');
const mediaName='Popz-Bowling-League-Night-Safari-Compatible.mp4';
const media=resolve(marketing,'assets',mediaName);
assert.match(html,new RegExp('src="assets/'+mediaName.replace(/\\./g,'\\.')+'" type="video/mp4"'));
assert.match(html,new RegExp('href="assets/'+mediaName.replace(/\\./g,'\\.')+'"'));
assert.doesNotMatch(html,/Popz-Bowling-League-Night-Official-Commercial\.mp4/,'old video with data track must not be referenced in website');
assert.doesNotMatch(script,/Popz-Bowling-League-Night-Official-Commercial\.mp4/);
assert.match(script,/isAppleTouchBrowser\(\)/);
assert.doesNotMatch(script,/window\.location\.assign/,'iPad Watch should use browser native link, not JS navigation');
assert.match(script,/navigator\.maxTouchPoints > 1/);
const href='watch';
const watchLinks=[...html.matchAll(/<a\b[^>]*data-video-open[^>]*>/g)];
assert.equal(watchLinks.length,4,'all four Watch controls must be real links');
for(const link of watchLinks)assert.ok(link[0].includes('href="'+href+'"'),'Watch links must open the dedicated video page');
assert.equal((html.match(/<button\b[^>]*data-video-open/g)||[]).length,0,'no JS-only Watch controls');
const watch=readFileSync(resolve(marketing,'watch.html'),'utf8');
const watcher=readFileSync(resolve(marketing,'watch.js'),'utf8');
assert.match(watch,new RegExp('src="assets/'+mediaName.replace(/\\./g,'\\.')+'"'));
assert.match(watch,/id="commercial" controls/);
assert.match(watch,/href="\/features\/#demo"/);
assert.match(watch,new RegExp('href="assets/'+mediaName.replace(/\\./g,'\\.')+'"'),'direct link remains for older Safari failure');
assert.match(watcher,/addEventListener\("ended", returnToWebsite\)/);
assert.match(watcher,/addEventListener\("webkitendfullscreen"/);
assert.match(watcher,/window\.location\.replace\("\/features\/#demo"\)/);
assert.doesNotMatch(watch,/backdrop-filter|<dialog|filter:blur|transform:/,'no blurred modal on player page');


assert.ok(statSync(media).size>1000000);
const header=readFileSync(media).subarray(0,400000);
assert.equal(header.toString('ascii',4,8),'ftyp','MP4 file type must exist');
assert.ok(header.includes(Buffer.from('moov')),'quick-start moov atom must be near beginning');
const moovPos=header.indexOf(Buffer.from('moov')),mdatPos=header.indexOf(Buffer.from('mdat'));
assert.ok(moovPos>=0&&(mdatPos===-1||moovPos<mdatPos),'quick-start MP4 must put moov ahead of media');
try{
 const streams=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_name,codec_type,width,height','-of','json',media],{encoding:'utf8'})).streams;
 assert.deepEqual(streams.map(s=>[s.codec_type,s.codec_name]),[['video','h264'],['audio','aac']],'Safari MP4 must have video and audio only, no extraneous data stream');
 assert.deepEqual([streams[0].width,streams[0].height],[1280,720],'retain original full 1280x720 video resolution');
}catch(error){if(error.code!=='ENOENT')throw error;}
function click(ua,touches=0){
 const calls=[],listeners={};
 const video={currentTime:0,play(){calls.push('play');return Promise.resolve()},pause(){calls.push('pause')},addEventListener(){}};
 const dialog={open:false,showModal(){calls.push('modal');this.open=true},addEventListener(){}};
 const button={addEventListener(type,fn){listeners[type]=fn}};
 const ids={'demo-video':video,'demo-dialog':dialog};
 const doc={baseURI:'https://popzbowling.com/features/',body:{classList:{add(){},remove(){}}},getElementById(id){return ids[id]||null},
  querySelectorAll(selector){return selector==='[data-video-open]'?[button]:[]}};
 const fakeWindow={location:{assign(url){calls.push(['navigate',url])}},addEventListener(){},innerWidth:820};
 vm.runInNewContext(script,{document:doc,window:fakeWindow,navigator:{userAgent:ua,maxTouchPoints:touches},URL,console});
 assert.equal(typeof listeners.click,'function');
 let prevented=false;
 listeners.click({preventDefault(){prevented=true;calls.push('preventDefault')}});
 if(!prevented)calls.push(['native-link','https://popzbowling.com/features/watch']);
 return{calls,dialog,prevented};
}
const apple=[
 ['Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Safari/604.1',5],
 ['Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/154 Mobile Safari/604.1',5],
 ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18 Safari/605.1.15',5]
];
for(const [ua,touches] of apple){
 const result=click(ua,touches);
 assert.equal(result.calls.length,1,'touch Apple browser must follow the direct MP4 link');
 assert.equal(result.prevented,false,'Safari navigation must never be cancelled');
 assert.equal(result.calls[0][0],'native-link');
 assert.equal(result.calls[0][1],'https://popzbowling.com/features/watch');
 assert.equal(result.dialog.open,false,'iPad must not enter blurred dialog that hid its video');
}
for(const ua of ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18 Safari/605.1.15',
 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36']){
 const result=click(ua,0);
 assert.deepEqual(result.calls,['modal','preventDefault','play'],'desktop browsers retain embedded modal video with the link cancelled');
}
assert.match(readFileSync(resolve(root,'scripts/build-dist.sh'),'utf8'),/assets\/Popz-Bowling-League-Night-Safari-Compatible\.mp4/);
console.log('Safari commercial: clean fast-start H264/AAC media, iPad native route and desktop modal verified');
