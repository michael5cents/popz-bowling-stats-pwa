import {mergeBowlingStates} from './transfer.mjs';

const isRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const fail=(path,message)=>{throw new Error(`Invalid bowling backup: ${path} ${message}. Your saved data has not been changed.`)};
const record=(value,path)=>{if(!isRecord(value))fail(path,'must be an object');return value};
const id=(value,path)=>{if(typeof value!=='string'||!value.trim())fail(path,'must be a nonempty text ID')};
const optionalText=(value,path)=>{if(value!=null&&typeof value!=='string')fail(path,'must be text')};
const optionalNumber=(value,path,{min=-Infinity,max=Infinity,integer=false,blank=false}={})=>{
 if(value==null||(blank&&value===''))return;
 if((typeof value!=='number'&&typeof value!=='string')||String(value).trim()===''||!Number.isFinite(Number(value))||Number(value)<min||Number(value)>max||(integer&&!Number.isInteger(Number(value))))fail(path,'has an invalid number');
};
const optionalTime=(value,path)=>{optionalText(value,path);if(value&& !Number.isFinite(Date.parse(value)))fail(path,'has an invalid date')};
const optionalBoolean=(value,path)=>{if(value!=null&&typeof value!=='boolean')fail(path,'must be true or false')};
const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));

function validateSetup(value,path){
 if(value==null)return;
 record(value,path);optionalText(value.ballUsed,path+' ball');
 for(const key of ['standBoard','targetBoard'])optionalNumber(value[key],path+' '+key,{min:0,max:60,blank:true});
}
function validateFrame(frame,index,path){
 record(frame,path);
 const rolls=frame.rolls;
 if(!Array.isArray(rolls))fail(path+' rolls','must be an array');
 if(rolls.length>(index===9?3:2))fail(path,'has too many rolls');
 if(rolls.some(pin=>!Number.isInteger(pin)||pin<0||pin>10))fail(path,'has an invalid pin count');
 if(index<9){
  if(rolls.length===2&&(rolls[0]===10||rolls[0]+rolls[1]>10))fail(path,'has an impossible roll sequence');
 }else{
  if(rolls.length>=2&&rolls[0]!==10&&rolls[0]+rolls[1]>10)fail(path,'has an impossible second roll');
  if(rolls.length===3){
   if(rolls[0]!==10&&rolls[0]+rolls[1]!==10)fail(path,'has an unearned fill ball');
   if(rolls[0]===10&&rolls[1]!==10&&rolls[1]+rolls[2]>10)fail(path,'has an impossible fill ball');
  }
 }
 if(frame.leave!=null){
  if(!Array.isArray(frame.leave)||frame.leave.some(pin=>!Number.isInteger(pin)||pin<1||pin>10)||new Set(frame.leave).size!==frame.leave.length)fail(path+' standing pins','must be unique pin numbers from 1 to 10');
 }
 optionalBoolean(frame.split,path+' split flag');
 validateSetup(frame.firstBallSetup,path+' first-ball setup');
}
function validateGame(game,path){
 record(game,path);id(game.id,path+' ID');
 if(!Array.isArray(game.frames)||game.frames.length!==10)fail(path+' frames','must contain exactly 10 frames');
 game.frames.forEach((frame,index)=>validateFrame(frame,index,path+' frame '+(index+1)));
 for(const key of ['ballUsed','lane'])optionalText(game[key],path+' '+key);
 for(const key of ['createdAt','updatedAt','_telemetryCompletedAt'])optionalTime(game[key],path+' '+key);
 validateSetup(game.currentFirstBallSetup,path+' current setup');
}
function validateSession(session,path){
 record(session,path);id(session.id,path+' ID');
 if(!Array.isArray(session.games))fail(path+' games','must be an array');
 const gameIds=new Set();
 session.games.forEach((game,index)=>{
  validateGame(game,path+' game '+(index+1));
  if(gameIds.has(game.id))fail(path,'contains duplicate game IDs');
  gameIds.add(game.id);
 });
 for(const key of ['bowlerId','bowlerName','date','center','league','oilPattern','name','ballUsed','groupSessionId'])optionalText(session[key],path+' '+key);
 for(const key of ['createdAt','updatedAt','finishedAt'])optionalTime(session[key],path+' '+key);
 optionalNumber(session.enteringAverage,path+' entering average',{min:0,max:300,blank:true});
 optionalNumber(session.handicapPct,path+' handicap percent',{min:0,max:1000,blank:true});
 optionalNumber(session.handicapBase,path+' handicap base',{min:0,max:1000,blank:true});
 optionalNumber(session.gameCount,path+' target game count',{min:1,max:12,integer:true});
 optionalNumber(session.groupOrder,path+' bowler order',{min:0,max:11,integer:true});
 if(session._telemetry!=null){
  const telemetry=record(session._telemetry,path+' telemetry metadata');
  optionalNumber(telemetry.version,path+' telemetry version',{min:0,integer:true});
  optionalText(telemetry.originDeviceId,path+' telemetry origin');
  optionalBoolean(telemetry.eligible,path+' telemetry eligibility');
  optionalTime(telemetry.startedAt,path+' telemetry start time');
  optionalTime(telemetry.firstRollAt,path+' telemetry first-roll time');
 }
}
function validateSettings(settings){
 if(settings==null)return;
 record(settings,'settings');
 for(const key of ['bowlerName','statsBowler','historyBowler','statsFilter','statsCenter','statsLane','statsBall','statsOil','scoringMode'])optionalText(settings[key],'settings '+key);
 optionalBoolean(settings.advancedShotTrackingEnabled,'advanced shot tracking preference');
 if(settings.bowlerProfiles!=null){
  if(!Array.isArray(settings.bowlerProfiles))fail('bowler profiles','must be an array');
  settings.bowlerProfiles.forEach((profile,index)=>{
   const path='bowler profile '+(index+1);record(profile,path);id(profile.id,path+' ID');optionalText(profile.name,path+' name');
  });
 }
 if(settings.leagueAverageRules!=null){
  record(settings.leagueAverageRules,'league average rules');
  for(const [name,rule] of Object.entries(settings.leagueAverageRules)){
   record(rule,'league average rule');optionalText(rule.name,'league average rule name');
   if(rule.mode!=null&&!['carry','establish'].includes(rule.mode))fail('league average rule','has an unknown mode');
   optionalNumber(rule.games,'league average rule game count',{min:0,integer:true});
   if(rule.mode==='establish'&&(!Number.isInteger(Number(rule.games))||Number(rule.games)<1))fail('league average rule','needs a positive game count');
  }
 }
}

