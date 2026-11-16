// Pure, server-only Stripe amount policy for Popz Bowling Lifetime Pro.
// Prevents tax-exclusive Checkout from being mistaken for the $9.99 base price.
// Tax collection remains OFF until merchant registration and owner policy are
// explicitly confirmed; no code here performs tax registration or charges.
export const BASE_PRICE_CENTS=999;
export const MAX_TAX_CENTS=999; // Extreme safety bound, not an expected tax rate.
export const MAX_GROSS_CENTS=BASE_PRICE_CENTS+MAX_TAX_CENTS;
export const CURRENCY='usd';

export function taxMode(env={}){
 if(env.BILLING_AUTOMATIC_TAX_ENABLED!=='true')return 'none';
 if(env.BILLING_TAX_REGISTRATION_CONFIRMED!=='true')return 'invalid';
 if(!['inclusive','exclusive'].includes(env.BILLING_TAX_BEHAVIOR))return 'invalid';
 return env.BILLING_TAX_BEHAVIOR;
}

export function automaticTaxAllowed(env={}){
 return taxMode(env)!=='invalid';
}

const validMinorUnit=x=>Number.isSafeInteger(x)&&x>=0;
const grossTotals=(session,env,{paid=false}={})=>{
 const mode=taxMode(env);
 if(mode==='invalid')return null;
 const subtotal=session?.amount_subtotal;
 const total=session?.amount_total;
 const details=session?.total_details||{};
 const tax=details.amount_tax??0;
 const discount=details.amount_discount??0;
 const shipping=details.amount_shipping??0;
 if(!validMinorUnit(total)||total>MAX_GROSS_CENTS||
  !validMinorUnit(tax)||tax>MAX_TAX_CENTS||
  discount!==0||shipping!==0)return null;
 if(paid && subtotal!==BASE_PRICE_CENTS)return null;
 if(!paid && subtotal!==undefined && subtotal!==null && subtotal!==BASE_PRICE_CENTS)return null;
 if(mode==='none'){
  if(session?.automatic_tax?.enabled===true||total!==BASE_PRICE_CENTS||tax!==0)return null;
 }else{
  if(session?.automatic_tax?.enabled!==true)return null;
  if(paid && session?.automatic_tax?.status!=='complete')return null;
  // Stripe can recalculate tax as the buyer supplies an address. Never trust a
  // client-supplied number; this is the authoritative Stripe Session response.
  if(mode==='exclusive' && total!==BASE_PRICE_CENTS+tax)return null;
  if(mode==='inclusive' && total!==BASE_PRICE_CENTS)return null;
 }
 return {baseCents:BASE_PRICE_CENTS,grossCents:total,taxCents:tax,currency:CURRENCY};
};
export function validateStripeSessionAmounts(session,env={},options={}){
 return grossTotals(session,env,options);
}
