#!/usr/bin/env node
// One specifically approved additional Founder, AFTER Google sign-in. No secret
// or customer identifier is printed. Read-only by default; run --apply explicitly.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {validateFounderManifest} from './founder-migration-core.mjs';
import {EXCEPTION_REFERENCE,PROJECT_ID,FOUNDER_COUNT_BEFORE,FOUNDER_COUNT_AFTER,
 entitlementOf,planFourthFounder,fourthFounderWrite} from './fourth-founder-exception-core.mjs';

const argv=process.argv.slice(2);
const usage='Usage: node scripts/grant-fourth-founder.mjs --email USER@EXAMPLE.COM [--apply --confirm-email USER@EXAMPLE.COM]';
if((argv.length!==2&&argv.length!==5)||argv[0]!=='--email'||
 !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(argv[1]||''))
 throw Error(usage);
const email=argv[1].toLowerCase();
const apply=argv.length===5&&argv[2]==='--apply'&&argv[3]==='--confirm-email'&&
 (argv[4]||'').toLowerCase()===email;
if(argv.length===5&&!apply)throw Error('Apply requires --confirm-email matching the exact target.');
const rosterFile=path.join(os.homedir(),'.config/popz-bowling/founder-manifest-20261115.json');
const rosterRaw=fs.readFileSync(rosterFile,'utf8');
const roster=JSON.parse(rosterRaw);
const verifiedRoster=validateFounderManifest(roster);
if(!verifiedRoster.policyReady||roster.founderCap!==FOUNDER_COUNT_BEFORE||
   verifiedRoster.members.length!==FOUNDER_COUNT_BEFORE)
 throw Error('Original approved three-Founder roster changed; do not proceed.');
const py='/Users/michaelnichols/.local/share/uv/python/cpython-3.13-macos-x86_64-none/bin/python3.13';
const env={...process.env};
if(!env.CLOUDSDK_PYTHON&&fs.existsSync(py))env.CLOUDSDK_PYTHON=py;
const token=execFileSync('/Users/michaelnichols/.local/opt/google-cloud-sdk/bin/gcloud',
 ['auth','print-access-token'],{
  encoding:'utf8',timeout:20000,env,stdio:['ignore','pipe','ignore']
 }).trim();
if(token.length<50)throw Error('Google Cloud owner credentials unavailable.');
const headers={authorization:'Bearer '+token,'x-goog-user-project':PROJECT_ID};
const base='https://firestore.googleapis.com/v1/projects/'+PROJECT_ID+
 '/databases/(default)/documents/users/';
async function api(url,method='GET',body=null){
 const response=await fetch(url,{
  method,
  headers:body?{...headers,'content-type':'application/json'}:headers,
  body:body?JSON.stringify(body):undefined,
  signal:AbortSignal.timeout(25000)
 });
 if(method==='GET'&&response.status===404)return null;
 if(!response.ok)throw Error('Firebase operation failed: HTTP '+response.status);
 return response.json();
}
const users=[];
let pageToken=null;
for(let page=0;page<20;page++){
 const params=new URLSearchParams({maxResults:'200'});
 if(pageToken)params.set('nextPageToken',pageToken);
 const result=await api('https://identitytoolkit.googleapis.com/v1/projects/'+PROJECT_ID+
  '/accounts:batchGet?'+params);
 users.push(...(result.users||[]));
 pageToken=result.nextPageToken||null;
 if(!pageToken)break;
 if(page===19)throw Error('Firebase Auth listing incomplete. No changes.');
}
const matches=users.filter(u=>(u.email||'').toLowerCase()===email);
if(matches.length!==1)throw Error('Exact customer Google account not found exactly once. Install/sign in first.');
const target=matches[0];
if(!/^[A-Za-z0-9_-]{1,128}$/.test(target.localId||''))
 throw Error('Invalid Firebase UID.');
if(verifiedRoster.members.some(m=>m.uid===target.localId))
 throw Error('Target already belongs to the original three Founders.');
let founderCount=0;
let next=0;
await Promise.all(Array.from({length:Math.min(users.length,6)},async()=>{
 while(next<users.length){
  const user=users[next++];
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(user.localId||''))
   throw Error('Unrecognized Firebase user identity.');
  const doc=await api(base+encodeURIComponent(user.localId)+'/entitlements/pro');
  if(doc?.fields?.plan?.stringValue==='pro'&&doc.fields?.status?.stringValue==='founder')
   founderCount++;
 }
}));
const prefix=base+encodeURIComponent(target.localId)+'/';
const [doc,paidRecord,reservation]=await Promise.all([
 api(prefix+'entitlements/pro'),
 api(prefix+'billing/stripeLifetime'),
 api(prefix+'billing/checkoutReservation')
]);
const entitlement=entitlementOf(doc);
const result=planFourthFounder({
 founderCount,authUser:target,entitlement,paidRecord,reservation
});
console.log('Fourth Founder - '+(apply?'APPLY REQUESTED':'READ-ONLY PRECHECK'));
console.log('Project:',PROJECT_ID);
console.log('Original verified Founders:',founderCount);
console.log('Exact Google-account match:',matches.length);
console.log('Current entitlement:',entitlement?.status||'none');
console.log('Existing payment or Checkout reservation:',!!(paidRecord||reservation));
console.log('Eligible:',result.allowed);
if(!result.allowed)throw Error('Grant denied: '+result.reason);
console.log('Mode:',result.mode);
if(!apply){
 console.log('No changes made. Once the correct account is confirmed, use --apply --confirm-email.');
 process.exit(0);
}
if(fs.readFileSync(rosterFile,'utf8')!==rosterRaw)
 throw Error('Private Founder roster changed during preflight.');
const grant=fourthFounderWrite(target.localId,result.mode,entitlement,
 new Date().toISOString());
await api('https://firestore.googleapis.com/v1/projects/'+PROJECT_ID+
 '/databases/(default)/documents:commit','POST',{writes:[grant]});
const check=await api(prefix+'entitlements/pro');
if(check?.fields?.status?.stringValue!=='founder'||
 check?.fields?.approvalReference?.stringValue!==EXCEPTION_REFERENCE)
 throw Error('Grant outcome unverified. Inspect Firestore before retry.');
// Only now extend the private roster. No UIDs or emails in git, logs or docs.
const after={...roster,founderCap:FOUNDER_COUNT_AFTER,
 members:[...roster.members,{
  uid:target.localId,evidenceReference:EXCEPTION_REFERENCE
 }]};
validateFounderManifest(after);
const temp=rosterFile+'.temp-fourth-'+process.pid;
try{
 fs.writeFileSync(temp,JSON.stringify(after,null,2)+'\n',{flag:'wx',mode:0o600});
 fs.renameSync(temp,rosterFile);
}finally{try{fs.unlinkSync(temp)}catch{}}
console.log('VERIFIED: Fourth Founder Pro is permanent. Private roster updated to four.');
console.log('No Stripe payment was created; no scoring or history data was modified.');