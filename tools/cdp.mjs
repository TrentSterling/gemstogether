// Owned, muted, headless Chrome only. CDP input never controls desktop input.
// Keep fresh profiles and lifecycle logs for failed-run diagnosis.
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {join,resolve,basename,dirname} from 'node:path';
const CHROME=process.env.CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe';
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function launch({port,width=1280,height=800,headless=true,mobile=false,deviceScaleFactor=1,maxLifetimeMs=240000}={}){
 if(headless!==true)throw Error('This release driver permits headless Chrome only');
 if(!/^(chrome(?:\.exe)?|google-chrome(?:-stable)?)$/i.test(basename(CHROME)))throw Error('Chrome binary required');
 if(!(maxLifetimeMs>0&&maxLifetimeMs<=600000))throw Error('Bounded lifetime required (up to 10 minutes)');
 const out=resolve('tools/out');mkdirSync(out,{recursive:true});
 const runDir=mkdtempSync(join(out,'chrome-launch-')),dir=join(runDir,'profile');mkdirSync(dir);
 const stdoutPath=join(runDir,'stdout.log'),stderrPath=join(runDir,'stderr.log'),receiptPath=join(runDir,'launch.json');
 writeFileSync(stdoutPath,'');writeFileSync(stderrPath,'');
 const args=['--headless=new','--remote-debugging-port=0','--user-data-dir='+dir,'--window-size='+width+','+height,
  '--enable-unsafe-webgpu','--enable-features=Vulkan','--disable-features=CalculateNativeWinOcclusion',
  '--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-background-timer-throttling',
  '--no-first-run','--no-default-browser-check','--autoplay-policy=no-user-gesture-required','--mute-audio','--hide-scrollbars'];
 const receipt={startedUtc:new Date().toISOString(),binary:CHROME,profile:dir,args,requestedPort:port??null,stdoutPath,stderrPath,attempts:1,status:'starting',exit:null};
 const save=()=>writeFileSync(receiptPath,JSON.stringify(receipt,null,2));save();
 const proc=spawn(CHROME,args,{stdio:['ignore','pipe','pipe'],windowsHide:true,shell:false});receipt.pid=proc.pid??null;save();
 let exited=false,closed=false,spawnError=null,ws=null,sessionId,seq=0,closing=false,closePromise=null;
 const pending=new Map(),logs=[];
 proc.stdout.on('data',d=>appendFileSync(stdoutPath,d));proc.stderr.on('data',d=>appendFileSync(stderrPath,d));
 proc.on('error',e=>{spawnError=e;receipt.error=String(e);save();});
 proc.once('exit',(code,signal)=>{exited=true;receipt.exit={code,signal,at:new Date().toISOString(),expected:closing};save();});
 const closedPromise=new Promise(r=>proc.once('close',()=>{closed=true;r();}));
 const rejectPending=error=>{for(const p of pending.values())p.reject(error);pending.clear();};
 function send(method,params={},session){
  if(method==='Page.bringToFront'||method==='Target.activateTarget')return Promise.reject(Error('Focus changes are disabled'));
  if(!ws||ws.readyState!==WebSocket.OPEN)return Promise.reject(Error('Debugger unavailable'));
  return new Promise((resolve,reject)=>{
   const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},15000);
   pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});
   try{ws.send(JSON.stringify({id,method,params,sessionId:session}));}catch(error){pending.get(id).reject(error);pending.delete(id);}
  });
 }
 function close(){
  if(closePromise)return closePromise;closing=true;
  return closePromise=(async()=>{
   receipt.status='closing';save();
   if(!closed&&ws?.readyState===WebSocket.OPEN){try{await Promise.race([send('Browser.close'),sleep(1500)]);}catch(error){receipt.closeMessage=String(error);}}
   // Windows may still be draining browser-owned services after Browser.close.
   // Allow bounded graceful shutdown; a forced or nonzero exit still fails.
   await Promise.race([closedPromise,sleep(10000)]);
   if(!closed&&!spawnError){receipt.ownedRootTerminationRequested=true;proc.kill();await Promise.race([closedPromise,sleep(2000)]);}
   ws?.close();rejectPending(Error('Owned Chrome session closed'));
   receipt.status=closed?(spawnError?'launch_failed':'owned_root_exit_verified'):'cleanup_unknown';receipt.finishedUtc=new Date().toISOString();save();
   if(!closed)throw Error('Owned Chrome cleanup unknown; stop further launches: '+receiptPath);
  })();
 }
 const lifetime=setTimeout(()=>{receipt.error='bounded_session_deadline';save();close().catch(error=>{receipt.cleanupError=String(error);save();});},maxLifetimeMs);
 try{
  let info;const deadline=Date.now()+15000;
  while(Date.now()<deadline){
   if(spawnError||exited||closed)throw spawnError||Error('Chrome exited during startup');
   try{
    const [activePort,browserPath]=readFileSync(join(dir,'DevToolsActivePort'),'utf8').trim().split(/\r?\n/),actualPort=Number(activePort);
    if(!Number.isInteger(actualPort)||actualPort<=0||!browserPath?.startsWith('/devtools/browser/'))throw Error('Debugger not ready');
    const candidate=await(await fetch('http://127.0.0.1:'+actualPort+'/json/version',{signal:AbortSignal.timeout(1000)})).json();
    if(new URL(candidate.webSocketDebuggerUrl).pathname!==browserPath)throw Error('Owned debugger identity mismatch');
    info=candidate;receipt.port=actualPort;break;
   }catch{await sleep(150);}
  }
  if(!info)throw Error('Chrome startup deadline; no automatic retry');
  ws=new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Chrome debugger deadline')),10000);ws.onopen=()=>{clearTimeout(timer);resolve();};ws.onerror=()=>{clearTimeout(timer);reject(Error('Chrome debugger error'));};});
  ws.onmessage=event=>{
   const m=JSON.parse(event.data);
   if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}
   else if(m.sessionId===sessionId){
    if(m.method==='Runtime.consoleAPICalled')logs.push(m.params.type+': '+m.params.args.map(a=>a.value??a.description??'').join(' '));
    if(m.method==='Runtime.exceptionThrown')logs.push('EXCEPTION: '+(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text));
    if(m.method==='Inspector.targetCrashed'){receipt.crashObserved=true;save();}
   }
  };
  ws.onclose=()=>{if(!closing){receipt.debuggerClosedUnexpectedly=true;save();}rejectPending(Error('Chrome debugger closed'));};
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});
  sessionId=(await send('Target.attachToTarget',{targetId,flatten:true})).sessionId;
  const call=(method,params={})=>{if(closing||spawnError||exited||receipt.error||receipt.crashObserved||receipt.debuggerClosedUnexpectedly)throw Error('Owned Chrome failure; stop operation');return send(method,params,sessionId);};
  await call('Page.enable');await call('Runtime.enable');await call('Log.enable');await call('Inspector.enable');
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor,mobile});
  if(mobile)await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  receipt.status='ready';receipt.browserVersion=info.Browser;save();
  return {logs,proc,dir,receipt,receiptPath,call,browser:send,
   goto:async url=>{const r=await call('Page.navigate',{url});if(r.errorText)throw Error('Navigation failed: '+r.errorText);return r;},
   eval:async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error('eval: '+(r.exceptionDetails.exception?.description||r.exceptionDetails.text));return r.result.value;},
   shot:async file=>{const {data}=await call('Page.captureScreenshot',{format:'png'});mkdirSync(dirname(file),{recursive:true});writeFileSync(file,Buffer.from(data,'base64'));return file;},
   mouse:(type,x,y,button='left',buttons=type==='mouseReleased'?0:({left:1,right:2,middle:4}[button]??0))=>call('Input.dispatchMouseEvent',{type,x,y,button,clickCount:1,buttons}),
   // Compatibility for legacy callers. Headless pages need no focus action.
   front:async()=>{},
   kill:async()=>{clearTimeout(lifetime);await close();if(receipt.error||receipt.crashObserved||receipt.debuggerClosedUnexpectedly||receipt.ownedRootTerminationRequested||receipt.exit?.code!==0||receipt.exit?.signal||receipt.exit?.expected!==true)throw Error('Chrome did not complete a clean owned session; inspect '+receiptPath);},
  };
 }catch(error){receipt.error=String(error);save();clearTimeout(lifetime);try{await close();}catch(cleanupError){receipt.cleanupError=String(cleanupError);save();}throw error;}
}
export async function until(fn,{timeout=30000,every=250,label='condition'}={}){
 const t0=Date.now();while(Date.now()-t0<timeout){const v=await fn();if(v)return v;await sleep(every);}throw Error('timeout waiting for '+label);
}