// Validate before merging or writing IndexedDB. Unknown optional metadata is retained
// so valid older backups keep their original history and analytics.
export function validateBowlingBackup(value){
 record(value,'backup');
 if(!Array.isArray(value.sessions))fail('sessions','must be an array');
 const sessionIds=new Set();
 value.sessions.forEach((session,index)=>{
  validateSession(session,'series '+(index+1));
  if(sessionIds.has(session.id))fail('sessions','contain duplicate series IDs');
  sessionIds.add(session.id);
 });
 validateSettings(value.settings);
 if(value.deletedSessions!=null){
  if(!Array.isArray(value.deletedSessions))fail('deleted-history markers','must be an array');
  value.deletedSessions.forEach((marker,index)=>{
   const path='deleted-history marker '+(index+1);record(marker,path);id(marker.id,path+' ID');
   if(typeof marker.deletedAt!=='string'||!Number.isFinite(Date.parse(marker.deletedAt)))fail(path,'needs a valid deletion date');
  });
 }
 for(const key of ['updatedAt','settingsUpdatedAt','lastBackupAt'])optionalTime(value[key],key);
 return value;
}

export function prepareBackupImport(current,incoming,mergedAt=new Date().toISOString()){
 validateBowlingBackup(incoming);
 // Clone both sides: validation/preparation must never mutate the live state.
 const local=clone(current),backup=clone(incoming);
 // A sender's active selection and undo order belong only to that device.
 delete backup.rollUndo;delete backup.activeGroup;delete backup.activeSessionId;
 const merged=mergeBowlingStates(local,backup,mergedAt);
 merged.state.activeGroup=local.activeGroup??null;
 // Preparation retains receiver-owned metadata; the import handler creates a new
 // Undo boundary only on the candidate that is about to be committed.
 merged.state.rollUndo=local.rollUndo??null;
 validateBowlingBackup(merged.state);
 return merged;
}
