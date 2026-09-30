// Native Firefox BiDi, isolated profile. Tests the local-file player actually opened for Trent.
import {spawn} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {sleep,until} from './cdp.mjs';
const round=process.argv[2]||'processing-round7',tuning=round==='tuning-round9';
const plan=JSON.parse(readFileSync(resolve('tools/out/voices',round,'plan.json'),'utf8'));
const probe=plan.firefoxProbes||(tuning?{space:'crystal-tune',voice:'hard-tune',automatic:'crystal-low'}:{space:'deep-plate',voice:'deep-echo',automatic:'deep-room'});
const profile=mkdtempSync(join(tmpdir(),'gems-processing-firefox-')),out=resolve('tools/out/voices',round);
writeFileSync(join(profile,'user.js'),'user_pref("browser.shell.checkDefaultBrowser",false);\nuser_pref("media.autoplay.default",0);\n');
const proc=spawn('C:/Program Files/Mozilla Firefox/firefox.exe',['--headless','--no-remote','--profile',profile,'--remote-debugging-port','10022','about:blank'],{stdio:['ignore','ignore','pipe'],windowsHide:true});
let ws,log='',seq=0;const pending=new Map(),checks=[];proc.stderr.on('data',b=>log+=b.toString());
const send=(method,params={})=>new Promise((res,rej)=>{const id=++seq;pending.set(id,{res,rej});ws.send(JSON.stringify({id,method,params}));});
const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${name} ${detail===undefined?'':JSON.stringify(detail)}`);};
try{
 await until(async()=>{const trial=new WebSocket('ws://127.0.0.1:10022/session');return new Promise(r=>{trial.onopen=()=>{ws=trial;r(true);};trial.onerror=()=>{trial.close();r(false);};});},{timeout:30000,label:'Firefox remote agent'});
 ws.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.type==='error'?p.rej(new Error(m.message)):p.res(m.result);}};
 await send('session.new',{capabilities:{}});let tree=await send('browsingContext.getTree',{});const context=tree.contexts[0].context;
 const evaluate=async(expression,target=context)=>{const r=await send('script.evaluate',{expression:`(async()=>JSON.stringify(await (${expression})))()`,target:{context:target},awaitPromise:true});if(r.type==='exception')throw new Error(r.exceptionDetails.text);return JSON.parse(r.result.value);};
 await send('browsingContext.setViewport',{context,viewport:{width:1360,height:900}});
 await send('browsingContext.navigate',{context,url:pathToFileURL(out+'/index.html').href,wait:'complete'});
 await until(()=>evaluate('window.voiceProcessing?.ready===true'),{timeout:60000,label:'Firefox local file cabinet'});
 tree=await send('browsingContext.getTree',{});const child=tree.contexts[0].children.find(c=>c.url.includes('game.html')).context;
 check('local-file player and game boot',await evaluate('voiceProcessing.ready'));
 check('Firefox WebGL with no game errors',await evaluate('(()=>{const d=__jewel.diagnostics();return d.backend.includes("WebGL")&&!d.errors.length;})()',child),await evaluate('navigator.userAgent'));
 check('solo, separate save keys',await evaluate(`processingGame.info().solo&&__jewel.net().role==="solo"&&localStorage.getItem("gemstogether-${round}-settings-v1")!==null&&localStorage.getItem("gemstogether-settings-v1")===null`,child));
 const click=async selector=>{const xy=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return [Math.round(r.x+r.width/2),Math.round(r.y+r.height/2)];})()`);await send('input.performActions',{context,actions:[{type:'pointer',id:'mouse',parameters:{pointerType:'mouse'},actions:[{type:'pointerMove',x:xy[0],y:xy[1],duration:0},{type:'pointerDown',button:0},{type:'pointerUp',button:0}]}]});};
 await click(`[data-clip="${probe.space}/welcome-back"]`);await until(()=>evaluate('__jewel.app.announcer.source!==null',child),{timeout:10000,label:'Firefox processed speech'});
 check('real pointer starts processed game source',await evaluate(`processingGame.info().selected==="${probe.space}"&&__jewel.app.announcer.source.buffer.numberOfChannels===2&&__jewel.app.announcer.source.buffer.duration>2`,child));
 check('parent receives speech acknowledgement',await evaluate(`voiceProcessing.speaking&&voiceProcessing.selected==="${probe.space}"`));
 await sleep(150);check('same music ducking as production',await evaluate('__jewel.app.announcer.ducker.gain.value<.4',child));
 await click('#stop');await sleep(750);check('stop cancels full tail and restores music',await evaluate('__jewel.app.announcer.source===null&&__jewel.app.announcer.ducker.gain.value>.98',child)&&await evaluate('!voiceProcessing.speaking'));
 await evaluate('(()=>{document.querySelector("#mode").value="voice";document.querySelector("#mode").dispatchEvent(new Event("change"));return true;})()');
 await click(`[data-clip="${probe.voice}/resonance"]`);await until(()=>evaluate(`!document.querySelector("#speech").paused&&document.querySelector("#speech").currentSrc.endsWith("${probe.voice}-resonance.mp3")&&Number.isFinite(document.querySelector("#speech").duration)`),{timeout:10000,label:'Firefox voice alone'});
 check('voice-only audio really plays',await evaluate('document.querySelector("#speech").duration>2')&&await evaluate('__jewel.app.audio.muted',child));
 await click('#stop');await click('[data-reference="matched-welcome_back.wav"]');await until(()=>evaluate('!document.querySelector("#speech").paused'),{timeout:10000,label:'Firefox reference'});check('reference clip really plays',await evaluate('document.querySelector("#speech").duration>1'));
 await click('#stop');await click(`[data-id="${probe.space}"]`);check('favourite saves',await evaluate(`voiceProcessing.favourites.includes("${probe.space}")`));
 // All four audition calls in every preset decode in the target browser.
 const decoded=await evaluate('(async()=>{let count=0,max=0;for(const p of processingGame.presets)for(const key of ["welcome-back","brilliant","resonance","supernova"]){const b=await processingGame.decode(p.id,key);count++;max=Math.max(max,b.duration);}return {count,max};})()',child);
 check('all audition MP3s decode in Firefox',decoded.count===plan.presets.length*4&&decoded.max<8,decoded);
 await evaluate('(()=>{document.querySelector("#mode").value="game";document.querySelector("#mode").dispatchEvent(new Event("change"));return true;})()');
 await click(`[data-clip="${probe.automatic}/brilliant"]`);await sleep(150);await click('#automatic');await sleep(100);check('automatic announcements enabled',await evaluate('processingGame.info().automatic',child));await click('#automatic');
 await send('browsingContext.setViewport',{context,viewport:{width:390,height:844}});await sleep(250);check('phone page fits',await evaluate('document.documentElement.scrollWidth<=innerWidth'));
 const shot=await send('browsingContext.captureScreenshot',{context,origin:'viewport'});writeFileSync(out+'/firefox-phone.png',Buffer.from(shot.data,'base64'));
 await click('#stop');
}catch(error){check('Firefox audit completed',false,error.stack+' '+log.slice(-1000));}finally{if(ws?.readyState===WebSocket.OPEN){try{await Promise.race([send('browser.close'),sleep(2000)]);}catch{}ws.close();}if(proc.exitCode===null)proc.kill();}
const result={passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,checks};writeFileSync(out+'/firefox-results.json',JSON.stringify(result,null,2));console.log(`${result.passed} passed; ${result.failed} failed`);if(result.failed)process.exitCode=1;
