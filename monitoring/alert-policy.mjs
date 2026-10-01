export function issueKey(issues=[]){return issues.map(x=>x.name+'='+x.message).sort().join('|')}

export function runtimeDiagnosticOnly(issues=[]){
 const allowed=new Set(['Health API','Runtime errors','Startup failures']);
 const names=new Set(issues.map(x=>x.name));
 const hasRuntime=names.has('Runtime errors')||names.has('Startup failures');
 return issues.length>0&&hasRuntime&&issues.every(x=>allowed.has(x.name));
}

export function alertCooldownFor(issues,normalCooldown,runtimeCooldown){
 return runtimeDiagnosticOnly(issues)?runtimeCooldown:normalCooldown;
}

export function shouldSendAlert({issues=[],lastIssues=[],lastAlertAt=0,now=Date.now(),normalCooldown,runtimeCooldown}){
 const key=issueKey(issues),lastKey=issueKey(lastIssues);
 if(key!==lastKey)return true;
 return now-Number(lastAlertAt||0)>=alertCooldownFor(issues,normalCooldown,runtimeCooldown);
}
