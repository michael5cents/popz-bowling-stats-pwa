// Browser billing adapter. The server, never the client, decides whether checkout is enabled.
export async function fetchBillingOffer(){
 const response=await fetch('./api/billing/config',{cache:'no-store'});
 if(!response.ok)throw Error('Purchase information unavailable');
 const offer=await response.json();
 if(offer?.amountCents!==999||offer?.currency!=='usd'||offer?.lifetime!==true)
  throw Error('Unexpected Pro pricing');
 return {enabled:offer.enabled===true,amountCents:999,currency:'usd'};
}

export async function createLifetimeCheckout(user){
 if(!user?.getIdToken)throw Error('Sign in with Google before purchasing Pro');
 const token=await user.getIdToken();
 const response=await fetch('./api/billing/checkout',{
  method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},
  cache:'no-store',body:'{}'
 });
 const result=await response.json().catch(()=>({}));
 if(!response.ok||!result?.ok)throw Error(result?.error||'Secure checkout is currently unavailable');
 if(result.alreadyPro===true)return {alreadyPro:true};
 if(result.paymentProcessing===true)return {paymentProcessing:true};
 if(typeof result.url!=='string'||!result.url.startsWith('https://checkout.stripe.com/'))
  throw Error('Invalid checkout destination');
 return {url:result.url};
}
