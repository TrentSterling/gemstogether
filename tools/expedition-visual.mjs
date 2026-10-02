// Both GPU backends, mobile touch/rotation, panels, keyboard and gamepad navigation.
import {launch,sleep,until} from './cdp.mjs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=pathToFileURL(resolve('index.html')).href,J='window.__jewel',out='tools/out/expedition';mkdirSync(out,{recursive:true});
let pass=0,fail=0;const receipts=[];const ok=(name,v)=>{v?pass++:fail++;receipts.push({name,pass:!!v});console.log(`${v?'PASS':'FAIL'} ${name}`);};
const idle=p=>until(()=>p.eval(`${J}.app.phase==='idle'`),{timeout:20000,label:'settled board'});
async function touch(p,type,x,y){await p.call('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1,radiusX:6,radiusY:6,force:1}]});}
async function tap(p,x,y){await touch(p,'touchStart',x,y);await sleep(40);await touch(p,'touchEnd',x,y);await sleep(100);}
async function button(p,id){const hit=await until(()=>p.eval(`${J}.ui().hits.find(h=>h.id===${JSON.stringify(id)})`),{label:id});await tap(p,hit.x+hit.w/2,hit.y+hit.h/2);}
async function swipe(p,x,y,dy){await touch(p,'touchStart',x,y);for(let k=1;k<=8;k++){await touch(p,'touchMove',x,y+dy*k/8);await sleep(25);}await touch(p,'touchEnd',x,y+dy);await sleep(100);}
const aboutClear=p=>p.eval(`(()=>{const r=document.querySelector('#trontAbout>summary').getBoundingClientRect();return ${J}.ui().hits.every(b=>!(r.x<b.x+b.w&&b.x<r.right&&r.y<b.y+b.h&&b.y<r.bottom));})()`);
const hudClear=p=>p.eval(`(()=>{window.__layoutTexts.clear();${J}.app.draw();const ui=${J}.app.ui,top=Math.min(...ui.hits.filter(b=>['hint','play','journey','demo','sound','settings','coop-open'].includes(b.id)).map(b=>b.y)),rows=[...window.__layoutTexts.values()].filter(b=>/^STAGE |^RESONANCE!?$|seconds$|^Ghost |^Tap a gem|^neighbour to swap/.test(b.text)||b.text===${J}.app.fx.stageInfo().name);return rows.length>=4&&rows.every(b=>b.y>=0&&b.y+b.h<=top);})()`);
for(const [w,h,gl]of [[1280,800,false],[390,844,false],[1280,800,true],[390,844,true]]){
 let p;const name=(gl?'webgl':'webgpu')+'-'+w;
 try{
  p=await launch({port:9950+(gl?2:0)+(w===390?1:0),width:w,height:h,mobile:w===390,deviceScaleFactor:w===390?2:1});await p.browser('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:resolve(out)});await p.goto(base+(gl?'?webgl=1':'')+'#solo=1');await until(()=>p.eval(`!!${J}?.ready`),{timeout:60000,label:name+' boot'});await idle(p);
  ok(name+' correct backend',await p.eval(`${J}.diagnostics().backend.includes(${JSON.stringify(gl?'WebGL':'WebGPU')})`));await p.shot(out+'/'+name+'-board.png');
  await p.eval(`(()=>{const ui=${J}.app.ui,draw=ui.text;window.__menuHelp=[];window.__layoutTexts=new Map();ui.text=function(s,...args){window.__layoutTexts.set(s,{text:s,x:args[0],y:args[1],h:args[2],w:this.measure(s,args[2])});if(/to return|swipe for more|triggers to scroll/.test(s))window.__menuHelp.push(s);return draw.call(this,s,...args);};})()`);
  const play=await p.eval(`${J}.ui().hits.find(h=>h.id==='play')`);
  if(w===390)await button(p,'play');else{await p.mouse('mousePressed',play.x+play.w/2,play.y+play.h/2);await p.mouse('mouseReleased',play.x+play.w/2,play.y+play.h/2);}
  await sleep(120);ok(name+' board Play button opens challenges directly',await p.eval(`${J}.ui().panel&&${J}.ui().tab==='play'`));await p.eval(`${J}.app.closePanel()`);await sleep(120);
  if(w===390){
   await p.eval(`window.__touchDevices=[];window.addEventListener('pointerdown',e=>window.__touchDevices.push(e.pointerType),true)`);
   const pair=await p.eval(`${J}.state().legalMoves[0]`);for(const i of pair){const q=await p.eval(`${J}.project(${i})`);await tap(p,q[0],q[1]);}await idle(p);
   ok(name+' real touch tap-tap swap scores',await p.eval(`${J}.state().score>0&&${J}.expedition().profile.input.tap===1&&window.__touchDevices.every(x=>x==='touch')&&window.__touchDevices.length===2`));
   const saved=await p.eval(`${J}.net().hash`);await button(p,'play');await sleep(120);ok(name+' touch Play opens without resetting board',saved===await p.eval(`${J}.net().hash`));
   ok(name+' rendered phone footer gives swipe guidance',await p.eval(`window.__menuHelp.at(-1)==='Tap Back / swipe for more'`));
   let body=await p.eval(`${J}.app.ui.panelLayout().body`);await swipe(p,body.x+body.w/2,body.y+body.h*.7,-180);
   ok(name+' finger swipe scrolls without starting a challenge',await p.eval(`${J}.app.ui.scroll>100&&${J}.expedition().run.mode==='zen'`)&&saved===await p.eval(`${J}.net().hash`));
   await swipe(p,body.x+body.w/2,body.y+body.h*.3,180);await button(p,'exp-mode-timed');await idle(p);
   ok(name+' touch selects Timed and returns to board',await p.eval(`${J}.expedition().run.mode==='timed'&&!${J}.ui().panel&&${J}.state().moves===0`));
   await button(p,'play');await button(p,'close');ok(name+' touch Back closes panel',await p.eval(`!${J}.ui().panel`));
   await p.eval(`${J}.app.openPanel('announcer')`);await sleep(120);await button(p,'announcer-back');await p.eval(`${J}.app.openPanel('announcer')`);await sleep(120);
   ok(name+' voice footer names its Audio return button',await p.eval(`window.__menuHelp.at(-1)==='Tap Audio / swipe for more'`));await button(p,'announcer-back');ok(name+' touch voice return opens Audio',await p.eval(`${J}.ui().tab==='audio'`));await button(p,'close');
   await p.call('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:2,mobile:true});await until(()=>p.eval(`${J}.app.cssWidth===844&&${J}.app.cssHeight===390`),{label:'landscape resize'});await sleep(120);
   ok(name+' landscape keeps all seven board controls reachable',await p.eval(`${J}.ui().hits.filter(b=>['hint','play','journey','demo','sound','settings','coop-open'].includes(b.id)).length===7&&${J}.ui().hits.filter(b=>b.kind==='button').every(b=>b.x>=0&&b.y>=0&&b.x+b.w<=844&&b.y+b.h<=390)`));
   await p.eval(`${J}.app.expedition.profile.bests.timed={score:150,samples:[[0,0],[120,150]]};${J}.app.prefs.ghost=true;${J}.app.ui.toastUntil=0`);ok(name+' landscape stage, Resonance, timer and ghost clear the rail',await hudClear(p));
   await p.eval(`${J}.challenge('zen',{seed:1})`);await idle(p);await p.eval(`${J}.app.expedition.tourVisible=true;${J}.app.toast('Layout test')`);await sleep(200);ok(name+' landscape onboarding clears the rail',await hudClear(p));
   ok(name+' landscape notice fits the side space',await p.eval(`(()=>{const a=${J}.app,t=window.__layoutTexts.get('Layout test'),ui=a.ui,top=Math.min(...ui.hits.filter(b=>b.id==='play').map(b=>b.y));return t&&t.x-t.w/2>=ui.boardRect.x+ui.boardRect.w&&t.y+t.h<=top;})()`));
   ok(name+' landscape About link clears board controls',await aboutClear(p));await p.shot(out+'/'+name+'-landscape-board.png');
   await button(p,'play');ok(name+' touch Play works after rotation',await p.eval(`${J}.ui().tab==='play'`));await p.shot(out+'/'+name+'-landscape-play.png');await button(p,'close');
   await p.call('Emulation.setDeviceMetricsOverride',{width:390,height:600,deviceScaleFactor:2,mobile:true});await until(()=>p.eval(`${J}.app.cssWidth===390&&${J}.app.cssHeight===600`),{label:'short phone resize'});await sleep(120);ok(name+' short phone About link clears board controls',await aboutClear(p));await p.shot(out+'/'+name+'-short-phone.png');
   await p.call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:2,mobile:true});await until(()=>p.eval(`${J}.app.cssWidth===${w}&&${J}.app.cssHeight===${h}`),{label:'portrait resize'});await sleep(120);
  }
  for(const tab of ['journey','play','moments','comfort','music-toys']){
   await p.eval(`${J}.app.openPanel(${JSON.stringify(tab)})`);await sleep(120);const ui=await p.eval(`${J}.ui()`);
   ok(name+' '+tab+' has reachable controls',ui.hits.some(b=>b.id==='close')&&ui.hits.filter(b=>b.kind==='button').every(b=>b.x>=0&&b.y>=0&&b.x+b.w<=w+1&&b.y+b.h<=h+1));
   await p.shot(out+'/'+name+'-'+tab+'.png');await p.eval(`${J}.app.ui.scroll=${ui.maxScroll}`);await sleep(100);ok(name+' '+tab+' scroll renders clean',!(await p.eval(`${J}.diagnostics()`)).errors.length);
  }
  // Standard gamepad signals feed the real pollPad path; no USB controller required.
  await p.eval(`(()=>{const a=${J}.app;a.openPanel('play');window.__auditPad={connected:true,index:0,id:'DualSense Wireless Controller',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__auditPad]});a.ui.focus='exp-tab-comfort';})()`);
  await sleep(100);await p.eval(`window.__auditPad.buttons[0].pressed=true`);await sleep(150);await p.eval(`window.__auditPad.buttons[0].pressed=false`);ok(name+' controller selects menu',await p.eval(`${J}.ui().tab==='comfort'`));
  ok(name+' rendered footer follows PlayStation controls',await p.eval(`window.__menuHelp.at(-1)==='Circle to return / triggers to scroll'`));
  await p.eval(`${J}.app.openPanel('play')`);await sleep(150);await p.shot(out+'/'+name+'-controller.png');await p.eval(`window.__auditPad.buttons[1].pressed=true`);await sleep(150);await p.eval(`window.__auditPad.buttons[1].pressed=false`);ok(name+' controller returns to game',await p.eval(`!${J}.ui().panel`));
  // Touch swaps move the keyboard cursor too. Start this independent input check at a known cell.
  await p.eval(`delete navigator.getGamepads;${J}.app.padState.id=null;${J}.app.ui.focus=null;${J}.app.keyboardCell=27`);await p.call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'});await p.call('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight'});ok(name+' keyboard still moves cursor',await p.eval(`${J}.app.keyboardCell===28`));
  await p.eval(`${J}.app.openPanel('play')`);await sleep(120);ok(name+' rendered footer follows keyboard controls',await p.eval(`window.__menuHelp.at(-1)==='Esc to return / scroll for more'`));await p.eval(`${J}.app.closePanel()`);
  if(w===390){await button(p,'play');await p.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab'});await p.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab'});await sleep(120);ok(name+' keyboard Tab replaces touch guidance',await p.eval(`window.__menuHelp.at(-1)==='Esc to return / scroll for more'`));await p.eval(`${J}.app.closePanel()`);}
  await p.eval(`${J}.challenge('moves',{seed:1})`);await until(()=>p.eval(`${J}.app.phase==='idle'`),{timeout:20000});await p.eval(`${J}.app.board.moves=29;${J}.swap(1,2)`);await until(()=>p.eval(`${J}.expedition().run.finished`),{timeout:20000,label:'run end'});await p.shot(out+'/'+name+'-end.png');ok(name+' run-end buttons remain usable',await p.eval(`${J}.ui().hits.some(h=>h.id==='exp-endless'&&h.h>=38)`));
  await p.eval(`${J}.app.expedition.enterPhoto();${J}.app.ui.activate('exp-photo-save')`);await until(()=>p.eval(`!!${J}.app.expedition.lastPhoto`),{timeout:12000,label:'export'});ok(name+' PNG capture works',await p.eval(`${J}.app.expedition.lastPhoto.size>10000`));await p.eval(`${J}.app.closePanel()`);
  ok(name+' no GPU or script errors',!(await p.eval(`${J}.diagnostics()`)).errors.length&&!p.logs.some(l=>l.startsWith('EXCEPTION')));
 }catch(error){fail++;console.error(name,error.stack);if(p)console.log(p.logs.slice(-6));}finally{p?.kill();}
}
writeFileSync(out+'/visual-results.json',JSON.stringify({pass,fail,receipts},null,2));console.log(`${pass} passed, ${fail} failed`);process.exitCode=fail?1:0;
