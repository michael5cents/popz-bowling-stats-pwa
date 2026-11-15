// Durable, sandbox-isolated owner review queue for Stripe billing incidents.
// Source of truth for entitlement remains Firestore; this queue is for operator alerts.
// Never stores card details, access tokens, customer email or bowling history.
export class ReviewQueueError extends Error {
 constructor(message){super(message);this.status=503}
}
const UID=/^[A-Za-z0-9_-]{1,128}$/;
const EVENT=/^(?:evt_[A-Za-z0-9_]+|checkout_[a-f0-9]{32})$/;
const TEXT=/^[a-z_]{2,48}$/;
const REF=/^[A-Za-z0-9_:-]{1,160}$/;
const PERMITTED_KINDS=new Set(['duplicate_paid_purchase','refund','dispute','charge_refunded','checkout_uncertain']);
const DATABASE_MESSAGE='Billing review queue unavailable';

export function validateBillingReview(item){
 if(!UID.test(item?.uid||'')||!EVENT.test(item?.id||'')||
    !PERMITTED_KINDS.has(item?.kind)||!TEXT.test(item?.status||'')||
    !REF.test(item?.referenceId||'')||
    item.paymentIntentId!==null && item.paymentIntentId!==undefined && !/^pi_[A-Za-z0-9_]+$/.test(item.paymentIntentId)||
    !Number.isSafeInteger(item?.amountCents)||item.amountCents<0||item.amountCents>999)
  throw new ReviewQueueError('Invalid billing review metadata');
 return item;
}
export async function queueBillingReview(env,details){
 const item=validateBillingReview(details);
 const db=env?.BILLING_REVIEW_DB;
 if(!db?.prepare)throw new ReviewQueueError(DATABASE_MESSAGE);
 let written;
 try{
  written=await db.prepare(`INSERT INTO billing_reviews
   (id,uid,kind,provider_status,reference_id,payment_intent_id,amount_cents)
   VALUES (?,?,?,?,?,?,?)
   ON CONFLICT(id) DO NOTHING`).bind(
   item.id,item.uid,item.kind,item.status,item.referenceId,item.paymentIntentId??null,item.amountCents
  ).run();
  if(written?.success!==true)throw new Error('D1 insert unavailable');
  // Ensure a conflicting idempotent retry did not silently record a different incident.
  if((written.meta?.changes||0)===0){
   const previous=await db.prepare(`SELECT uid,kind,reference_id,payment_intent_id
    FROM billing_reviews WHERE id = ? LIMIT 1`).bind(item.id).first();
   if(previous?.uid!==item.uid||previous?.kind!==item.kind||
      previous?.reference_id!==item.referenceId||
      previous?.payment_intent_id!==(item.paymentIntentId??null))
    throw new Error('Review event collision');
  }
 }catch{throw new ReviewQueueError(DATABASE_MESSAGE)}
 return {queued:true,firstEnqueue:(written.meta?.changes||0)>0};
}
