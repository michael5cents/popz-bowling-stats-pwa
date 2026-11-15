#!/usr/bin/env node
// Popz Bowling Stats preview service account transfer.
// Requires a dedicated least-privilege Google Cloud IAM JSON credential file.
// The credential is read in memory and sent only to Cloudflare's encrypted Preview secret.
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const file=process.argv[2];
if(!file){console.error('Usage: node scripts/configure-firebase-preview-service-account.mjs /absolute/path/to/dedicated-service-account.json');process.exit(2);}
let credential;
try{credential=JSON.parse(readFileSync(file,'utf8'));}catch{console.error('Service account file is missing or invalid JSON.');process.exit(2);}
if(credential.type!=='service_account' ||
   credential.project_id!=='popz-bowling-stats' ||
   !/^popz-bowling-stripe-preview@[a-z0-9-]+\.iam\.gserviceaccount\.com$/.test(credential.client_email||'') ||
   !/^-----BEGIN PRIVATE KEY-----/.test(credential.private_key||'') ||
   !/^https:\/\/oauth2\.googleapis\.com\/token$/.test(credential.token_uri||'')){
  console.error('File must be the dedicated popz-bowling-stripe-preview service account for the popz-bowling-stats project. Nothing uploaded.');
  process.exit(3);
}
const value=JSON.stringify(credential);
const r=spawnSync('npm',['exec','--yes','--package=wrangler@4.162.0','--',
  'wrangler','pages','secret','put','FIREBASE_SERVICE_ACCOUNT_JSON',
  '--project-name','popzbowling','--env','preview'
],{cwd:'/Users/michaelnichols/popz-bowling-stripe-pro',input:value,encoding:'utf8',maxBuffer:1024*1024,timeout:90000});
if(r.error || r.status!==0){
 console.error('Cloudflare Preview service account upload failed. Wrangler code '+String(r.status));
 process.exit(4);
}
console.log('Dedicated Firebase service account installed as a Cloudflare Preview encrypted secret. Checkout remains disabled.');
