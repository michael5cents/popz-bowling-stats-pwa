import{mergeCloudBowlingState,stateForCloud,cloudSnapshotToState,cloudDocForSession,normalizeCloudDocument}from'./cloud-sync-core.mjs?v=39.019';
import{PRO_FEATURES,effectiveAccess,canUseFeature}from'./entitlements.mjs?v=39.019';

const FIREBASE_VERSION='12.19.0';
const config={
  projectId:'popz-bowling-stats',
  appId:'1:730420372180:web:c7ff17f8b1e431485c1141',
  storageBucket:'popz-bowling-stats.firebasestorage.app',
  apiKey:'AIzaSyAtCTfQHIBy_YdKFWh9qa3UFYgjh9KFz6c', // gitleaks:allow -- Firebase web API key is public client configuration.
  authDomain:'popz-bowling-stats.firebaseapp.com',
  messagingSenderId:'730420372180'
};
const base=`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
let api=null,appApi=null,authApi=null,storeApi=null,auth=null,db=null,currentUser=null,currentEntitlement={},syncing=null;
let callbacks={getState:null,setState:null,onStatus:null,onSignedIn:null,
 onEntitlement:null,onEntitlementCache:null};
let trialConfigCheckedAt=0,trialEnrollmentEnabled=false;
const accountTrialStatus=async()=>{
 if(Date.now()-trialConfigCheckedAt<300000)return trialEnrollmentEnabled;
 trialConfigCheckedAt=Date.now();
 try{
  const res=await fetch('/api/billing/trial',{cache:'no-store'});
  const conf=res.ok?await res.json():{};
  trialEnrollmentEnabled=conf.enabled===true;
 }catch{trialEnrollmentEnabled=false}
 return trialEnrollmentEnabled;
};
const effectiveClock=()=>{
 const last=Date.parse(callbacks.getState?.()?.trialLastSeenAt||'');
 return Math.max(Date.now(),Number.isFinite(last)?last:0);
};
const signedOutAccess=()=>{
 const state=callbacks.getState?.();
 const cached=state?.entitlementCache;
 if(state?.lastCloudUserUid && cached?.uid===state.lastCloudUserUid)
  return effectiveAccess(cached.record||{},{now:effectiveClock()});
 return effectiveAccess({},{
  signedOut:true,now:effectiveClock(),
  localTrialStartedAt:state?.trialStartedAt,
  localTrialLastSeenAt:state?.trialLastSeenAt
 });
};
const stamp=v=>{const t=Date.parse(v||'');return Number.isFinite(t)?t:0};
const sessionStamp=s=>Math.max(stamp(s?.updatedAt),stamp(s?.finishedAt),stamp(s?.createdAt));

function status(state,message=''){
  callbacks.onStatus?.({state,message,user:currentUser,lastSyncAt:state==='synced'?new Date().toISOString():null});
}

async function loadFirebase(){
  if(api)return api;
  if(navigator.onLine===false)throw Error('Cloud sync needs an internet connection');
  [appApi,authApi,storeApi]=await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`)
  ]);
  const firebaseApp=appApi.getApps().length?appApi.getApp():appApi.initializeApp(config);
  auth=authApi.getAuth(firebaseApp);
  await authApi.setPersistence(auth,authApi.browserLocalPersistence);
  db=storeApi.getFirestore(firebaseApp);
  api={appApi,authApi,storeApi};
  return api;
}

async function refreshEntitlement(uid=currentUser?.uid){
  if(!uid){
   currentEntitlement={};callbacks.onEntitlement?.(signedOutAccess());
   return currentEntitlement
  }
  let snap=await storeApi.getDoc(storeApi.doc(db,'users',uid,'entitlements','pro'));
  if(!snap.exists()&&currentUser?.uid===uid&&await accountTrialStatus()){
   // Server verifies the Firebase ID token, chooses the UTC start/end, and
   // creates one entitlement with exists:false. Browser never writes grants.
   const userToken=await currentUser.getIdToken();
   const firstUseAt=callbacks.getState?.()?.trialStartedAt;
   const res=await fetch('/api/billing/trial',{
    method:'POST',headers:{authorization:'Bearer '+userToken,
     'content-type':'application/json'},
    body:JSON.stringify({installationStartedAt:firstUseAt})
   });
   if(!res.ok)throw Error('Cannot verify the 30-day Pro trial right now');
   snap=await storeApi.getDoc(storeApi.doc(db,'users',uid,'entitlements','pro'));
  }
  currentEntitlement=snap.exists()?snap.data():{};
  if(currentUser?.uid===uid)
   await callbacks.onEntitlementCache?.({uid,record:currentEntitlement,
    verifiedAt:new Date().toISOString()});
  callbacks.onEntitlement?.(effectiveAccess(currentEntitlement,{now:effectiveClock()}));
  return currentEntitlement;
}

async function pullCloud(uid){
  const userRef=storeApi.doc(db,'users',uid);
  const [profileSnap,sessionsSnap,tombsSnap]=await Promise.all([
    storeApi.getDoc(userRef),
    storeApi.getDocs(storeApi.collection(db,'users',uid,'sessions')),
    storeApi.getDocs(storeApi.collection(db,'users',uid,'deletedSessions'))
  ]);
  const profile=profileSnap.exists()?profileSnap.data():{};
  const sessionMeta=new Map(),sessions=[];
  sessionsSnap.forEach(s=>{const v=s.data();sessionMeta.set(s.id,v);sessions.push(v.data||v)});
  const tombMeta=new Map(),deleted=[];
  tombsSnap.forEach(s=>{const v=s.data();tombMeta.set(s.id,v);deleted.push(v)});
  return{state:cloudSnapshotToState(profile,sessions,deleted),profile,sessionMeta,tombMeta};
}

