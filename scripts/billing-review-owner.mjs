#!/usr/bin/env node
// Popz Bowling Stripe billing reviews — operator-only Mac CLI.
// Token is held in a mode-600 local file; never log it or pass it on command line.
// This does NOT refund Stripe charges, unlock reservations or change Pro access.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT='https://stripe-lifetime-pro-preview.popzbowling.pages.dev';
const TOKEN_FILE=path.join(os.homedir(),'.config/popz-bowling-billing/review-admin-token');
const TOKEN=fs.readFileSync(TOKEN_FILE,'utf8').trim();
if(!/^[a-f0-9]{64}$/.test(TOKEN))throw Error('Missing secure billing review admin token');
const [action='open',id,...noteParts]=process.argv.slice(2);
const ID=/^(?:evt_[A-Za-z0-9_]+|checkout_[a-f0-9]{32})$/;
const options={headers:{authorization:'Bearer '+TOKEN,'cache-control':'no-store'}};
let url=ROOT+'/api/billing/reviews';
if(['open','all','alerts'].includes(action)){
 url+='?scope='+encodeURIComponent(action);
}else if(['ack','resolve'].includes(action)){
 if(!ID.test(id||''))throw Error('Usage: node billing-review-owner.mjs ack|resolve EVENT_ID [resolution note]');
 const note=noteParts.join(' ');
 if(action==='resolve' && note.trim().length<8)throw Error('Resolution requires a descriptive note (at least 8 characters).');
 options.method='POST';options.headers['content-type']='application/json';
 options.body=JSON.stringify({action:action==='ack'?'acknowledge':'resolve',id,note});
}else throw Error('Usage: node billing-review-owner.mjs open|all|alerts|ack EVENT_ID|resolve EVENT_ID NOTE');
const result=await fetch(url,options);
const body=await result.json().catch(()=>({}));
if(!result.ok||body.ok!==true){
 console.error('Billing review request failed (HTTP '+result.status+'). Verify preview/operator authorization.');
 process.exit(1);
}
if(Array.isArray(body.reviews)){
 console.log('Popz Bowling SANDBOX reviews: '+body.count+' (scope: '+body.scope+')');
 for(const r of body.reviews){
  console.log([r.id,'$'+(r.amountCents/100).toFixed(2),r.kind,r.status,
   r.reviewState??'pending',r.alertState??'',
   r.uid??'',r.createdAt??''].filter(Boolean).join(' | '));
 }
 if(!body.reviews.length)console.log('No reviews in this selection.');
}else console.log('Review '+body.id+': '+body.reviewState+'; alert '+body.alertState+
 (body.changed?' [updated]':' [already in that state]'));
