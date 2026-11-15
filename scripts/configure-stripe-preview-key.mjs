#!/usr/bin/env node
// One-time Stripe SANDBOX restricted key transfer from macOS clipboard -> Cloudflare Preview.
// Never writes, prints or commits the key.
import {execFileSync,spawnSync} from 'node:child_process';

const STRIPE_PRICE='price_1UbqZiBmwB4QMGDE6oIXNFL0';
const STRIPE_PRODUCT='prod_Vd6n0W8JakrQl9';
const CF_PROJECT='popzbowling';
const ROOT='/Users/michaelnichols/popz-bowling-stripe-pro';

function die(message){
  console.error('FAILED: '+message);
  process.exitCode=1;
}
try{
  const key=execFileSync('/usr/bin/pbpaste',{encoding:'utf8',timeout:5000}).trim();
  if(!/^(?:rk|sk)_test_[A-Za-z0-9_]+$/.test(key)){
    die('Copy a Stripe SANDBOX restricted API key (rk_test_...) to clipboard; do not paste it in ChatGPT.');
  }else{
    if(key.startsWith('sk_test_'))console.warn('NOTICE: Using a sandbox-only unrestricted secret for this test; replace with a restricted rk_test_ key before release.');
    const response=await fetch('https://api.stripe.com/v1/prices/'+encodeURIComponent(STRIPE_PRICE),{
      headers:{authorization:'Bearer '+key,'stripe-version':'2026-09-30.endive'}
    });
    if(!response.ok){
      die('The key cannot read the sandbox Price. Grant Prices read permission in Stripe, then retry. HTTP '+response.status);
    }else{
      const price=await response.json();
      if(price.livemode!==false || price.id!==STRIPE_PRICE || price.product!==STRIPE_PRODUCT ||
         price.unit_amount!==999 || price.currency!=='usd' || price.type!=='one_time'){
        die('Stripe key did not return the expected sandbox account/product/price; nothing was configured.');
      }else{
        const result=spawnSync('npm',[
          'exec','--yes','--package=wrangler@4.162.0','--',
          'wrangler','pages','secret','put','STRIPE_SECRET_KEY',
          '--project-name',CF_PROJECT,'--env','preview'
        ],{cwd:ROOT,input:key,encoding:'utf8',maxBuffer:1024*1024,timeout:90000});
        if(result.error || result.status!==0){
          die('Cloudflare preview secret upload failed. Wrangler exit '+String(result.status));
        }else{
          console.log('SUCCESS: Verified $9.99 sandbox Price and installed Stripe SANDBOX key in Cloudflare Preview.');
          console.log('No live-mode settings were changed. The billing checkout switch remains OFF.');
          execFileSync('/usr/bin/pbcopy',{input:'',encoding:'utf8',timeout:5000});
        }
      }
    }
  }
}catch(e){
  die('Unable to configure key: '+(e?.name||'unexpected error'));
}