async function commitOps(ops){
  for(let i=0;i<ops.length;i+=400){
    const batch=storeApi.writeBatch(db);
    for(const op of ops.slice(i,i+400)){
      if(op.kind==='delete')batch.delete(op.ref);
      else batch.set(op.ref,normalizeCloudDocument(op.data),{merge:false});
    }
    await batch.commit();
  }
}

async function pushCloud(uid,state,remote){
  const clean=stateForCloud(state),ops=[];
  const userRef=storeApi.doc(db,'users',uid);
  if(!remote.profile?.settingsUpdatedAt||stamp(clean.settingsUpdatedAt)>stamp(remote.profile.settingsUpdatedAt)){
    ops.push({kind:'set',ref:userRef,data:{schemaVersion:1,settings:clean.settings,settingsUpdatedAt:clean.settingsUpdatedAt,updatedAt:new Date().toISOString()}});
  }
  for(const session of clean.sessions){
    const old=remote.sessionMeta.get(session.id);
    if(!old||sessionStamp(session)>stamp(old.updatedAt)){
      ops.push({kind:'set',ref:storeApi.doc(db,'users',uid,'sessions',session.id),data:cloudDocForSession(session)});
    }
  }
  for(const tomb of clean.deletedSessions){
    const old=remote.tombMeta.get(tomb.id);
    if(!old||stamp(tomb.deletedAt)>stamp(old.deletedAt)){
      ops.push({kind:'set',ref:storeApi.doc(db,'users',uid,'deletedSessions',tomb.id),data:tomb});
    }
    const oldSession=remote.sessionMeta.get(tomb.id);
    if(oldSession&&stamp(tomb.deletedAt)>=stamp(oldSession.updatedAt)){
      ops.push({kind:'delete',ref:storeApi.doc(db,'users',uid,'sessions',tomb.id)});
    }
  }
  await commitOps(ops);
  return ops.length;
}

export function cloudUser(){return currentUser}
export function cloudAvailable(){return !!currentUser}
export function accountAccess(){return currentUser?effectiveAccess(currentEntitlement,{now:effectiveClock()}):signedOutAccess()}
export function cloudFeatureAvailable(feature){return canUseFeature(feature,currentEntitlement)}

export async function syncCloudNow(){
  if(syncing)return syncing;
  syncing=(async()=>{
    try{
      await loadFirebase();
      if(!currentUser){status('signed-out','Sign in with Google to sync across devices');return null}
      await refreshEntitlement(currentUser.uid);
      if(!canUseFeature(PRO_FEATURES.GOOGLE_SYNC,currentEntitlement)){status('pro-required','Google Sync requires Popz Bowling Pro');return null}
      status('syncing','Syncing bowling data…');
      const remote=await pullCloud(currentUser.uid);
      const local=callbacks.getState?.();
      if(!local)throw Error('Local bowling data unavailable');
      const merged=mergeCloudBowlingState(local,remote.state,new Date().toISOString());
      await callbacks.setState?.(merged.state);
      const writes=await pushCloud(currentUser.uid,merged.state,remote);
      status('synced',writes?`Synced • ${writes} cloud update${writes===1?'':'s'}`:'Up to date');
      return merged.summary;
    }catch(e){
      status('error',e?.message||'Cloud sync failed');
      throw e;
    }finally{syncing=null}
  })();
  return syncing;
}

export async function signInGoogle(){
  await loadFirebase();
  const provider=new authApi.GoogleAuthProvider();
  provider.setCustomParameters({prompt:'select_account'});
  const result=await authApi.signInWithPopup(auth,provider);
  currentUser=result.user;
  callbacks.onSignedIn?.(currentUser);
  await refreshEntitlement(currentUser.uid);
  await syncCloudNow();
  return currentUser;
}

export async function signOutGoogle(){
  await loadFirebase();
  await authApi.signOut(auth);
  currentUser=null;
  currentEntitlement={};
  callbacks.onSignedIn?.(null);
  callbacks.onEntitlement?.(signedOutAccess());
  status('signed-out','Cloud sync off • local data stays on this device');
}

export async function initCloudSync(options){
  callbacks={...callbacks,...options};
  if(navigator.onLine===false){
   currentEntitlement={};callbacks.onEntitlement?.(signedOutAccess());
   status('offline','Offline • local scoring still works');return
  }
  try{
    await loadFirebase();
    authApi.onAuthStateChanged(auth,async user=>{
      currentUser=user||null;
      callbacks.onSignedIn?.(currentUser);
      if(currentUser){try{await refreshEntitlement(currentUser.uid);await syncCloudNow()}catch{}}
      else{currentEntitlement={};callbacks.onEntitlement?.(signedOutAccess());status('signed-out','Sign in with Google to sync across devices')}
    });
  }catch(e){status('error',e?.message||'Cloud sync unavailable')}
}

export function startCloudSyncWatch(){
  window.addEventListener('online',()=>{if(currentUser)syncCloudNow().catch(()=>{});else initCloudSync(callbacks)});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&currentUser)syncCloudNow().catch(()=>{})});
  setInterval(()=>{if(currentUser&&navigator.onLine!==false)syncCloudNow().catch(()=>{})},60000);
}
