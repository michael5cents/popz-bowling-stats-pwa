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
assert.match(script,/window\.location\.assign\(commercialURL\)/);
assert.match(script,/navigator\.maxTouchPoints > 1/);
assert.ok(statSync(media).size>1000000);
const header=readFileSync(media).subarray(0,400000);
assert.equal(header.toString('ascii',4,8),'ftyp','MP4 file type must exist');
assert.ok(header.includes(Buffer.from('moov')),'quick-start moov atom must be near beginning');
const moovPos=header.indexOf(Buffer.from('moov')),mdatPos=header.indexOf(Buffer.from('mdat'));
assert.ok(moovPos>=0&&(mdatPos===-1||moovPos<mdatPos),'quick-start MP4 must put moov ahead of media');
try{
 const streams=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_name,codec_type','-of','json',media],{encoding:'utf8'})).streams;
 assert.deepEqual(streams.map(s=>[s.codec_type,s.codec_name]),[['video','h264'],['audio','aac']],'Safari MP4 must have video and audio only, no extraneous data stream');
}catch(error){if(error.code!=='ENOENT')throw error;}
function click(ua,touches=0){
 const calls=[],listeners={};
 const video={currentTime:0,play(){calls.push('play');return Promise.resolve()},pause(){calls.push('pause')}};
 const dialog={open:false,showModal(){calls.push('modal');this.open=true},addEventListener(){}};
 const button={addEventListener(type,fn){listeners[type]=fn}};
 const ids={'demo-video':video,'demo-dialog':dialog};
 const doc={baseURI:'https://popzbowling.com/features/',body:{classList:{add(){},remove(){}}},getElementById(id){return ids[id]||null},
  querySelectorAll(selector){return selector==='[data-video-open]'?[button]:[]}};
 const fakeWindow={location:{assign(url){calls.push(['navigate',url])}},addEventListener(){},innerWidth:820};
 vm.runInNewContext(script,{document:doc,window:fakeWindow,navigator:{userAgent:ua,maxTouchPoints:touches},URL,console});
 assert.equal(typeof listeners.click,'function');
 listeners.click();
 return{calls,dialog};
}
const apple=[
 ['Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Safari/604.1',5],
 ['Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/154 Mobile Safari/604.1',5],
 ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18 Safari/605.1.15',5]
];
for(const [ua,touches] of apple){
 const result=click(ua,touches);
 assert.equal(result.calls.length,1,'touch Apple browser must only navigate directly');
 assert.equal(result.calls[0][0],'navigate');
 assert.equal(result.calls[0][1],'https://popzbowling.com/features/assets/'+mediaName);
 assert.equal(result.dialog.open,false,'iPad must not enter blurred dialog that hid its video');
}
for(const ua of ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18 Safari/605.1.15',
 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36']){
 const result=click(ua,0);
 assert.deepEqual(result.calls,['modal','play'],'desktop browsers retain embedded modal video');
}
assert.match(readFileSync(resolve(root,'scripts/build-dist.sh'),'utf8'),/assets\/Popz-Bowling-League-Night-Safari-Compatible\.mp4/);
console.log('Safari commercial: clean fast-start H264/AAC media, iPad native route and desktop modal verified');
