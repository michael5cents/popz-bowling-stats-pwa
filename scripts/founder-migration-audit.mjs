#!/usr/bin/env node
// Founder eligibility inventory + manifest dry run. NO WRITE CAPABILITY.
// Never prints Firebase UID, email, Google credential, or personal bowling data.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {validateFounderManifest,planFounderMigration} from './founder-migration-core.mjs';

const PROJECT='popz-bowling-stats';
const CLOUD='/Users/michaelnichols/.local/opt/google-cloud-sdk/bin/gcloud';
const args=process.argv.slice(2);
if(args.length>2||(args.length===2&&args[0]!=='--manifest')||
  args.some(x=>['--apply','--execute','--commit','--write','--delete'].includes(x)))
 throw Error('Read-only usage: node scripts/founder-migration-audit.mjs [--manifest /private/path.json]');
let manifest=null;
if(args.length===2){
 const raw=JSON.parse(fs.readFileSync(args[1],'utf8'));
 manifest=validateFounderManifest(raw);
}
const cloudPython='/Users/michaelnichols/.local/share/uv/python/cpython-3.13-macos-x86_64-none/bin/python3.13';
const cloudEnv={...process.env};
if(!cloudEnv.CLOUDSDK_PYTHON&&fs.existsSync(cloudPython))
 cloudEnv.CLOUDSDK_PYTHON=cloudPython;
const token=execFileSync(CLOUD,['auth','print-access-token'],{
 encoding:'utf8',timeout:20000,stdio:['ignore','pipe','ignore'],env:cloudEnv
}).trim();
if(!token||token.length<50)throw Error('Google Cloud owner authentication unavailable');
const headers={authorization:'Bearer '+token,'x-goog-user-project':PROJECT};
async function readJson(url){
 const response=await fetch(url,{method:'GET',headers,signal:AbortSignal.timeout(20000)});
 if(response.status===404)return null;
 if(!response.ok)throw Error('Read-only Firebase audit endpoint unavailable (HTTP '+response.status+')');
 return response.json();
}
const users=[];
let pageToken=null;
for(let page=0;page<20;page++){
 const params=new URLSearchParams({maxResults:'200'});
 if(pageToken)params.set('nextPageToken',pageToken);
 const obj=await readJson('https://identitytoolkit.googleapis.com/v1/projects/'+PROJECT+
  '/accounts:batchGet?'+params);
 users.push(...(obj.users||[]));
 pageToken=obj.nextPageToken||null;
 if(!pageToken)break;
 if(page===19)throw Error('Founder inventory pagination incomplete; no migration plan generated');
}
const accounts=new Map(),entitlements=new Map(),counts=new Map();
for(const user of users){
 const uid=user.localId;
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid||'')||accounts.has(uid))
  throw Error('Firebase Auth inventory had a missing or duplicate identity');
 accounts.set(uid,{emailVerified:user.emailVerified===true,
  disabled:user.disabled===true,
  googleProvider:(user.providerUserInfo||[]).some(p=>p.providerId==='google.com')});
}
const uids=[...accounts.keys()];
let index=0;
const workers=Array.from({length:Math.min(6,uids.length)},async()=>{
 while(index<uids.length){
  const uid=uids[index++];
  const doc=await readJson('https://firestore.googleapis.com/v1/projects/'+PROJECT+
   '/databases/(default)/documents/users/'+encodeURIComponent(uid)+'/entitlements/pro');
  if(!doc){entitlements.set(uid,null);continue;}
  const fields=doc.fields||{};
  const value=field=>fields[field]?.stringValue||'';
  entitlements.set(uid,{plan:value('plan'),status:value('status'),source:value('source')});
 }
});
await Promise.all(workers);
for(const entitlement of entitlements.values()){
 const label=entitlement===null?'no_entitlement':
  entitlement.plan==='pro'&&['founder','complimentary','lifetime'].includes(entitlement.status)?
    'permanent_'+entitlement.status:
  entitlement.plan==='pro'?'other_pro_record':'other_record';
 counts.set(label,(counts.get(label)||0)+1);
}
console.log('Popz Bowling Founder eligibility audit — READ ONLY');
console.log('Firebase Auth users:',uids.length);
console.log('Verified Google accounts:',[...accounts.values()].filter(
 a=>a.emailVerified&&!a.disabled&&a.googleProvider).length);
console.log('Disabled Auth users:',[...accounts.values()].filter(a=>a.disabled).length);
for(const label of [...counts.keys()].sort())console.log('Entitlement '+label+':',counts.get(label));
if(manifest){
 const plan=planFounderMigration({...manifest,schemaVersion:1},accounts,entitlements);
 console.log('Private manifest entries:',manifest.members.length);
 console.log('Founder policy approved:',plan.hasOwnerPolicy);
 console.log('Founder cap check:',plan.withinCap?'within approved cap':'missing or exceeding cap');
 console.log('Proposed create-only entries:',plan.proposed);
 for(const [name,count] of Object.entries(plan.counts))console.log('Review category '+name+':',count);
 console.log('Migration status:',plan.reason);
 console.log('Writes performed:',plan.writeOperations);
}else{
 console.log('No owner-approved Founder roster supplied; no accounts selected.');
 console.log('Writes performed: 0');
}
console.log('IMPORTANT: Founder inventory audit is READ ONLY; no production entitlement was modified.');
