// Pure 30-day Popz Bowling Pro trial rules; no network, billing, or storage.
// Founder enrollment closed at the owner's explicit November 15 policy cutoff.
export const FOUNDER_CUTOFF_UTC='2026-11-15T18:12:36.000Z';
export const TRIAL_DAYS=30;
export const TRIAL_MS=TRIAL_DAYS*24*60*60*1000;
const cutoffMs=Date.parse(FOUNDER_CUTOFF_UTC);
const validIso=s=>typeof s==='string'&&
 /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(s)&&
 Number.isFinite(Date.parse(s));

export function trialWindow(firstUseAt,nowMs=Date.now()){
 if(!validIso(firstUseAt)||!Number.isFinite(nowMs))return null;
 const parsed=Date.parse(firstUseAt);
 // The owner-approved cutoff is the earliest trial activation anchor.
 // A device clock in the future must not postpone expiration indefinitely.
 const startedMs=Math.max(cutoffMs,Math.min(parsed,nowMs));
 return {startedAt:new Date(startedMs).toISOString(),
  expiresAt:new Date(startedMs+TRIAL_MS).toISOString()};
}

export function localTrialEntitlement(firstUseAt,lastSeenAt,nowMs=Date.now()){
 const safeNow=Math.max(nowMs,validIso(lastSeenAt)?Date.parse(lastSeenAt):nowMs);
 const window=trialWindow(firstUseAt,safeNow);
 if(!window)return null;
 return {plan:'pro',status:'trial',source:'installation',
  trialStartedAt:window.startedAt,expiresAt:window.expiresAt,
  daysRemaining:Math.max(0,Math.ceil((Date.parse(window.expiresAt)-safeNow)/86400000))};
}

export function activeTrialDays(expiresAt,nowMs=Date.now()){
 if(!validIso(expiresAt)||!Number.isFinite(nowMs))return 0;
 return Math.max(0,Math.ceil((Date.parse(expiresAt)-nowMs)/86400000));
}

export const trialCutoffMs=()=>cutoffMs;
