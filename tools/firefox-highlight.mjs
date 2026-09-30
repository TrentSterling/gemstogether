// Isolated Firefox profile; never automates the player's existing browser.
// Firefox's native WebDriver BiDi: https://developer.mozilla.org/en-US/docs/Web/WebDriver/How_to/Create_BiDi_connection
import {spawn} from 'node:child_process';
import {mkdtempSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {sleep,until} from './cdp.mjs';
const profile=mkdtempSync(join(tmpdir(),'gems-firefox-')),out='tools/out/highlights';mkdirSync(out,{recursive:true});
writeFileSync(join(profile,'user.js'),'user_pref("browser.shell.checkDefaultBrowser",false);\nuser_pref("media.autoplay.default",0);\n');
const proc=spawn('C:/Program Files/Mozilla Firefox/firefox.exe',['--headless','--no-remote','--profile',profile,'--remote-debugging-port','9968','about:blank'],{stdio:['ignore','ignore','pipe'],windowsHide:true});
let ws,log='',seq=0;const pending=new Map();proc.stderr.on('data',b=>log+=b.toString());
const send=(method,params={})=>new Promise((res,rej)=>{const id=++seq;pending.set(id,{res,rej});ws.send(JSON.stringify({id,method,params}));});
try{
 await until(async()=>{const trial=new WebSocket('ws://127.0.0.1:9968/session');return await new Promise(resolve=>{trial.onopen=()=>{ws=trial;resolve(true);};trial.onerror=()=>{trial.close();resolve(false);};});},{timeout:30000,label:'Firefox remote agent'});
 ws.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.type==='error'?p.rej(new Error(m.message)):p.res(m.result);}};
 await send('session.new',{capabilities:{}});const tree=await send('browsingContext.getTree',{}),context=tree.contexts[0].context;
 await send('browsingContext.setViewport',{context,viewport:{width:1280,height:800}});
 await send('browsingContext.navigate',{context,url:pathToFileURL(resolve('index.html')).href+'#solo=1',wait:'complete'});
 const evaluate=async expression=>{const r=await send('script.evaluate',{expression:`(async()=>JSON.stringify(await (${expression})))()`,target:{context},awaitPromise:true});if(r.type==='exception')throw new Error(r.exceptionDetails.text);return JSON.parse(r.result.value);};
 await until(()=>evaluate('!!window.__jewel?.ready'),{timeout:60000,label:'Firefox game boot'});await until(()=>evaluate("__jewel.app.phase==='idle'"),{timeout:30000,label:'Firefox idle'});
 await evaluate('(async()=>{await __jewel.app.audio.start();return true;})()');await until(()=>evaluate('__jewel.announcer().speaking'),{timeout:10000,label:'Firefox Silver playback'});
 const voice=await evaluate(`(()=>{const a=__jewel.app,n=a.announcer;return {profile:n.info().profile,key:n.history.at(-1)?.key,duration:n.source.buffer.duration,errors:n.stats.errors};})()`);
 await evaluate(`(()=>{const a=__jewel.app;a.announcer.request('supernova',{priority:3});a.ui.activate('announcer-on');return true;})()`);await sleep(850);
 const disabled=await evaluate(`(()=>{const a=__jewel.app,n=a.announcer;return !n.info().enabled&&!n.source&&!n.pending&&!a.prefs.muted&&n.info().duck>.98&&JSON.parse(localStorage.getItem('gemstogether-settings-v1')).announcer===false;})()`);
 await evaluate(`(()=>{const a=__jewel.app;a.debugManual=true;a.prefs.muted=true;a.prefs.motion=false;a.prefs.particles=false;a.expedition.tourVisible=false;a.ui.toastUntil=0;a.selected=27;a.hover=27;a.keyboardActive=true;a.keyboardCell=27;for(const [i,type]of [[27,0],[26,2],[28,5],[19,4],[35,3]]){a.board.cells[i].type=type;a.getActor(i).tile.type=type;}__jewel.advance(.4);a.fx.beat=1;a.fx.flow=1;a.draw();return true;})()`);
 await sleep(150);const preview=await send('browsingContext.captureScreenshot',{context,origin:'viewport'});writeFileSync(out+'/firefox-preview.png',Buffer.from(preview.data,'base64'));
 const receipt=await evaluate(`(()=>{const a=__jewel.app,d=__jewel.diagnostics();return {browser:navigator.userAgent,backend:d.backend,errors:d.errors,previewCells:[27,26,28,19,35].map(i=>({i,type:a.getActor(i).tile.type,loops:gemContours(a.getActor(i),a).length})),framePulse:a.renderer.uniforms[19],singleFocus:typeof a.ui.drawPadCursor==='undefined'};})()`);
 await evaluate('(()=>{const a=__jewel.app;a.selected=-1;a.hover=-1;a.keyboardActive=false;a.draw();return true;})()');await sleep(150);const frame=await send('browsingContext.captureScreenshot',{context,origin:'viewport'});writeFileSync(out+'/firefox-frame.png',Buffer.from(frame.data,'base64'));
 receipt.voice={...voice,disabled};receipt.pass=receipt.errors.length===0&&receipt.previewCells.every(c=>c.loops===1)&&receipt.framePulse>0&&receipt.singleFocus&&voice.profile==='silver'&&voice.key==='welcome'&&voice.duration>1&&voice.errors===0&&disabled;
 writeFileSync(out+'/firefox-results.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));if(!receipt.pass)process.exitCode=1;
}catch(error){console.error(error.stack,log.slice(-1500));process.exitCode=1;}finally{if(ws?.readyState===WebSocket.OPEN){try{await Promise.race([send('browser.close'),sleep(2000)]);}catch{}ws.close();}if(proc.exitCode===null)proc.kill();}
