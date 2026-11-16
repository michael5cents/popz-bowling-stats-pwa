#!/usr/bin/env node
// Popz Bowling Founder Admin - secure local Mac CLI for GUI.
// Explicit per-account owner approval only. Does not create or refund Stripe
// payments, alter customer bowling history, or expose a public admin API.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {PROJECT,APPROVAL,normalizeEntitlement,evaluateFounderCandidate,founderCommit}
 from './founder-admin-core.mjs';

const input=process.argv.slice(2);
const task=input[0];
const rawEmail=input[1]==='--email'?input[2]:null;
const email=String(rawEmail||'').trim().toLowerCase();
const validEmail=/^[^\s@\x00-\x1f]+@[^\s@\x00-\x1f]+\.[^\s@\x00-\x1f]+$/;
const isGrant=task==='grant';
const isCheck=task==='check';
const approved=isGrant&&input.length===5&&input[3]==='--confirm-email'&&
 input[4]?.toLowerCase()===email;
const commandValid=(isCheck&&input.length===3 || approved)&&
 email.length<255&&validEmail.test(email);
function emit(data,code=0){process.stdout.write(JSON.stringify(data)+'\n');process.exitCode=code;}
if(!commandValid){
 emit({ok:false,message:'Enter one valid Google email; grant requires explicit matching confirmation.'},2);
}else{
 try{await run()}catch(error){
  // NEVER return token, Firebase UID, account lists or server response body.
  emit({ok:false,message:'Founder Admin could not complete: '+String(error?.message||'Unexpected error').slice(0,210)},1);
 }
}
async function run(){
 const sdk='/Users/michaelnichols/.local/opt/google-cloud-sdk/bin/gcloud';
 const cpy='/usr/local/bin/python3';
 const alt='/Users/michaelnichols/.local/share/uv/python/cpython-3.13-macos-x86_64-none/bin/python3.13';
 const env={...process.env};
 if(!env.CLOUDSDK_PYTHON)env.CLOUDSDK_PYTHON=fs.existsSync(cpy)?cpy:alt;
 let token;
 try{token=execFileSync(sdk,['auth','print-access-token'],{
  encoding:'utf8',timeout:25000,stdio:['ignore','pipe','ignore'],env
 }).trim();}catch{throw Error('Google Cloud owner login is required on this Mac.');}
 if(!token||token.length<50)throw Error('Google Cloud owner login is required on this Mac.');
 const headers={authorization:'Bearer '+token,'x-goog-user-project':PROJECT};
 const api=async(url,{method='GET',body}={})=>{
  let res;
  try{res=await fetch(url,{
   method,headers:body?{...headers,'content-type':'application/json'}:headers,
   body:body?JSON.stringify(body):undefined,
   signal:AbortSignal.timeout(25000)
  });}catch{throw Error('Could not reach Google Firebase securely.');}
  if(res.status===404&&method==='GET')return null;
  if(!res.ok)throw Error('Google Firebase request failed (HTTP '+res.status+'). No change confirmed.');
  return res.json();
 };
 const users=[];
 let cursor=null;
 for(let i=0;i<250;i++){
  const params=new URLSearchParams({maxResults:'200'});
  if(cursor)params.set('nextPageToken',cursor);
  const data=await api('https://identitytoolkit.googleapis.com/v1/projects/'+PROJECT+
   '/accounts:batchGet?'+params);
  users.push(...(data.users||[]));
  cursor=data.nextPageToken||null;
  if(!cursor)break;
  if(i===249)throw Error('Incomplete Firebase account inventory; cannot proceed safely.');
 }
 const matches=users.filter(x=>String(x.email||'').toLowerCase()===email);
 if(matches.length>1)throw Error('Duplicate Google identity match. No changes allowed.');
 const user=matches[0]||null;
 if(!user){
  emit({ok:true,email,found:false,eligible:false,accountStatus:'Not registered',
   message:'No account found. Ask this person to install Popz Bowling and sign in with Google first.'});
  return;
 }
 const uid=user.localId;
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid||''))
  throw Error('Invalid Firebase account identity.');
 const prefix='https://firestore.googleapis.com/v1/projects/'+PROJECT+
  '/databases/(default)/documents/users/'+encodeURIComponent(uid)+'/';
 const [entitlementDoc,paid,checkout]=await Promise.all([
  api(prefix+'entitlements/pro'),
  api(prefix+'billing/stripeLifetime'),
  api(prefix+'billing/checkoutReservation')
 ]);
 const entitlement=normalizeEntitlement(entitlementDoc);
 const plan=evaluateFounderCandidate({user,entitlement,paid,checkout});
 const summary={
  ok:true,email,found:true,verifiedGoogle:
    user.emailVerified===true&&!(user.disabled===true)&&
    (user.providerUserInfo||[]).some(x=>x.providerId==='google.com'),
  accountStatus:entitlement?.status||'No entitlement yet',
  eligible:plan.eligible,alreadyFounder:plan.alreadyFounder||false,
  message:plan.reason
 };
 if(isCheck){emit(summary);return;}
 if(!plan.eligible){emit({...summary,granted:false},1);return;}
 // Re-read immediately before a grant; the Firestore commit additionally
 // verifies BOTH payment paths absent and the exact entitlement version.
 const confirm=users.filter(x=>String(x.email||'').toLowerCase()===email);
 if(confirm.length!==1||confirm[0].localId!==uid)
  throw Error('Account identity changed during confirmation.');
 const now=new Date().toISOString();
 const batch=founderCommit(uid,plan,entitlement,now);
 await api('https://firestore.googleapis.com/v1/projects/'+PROJECT+
  '/databases/(default)/documents:commit',{method:'POST',body:batch});
 const updated=await api(prefix+'entitlements/pro');
 if(updated?.fields?.plan?.stringValue!=='pro'||
  updated.fields.status?.stringValue!=='founder'||
  updated.fields.approvalReference?.stringValue!==APPROVAL)
  throw Error('Write returned but grant could not be verified. Recheck this account before retrying.');
 let auditSaved=false;
 try{
  const auditRoot=path.join(os.homedir(),'.config/popz-bowling');
  fs.mkdirSync(auditRoot,{recursive:true,mode:0o700});
  fs.appendFileSync(path.join(auditRoot,'founder-admin-audit.jsonl'),
   JSON.stringify({when:now,email,uid,action:'grant_founder',
    priorStatus:entitlement?.status||'none',source:APPROVAL})+'\n',
   {mode:0o600,flag:'a'});
  auditSaved=true;
 }catch{}
 emit({...summary,eligible:false,accountStatus:'founder',granted:true,
  auditSaved,message:'Founder Pro - Lifetime successfully granted and verified. The person can sign into the same Google account in Popz Bowling; no purchase required.'});
}