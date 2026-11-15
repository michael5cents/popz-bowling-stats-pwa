// Actual Firebase Firestore emulator security-rule tests.
// Runs ONLY under firebase emulators:exec against demo-popz-bowling-commercial-qa.
// Never talks to production or changes the currently deployed firestore.rules.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';

const deps=process.env.POPZ_RULES_TEST_DEPS||
 path.join(os.homedir(),'.cache','popz-firestore-rules-qa');
const require=createRequire(path.join(deps,'package.json'));
const {initializeTestEnvironment,assertSucceeds,assertFails}=
 require('@firebase/rules-unit-testing');
const {Timestamp,doc,collection,getDoc,getDocs,setDoc,deleteDoc,writeBatch}=
 require('firebase/firestore');
const projectId='demo-popz-bowling-commercial-qa';
const rules=fs.readFileSync(new URL('../firestore.commercial.rules',import.meta.url),'utf8');
const env=await initializeTestEnvironment({
 projectId,
 firestore:{host:'127.0.0.1',port:9195,rules}
});
let assertions=0;
const pass=async promise=>{await assertSucceeds(promise);assertions++};
const deny=async promise=>{await assertFails(promise);assertions++};
const future=Timestamp.fromMillis(Date.now()+72*3600000);
const past=Timestamp.fromMillis(Date.now()-72*3600000);
const entitled={
 founder:{plan:'pro',status:'founder',source:'founder'},
 complimentary:{plan:'pro',status:'complimentary',source:'admin'},
 lifetime:{plan:'pro',status:'lifetime',source:'stripe'},
 trial_active:{plan:'pro',status:'trial',source:'installation',
  expiresAt:'2099-01-01T00:00:00.000Z',expiresAtTimestamp:future},
 active_active:{plan:'pro',status:'active',source:'stripe',expiresAtTimestamp:future},
 trial_expired:{plan:'pro',status:'trial',source:'installation',
  expiresAt:'2099-01-01T00:00:00.000Z',expiresAtTimestamp:past},
 active_expired:{plan:'pro',status:'active',source:'stripe',expiresAtTimestamp:past},
 trial_no_native_expiry:{plan:'pro',status:'trial',source:'installation',
  expiresAt:'2099-01-01T00:00:00.000Z'},
 trial_wrong_type:{plan:'pro',status:'trial',source:'installation',
  expiresAtTimestamp:'2099-01-01T00:00:00.000Z'},
 trial_missing_expiry:{plan:'pro',status:'trial',source:'installation'},
 free:{plan:'free',status:'active',expiresAtTimestamp:future},
 status_unrecognized:{plan:'pro',status:'unknown',expiresAtTimestamp:future}
};
try{
 // Admin-only fixture creation bypasses rules in the isolated LOCAL emulator.
 await env.withSecurityRulesDisabled(async context=>{
  const db=context.firestore();
  for(const [uid,entitlement] of Object.entries(entitled)){
   await setDoc(doc(db,'users',uid,'entitlements','pro'),entitlement);
   await setDoc(doc(db,'users',uid),{
    settings:{bowlerName:'Test Only'},updatedAt:'2026-11-15T18:00:00.000Z'
   });
   await setDoc(doc(db,'users',uid,'sessions','existing'),{
    data:{name:'Old Bowling History',games:[]},updatedAt:'2026-11-15T18:00:00.000Z'
   });
   await setDoc(doc(db,'users',uid,'deletedSessions','old'),{
    id:'old',deletedAt:'2026-11-15T18:00:00.000Z'
   });
   await setDoc(doc(db,'users',uid,'billing','stripeLifetime'),{
    checkoutSessionId:'cs_test_no_real_payment'
   });
  }
  await setDoc(doc(db,'users','no_entitlement'),{settings:{bowlerName:'No Trial'}});
  await setDoc(doc(db,'users','no_entitlement','sessions','existing'),{data:{}});
 });
 for(const uid of ['founder','complimentary','lifetime','trial_active','active_active']){
  const db=env.authenticatedContext(uid).firestore();
  await pass(getDoc(doc(db,'users',uid)));
  await pass(getDocs(collection(db,'users',uid,'sessions')));
  await pass(getDocs(collection(db,'users',uid,'deletedSessions')));
  await pass(setDoc(doc(db,'users',uid,'sessions','new'),{data:{games:[]}}));
  await pass(setDoc(doc(db,'users',uid),{settings:{bowlerName:'Allowed User'}}));
  await pass(setDoc(doc(db,'users',uid,'deletedSessions','another'),{deletedAt:'now'}));
  await pass(deleteDoc(doc(db,'users',uid,'sessions','new')));
  await pass(getDoc(doc(db,'users',uid,'entitlements','pro')));
  await deny(setDoc(doc(db,'users',uid,'entitlements','pro'),{
   plan:'pro',status:'founder'
  }));
  await deny(deleteDoc(doc(db,'users',uid,'entitlements','pro')));
  await deny(setDoc(doc(db,'users',uid,'billing','stripeLifetime'),{
   amountCents:1
  }));
  await pass(getDoc(doc(db,'users',uid,'billing','stripeLifetime')));
  await deny(getDoc(doc(db,'users','founder'===uid?'lifetime':'founder')));
  // Six writes in one batch must not exceed the Firestore rules read limit.
  const batch=writeBatch(db);
  for(let i=0;i<6;i++)
   batch.set(doc(db,'users',uid,'sessions','bulk'+i),{data:{game:i}});
  await pass(batch.commit());
  if(uid==='founder'){
   // App chunks large history uploads into 400 operations.
   const big=writeBatch(db);
   for(let i=0;i<400;i++)
    big.set(doc(db,'users',uid,'sessions','history'+i),{data:{games:[]}});
   await pass(big.commit());
  }
 }
 for(const uid of [
  'trial_expired','active_expired','trial_no_native_expiry','trial_wrong_type',
  'trial_missing_expiry','free','status_unrecognized','no_entitlement'
 ]){
  const db=env.authenticatedContext(uid).firestore();
  await deny(getDoc(doc(db,'users',uid)));
  await deny(getDoc(doc(db,'users',uid,'sessions','existing')));
  await deny(getDocs(collection(db,'users',uid,'sessions')));
  await deny(getDocs(collection(db,'users',uid,'deletedSessions')));
  await deny(setDoc(doc(db,'users',uid,'sessions','new'),{data:{games:[]}}));
  await deny(setDoc(doc(db,'users',uid),{settings:{}}));
  await deny(deleteDoc(doc(db,'users',uid,'sessions','existing')));
  // Crucial: users can still see entitlement/billing metadata to resolve
  // a payment, but they cannot self-extend the trial or overwrite history.
  if(uid!=='no_entitlement'){
   await pass(getDoc(doc(db,'users',uid,'entitlements','pro')));
   await pass(getDoc(doc(db,'users',uid,'billing','stripeLifetime')));
   await deny(setDoc(doc(db,'users',uid,'entitlements','pro'),{
    plan:'pro',status:'founder',expiresAtTimestamp:future
   }));
  }
 }
 const anon=env.unauthenticatedContext().firestore();
 await deny(getDoc(doc(anon,'users','founder')));
 await deny(getDoc(doc(anon,'users','founder','entitlements','pro')));
 await deny(getDoc(doc(anon,'users','founder','sessions','existing')));
 await deny(getDocs(collection(anon,'users','founder','sessions')));
 await deny(setDoc(doc(anon,'users','founder'),{settings:{}}));
 await deny(getDoc(doc(anon,'users','founder','billing','stripeLifetime')));
 // A denied trial user's historical cloud data stays stored: rules don't delete it.
 await env.withSecurityRulesDisabled(async context=>{
  const stored=await getDoc(doc(context.firestore(),'users','trial_expired',
   'sessions','existing'));
  assert.equal(stored.exists(),true,'expired trial must not erase any scores');
  assert.equal(stored.data().data.name,'Old Bowling History');
 });
 console.log('PASS: real Firebase emulator rules, '+assertions+
  ' authorized/denied operations, Founder/lifetime/trial expiry, batch writes, cross-user isolation, read-only billing, and retained old scores');
}finally{
 await env.cleanup();
}
