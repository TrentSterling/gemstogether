// Both GPU backends, desktop/phone panels, keyboard and gamepad navigation.
import {launch,sleep,until} from './cdp.mjs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=pathToFileURL(resolve('index.html')).href,J='window.__jewel',out='tools/out/expedition';mkdirSync(out,{recursive:true});
let pass=0,fail=0;const receipts=[];const ok=(name,v)=>{v?pass++:fail++;receipts.push({name,pass:!!v});console.log(`${v?'PASS':'FAIL'} ${name}`);};
for(const [w,h,gl]of [[1280,800,false],[390,844,false],[1280,800,true],[390,844,true]]){
 let p;const name=(gl?'webgl':'webgpu')+'-'+w;
 try{
  p=await launch({port:9950+(gl?2:0)+(w===390?1:0),width:w,height:h});await p.browser('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:resolve(out)});await p.goto(base+(gl?'?webgl=1':'')+'#solo=1');await until(()=>p.eval(`!!${J}?.ready`),{timeout:60000,label:name+' boot'});await until(()=>p.eval(`${J}.app.phase==='idle'`),{timeout:20000,label:'idle'});
  ok(name+' correct backend',await p.eval(`${J}.diagnostics().backend.includes(${JSON.stringify(gl?'WebGL':'WebGPU')})`));await p.shot(out+'/'+name+'-board.png');
  for(const tab of ['journey','play','moments','comfort','music-toys']){
   await p.eval(`${J}.app.openPanel(${JSON.stringify(tab)})`);await sleep(120);const ui=await p.eval(`${J}.ui()`);
   ok(name+' '+tab+' has reachable controls',ui.hits.some(b=>b.id==='close')&&ui.hits.filter(b=>b.kind==='button').every(b=>b.x>=0&&b.y>=0&&b.x+b.w<=w+1&&b.y+b.h<=h+1));
   await p.shot(out+'/'+name+'-'+tab+'.png');await p.eval(`${J}.app.ui.scroll=${ui.maxScroll}`);await sleep(100);ok(name+' '+tab+' scroll renders clean',!(await p.eval(`${J}.diagnostics()`)).errors.length);
  }
  // Standard gamepad signals feed the real pollPad path; no USB controller required.
  await p.eval(`(()=>{const a=${J}.app;a.openPanel('play');window.__auditPad={connected:true,index:0,id:'DualSense Wireless Controller',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__auditPad]});a.ui.focus='exp-tab-comfort';})()`);
  await sleep(100);await p.eval(`window.__auditPad.buttons[0].pressed=true`);await sleep(150);await p.eval(`window.__auditPad.buttons[0].pressed=false`);ok(name+' controller selects menu',await p.eval(`${J}.ui().tab==='comfort'`));
  await p.eval(`${J}.app.openPanel('play')`);await sleep(150);await p.shot(out+'/'+name+'-controller.png');await p.eval(`window.__auditPad.buttons[1].pressed=true`);await sleep(150);await p.eval(`window.__auditPad.buttons[1].pressed=false`);ok(name+' controller returns to game',await p.eval(`!${J}.ui().panel`));
  await p.eval(`delete navigator.getGamepads;${J}.app.padState.id=null;${J}.app.ui.focus=null`);await p.call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'});await p.call('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight'});ok(name+' keyboard still moves cursor',await p.eval(`${J}.app.keyboardCell===28`));
  await p.eval(`${J}.challenge('moves',{seed:1})`);await until(()=>p.eval(`${J}.app.phase==='idle'`),{timeout:20000});await p.eval(`${J}.app.board.moves=29;${J}.swap(1,2)`);await until(()=>p.eval(`${J}.expedition().run.finished`),{timeout:20000,label:'run end'});await p.shot(out+'/'+name+'-end.png');ok(name+' run-end buttons remain usable',await p.eval(`${J}.ui().hits.some(h=>h.id==='exp-endless'&&h.h>=38)`));
  await p.eval(`${J}.app.expedition.enterPhoto();${J}.app.ui.activate('exp-photo-save')`);await until(()=>p.eval(`!!${J}.app.expedition.lastPhoto`),{timeout:12000,label:'export'});ok(name+' PNG capture works',await p.eval(`${J}.app.expedition.lastPhoto.size>10000`));await p.eval(`${J}.app.closePanel()`);
  ok(name+' no GPU or script errors',!(await p.eval(`${J}.diagnostics()`)).errors.length&&!p.logs.some(l=>l.startsWith('EXCEPTION')));
 }catch(error){fail++;console.error(name,error.stack);if(p)console.log(p.logs.slice(-6));}finally{p?.kill();}
}
writeFileSync(out+'/visual-results.json',JSON.stringify({pass,fail,receipts},null,2));console.log(`${pass} passed, ${fail} failed`);process.exitCode=fail?1:0;
