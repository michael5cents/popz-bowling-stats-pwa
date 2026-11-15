// Operator-only billing review ledger. Distinct sandbox and PRODUCTION scopes.
// Live API remains disabled unless an explicit owner-approved release config
// enables it; never expose billing records or credentials to the browser.
import {
 json,secureEqual,BILLING_PREVIEW_BRANCH,BILLING_PREVIEW_ORIGIN
} from '../../_billing/core.mjs';

const ID=/^(?:evt_[A-Za-z0-9_]+|checkout_[a-f0-9]{32})$/;
const ALLOWED_ACTIONS=new Set(['acknowledge','resolve','mark_notified']);
const rowFields='id,uid,kind,provider_status,reference_id,payment_intent_id,amount_cents,review_state,alert_state,created_at,updated_at,notified_at,acknowledged_at,resolved_at,reviewer_note';

function allowed(request,env){
 const url=new URL(request.url);
 const preview=env?.CF_PAGES_BRANCH===BILLING_PREVIEW_BRANCH &&
   url.origin===BILLING_PREVIEW_ORIGIN;
 const production=env?.CF_PAGES_BRANCH==='main' &&
   env?.BILLING_REVIEW_PRODUCTION_ENABLED==='true' &&
   url.origin==='https://popzbowling.com';
 // Production is fail-closed by default. No production endpoint is deployed
 // or callable just because a D1 database exists.
 if(!preview&&!production)return null;
 const header=request.headers.get('authorization')||'';
 const input=header.startsWith('Bearer ')?header.slice(7):'';
 if(!/^[a-f0-9]{64}$/.test(input))return null;
 if(/^[a-f0-9]{64}$/.test(env.BILLING_REVIEW_ADMIN_TOKEN||'')&&secureEqual(input,env.BILLING_REVIEW_ADMIN_TOKEN))return 'admin';
 if(/^[a-f0-9]{64}$/.test(env.BILLING_REVIEW_MONITOR_TOKEN||'')&&secureEqual(input,env.BILLING_REVIEW_MONITOR_TOKEN))return 'monitor';
 return null;
}
const unavailable=()=>json({ok:false,error:'Review inbox unavailable'},503);
const unauthorized=()=>json({ok:false,error:'Not found'},404);
const bad=()=>json({ok:false,error:'Invalid operator request'},400);

export async function onRequestGet({request,env}){
 const role=allowed(request,env);
 if(!role)return unauthorized();
 if(!env?.BILLING_REVIEW_DB?.prepare)return unavailable();
 const url=new URL(request.url);
 const scope=url.searchParams.get('scope')||'open';
 if(role==='monitor' && scope!=='alerts')return unauthorized();
 if(!['alerts','open','all'].includes(scope))return bad();
 try{
  const filter=scope==='alerts'?"WHERE alert_state='pending' AND review_state!='resolved'":
   scope==='open'?"WHERE review_state!='resolved'":'';
  const result=await env.BILLING_REVIEW_DB.prepare(
   `SELECT ${rowFields} FROM billing_reviews ${filter}
   ORDER BY created_at ASC, id ASC LIMIT 100`).all();
  if(result?.success!==true || !Array.isArray(result.results))return unavailable();
  return json({ok:true,scope,count:result.results.length,reviews:result.results.map(row=>
   role==='monitor'?{
    id:row.id,kind:row.kind,status:row.provider_status,
    amountCents:row.amount_cents,createdAt:row.created_at
   }:{
    id:row.id,uid:row.uid,kind:row.kind,status:row.provider_status,
    referenceId:row.reference_id,paymentIntentId:row.payment_intent_id,
    amountCents:row.amount_cents,reviewState:row.review_state,
    alertState:row.alert_state,createdAt:row.created_at,updatedAt:row.updated_at,
    notifiedAt:row.notified_at,acknowledgedAt:row.acknowledged_at,
    resolvedAt:row.resolved_at,reviewerNote:row.reviewer_note
   })});
 }catch{return unavailable()}
}

export async function onRequestPost({request,env}){
 const role=allowed(request,env);
 if(!role)return unauthorized();
 if(!env?.BILLING_REVIEW_DB?.prepare)return unavailable();
 if(Number(request.headers.get('content-length')||0)>2500)return bad();
 let body;
 try{body=await request.json()}catch{return bad()}
 if(!body||!ALLOWED_ACTIONS.has(body.action)||!ID.test(body.id||''))return bad();
 if(body.action==='mark_notified' && role!=='monitor' ||
    body.action!=='mark_notified' && role!=='admin')return unauthorized();
 const action=body.action;
 const note=body.note??'';
 if(typeof note!=='string'||note.length>400||
    /[\x00-\x08\x0B\x0C\x0E-\x1F<>]/.test(note) ||
    action==='resolve'&&note.trim().length<8)return bad();
 try{
  let query;
  if(action==='mark_notified'){
   query=env.BILLING_REVIEW_DB.prepare(`UPDATE billing_reviews
     SET alert_state='notified', notified_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),
     updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id=? AND alert_state='pending'`);
  }else if(action==='acknowledge'){
   query=env.BILLING_REVIEW_DB.prepare(`UPDATE billing_reviews
     SET review_state='acknowledged',acknowledged_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),
     updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),
     reviewer_note=?,reviewed_by='popz_billing_owner'
     WHERE id=? AND review_state='manual_review_required'`);
  }else{
   // Resolving an alert is NOT a refund or an automatic entitlement change.
   query=env.BILLING_REVIEW_DB.prepare(`UPDATE billing_reviews
     SET review_state='resolved',resolved_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),
     updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),
     reviewer_note=?,reviewed_by='popz_billing_owner'
     WHERE id=? AND review_state IN ('manual_review_required','acknowledged')`);
  }
  const args=action==='mark_notified'?[body.id]:[note.trim(),body.id];
  const updated=await query.bind(...args).run();
  if(updated?.success!==true)return unavailable();
  const current=await env.BILLING_REVIEW_DB.prepare(
   `SELECT id,review_state,alert_state FROM billing_reviews WHERE id=? LIMIT 1`).bind(body.id).first();
  if(!current)return json({ok:false,error:'Review event not found'},404);
  return json({ok:true,id:current.id,reviewState:current.review_state,alertState:current.alert_state,
   changed:(updated.meta?.changes||0)>0});
 }catch{return unavailable()}
}
export function onRequest(){return json({ok:false,error:'Method not allowed'},405)}
