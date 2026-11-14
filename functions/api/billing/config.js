import {json,checkoutEnabled,PRICE_CENTS,CURRENCY} from '../../_billing/core.mjs';
export function onRequestGet({env}){
 return json({ok:true,enabled:checkoutEnabled(env),amountCents:PRICE_CENTS,currency:CURRENCY,lifetime:true});
}
export function onRequest(){return json({ok:false,error:'Method not allowed'},405)}
