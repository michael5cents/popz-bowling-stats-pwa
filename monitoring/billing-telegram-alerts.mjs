#!/usr/bin/env node
// PopzVPS delivery agent for Popz Bowling sandbox billing reviews.
// Uses existing Telegram monitor bot; never sends Firebase identity or card details.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE='https://stripe-lifetime-pro-preview.popzbowling.pages.dev';
const TOKEN_FILE=path.join(os.homedir(),'.config/popz-bowling-monitor/billing-review-monitor-token');
const TOKEN=fs.readFileSync(TOKEN_FILE,'utf8').trim();
const BOT=process.env.TELEGRAM_BOT_TOKEN||'';
const CHAT=process.env.TELEGRAM_CHAT_ID||'';
const EV=/^(?:evt_[A-Za-z0-9_]+|checkout_[a-f0-9]{32})$/;
if(!/^[a-f0-9]{64}$/.test(TOKEN)||!BOT||!CHAT)
 throw Error('Missing Popz Bowling Telegram or review-monitor authorization');
const ctrl=()=>AbortSignal.timeout(18000);
const get=async()=>{
 const res=await fetch(BASE+'/api/billing/reviews?scope=alerts',{
  headers:{authorization:'Bearer '+TOKEN,'cache-control':'no-store'},signal:ctrl()
 });
 if(!res.ok)throw Error('Billing review API unavailable, HTTP '+res.status);
 const json=await res.json();
 if(json?.ok!==true||!Array.isArray(json?.reviews))throw Error('Invalid billing review response');
 return json.reviews.slice(0,50);
};
const notify=async (review)=>{
 const id=review?.id;
 if(!EV.test(id||''))throw Error('Invalid billing review reference');
 const kind=String(review.kind||'').replace(/[^a-z_]/g,'').slice(0,35);
 const status=String(review.status||'').replace(/[^a-z_]/g,'').slice(0,35);
 const cents=Number(review.amountCents);
 if(!Number.isSafeInteger(cents)||cents<0||cents>999)throw Error('Invalid alert amount');
 const text=[
  '🚨 POPZ BOWLING BILLING REVIEW — SANDBOX',
  'Issue: '+kind.replace(/_/g,' '),
  'Stripe status: '+status.replace(/_/g,' '),
  'Amount: $'+(cents/100).toFixed(2),
  'Review ID: '+id,
  '',
  'Open the private review inbox on the Mac.',
  'No automatic refund or Pro revocation has occurred.'
 ].join('\n');
 const res=await fetch('https://api.telegram.org/bot'+BOT+'/sendMessage',{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({chat_id:CHAT,text,disable_web_page_preview:true}),
  signal:ctrl()
 });
 if(!res.ok)throw Error('Telegram delivery failed HTTP '+res.status);
 const data=await res.json();
 if(data?.ok!==true)throw Error('Telegram message not accepted');
};
const mark=async(id)=>{
 const res=await fetch(BASE+'/api/billing/reviews',{
  method:'POST',headers:{
   authorization:'Bearer '+TOKEN,'content-type':'application/json'
  },body:JSON.stringify({action:'mark_notified',id}),
  signal:ctrl()
 });
 if(!res.ok)throw Error('Billing review acknowledgment failed HTTP '+res.status);
 const data=await res.json();
 if(data?.ok!==true||data.alertState!=='notified')throw Error('Billing review acknowledgment not confirmed');
};

let n=0;
for(const incident of await get()){
 await notify(incident);
 await mark(incident.id);
 n++;
}
console.log('Popz Bowling billing review notifications delivered: '+n);
