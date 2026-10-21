// Real selection input, safe presentation, all modes and compact layouts.
import {launch,until,sleep} from './cdp.mjs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {mkdirSync,writeFileSync} from 'node:fs';
const out='tools/out/special-guide',checks=[];mkdirSync(out,{recursive:true});let p;
const ok=(name,pass)=>{checks.push({name,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
const press=async key=>{await p.call('Input.dispatchKeyEvent',{type:'keyDown',key});await p.call('Input.dispatchKeyEvent',{type:'keyUp',key});};
const touch=async cell=>{const[x,y]=await p.eval(`__jewel.project(${cell})`);await p.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await p.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
const shot=async name=>{await p.eval('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(true))))');await sleep(120);await p.shot(name);};
try{
 for(const[backend,query]of[['webgpu',''],['webgl','?webgl']]){
  p=await launch({port:backend==='webgpu'?9846:9847,width:390,height:844,mobile:true});await p.goto(pathToFileURL(resolve('index.html')).href+query+'#solo=1');await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});
  await p.eval(`(()=>{const origin=performance.now()-__jewel.app.time*1000;performance.now=()=>origin+__jewel.app.time*1000;window.__step=s=>__jewel.advance(s);})()`);
  for(const[seed,pair,special]of[[1,[28,36],1],[13,[53,61],2]]){
   await p.eval(`__jewel.challenge('zen',{seed:${seed}});__step(4)`);for(const cell of pair)await touch(cell);await p.eval('__step(8)');
   const cell=await p.eval(`__jewel.state().cells.findIndex(c=>c?.special===${special})`);ok(backend+' actual forge '+special,cell>=0&&await p.eval('__jewel.state().moves===1'));
   await touch(cell);await p.eval('__step(.1)');ok(backend+' touch selects '+special,await p.eval(`__jewel.app.selected===${cell}&&!!__jewel.app.ui.specialGuideLayout()`));
   const text=await p.eval('__jewel.app.ui.specialGemTip().text');ok(backend+' full rule '+special,text===(special===1?'Blast gem: match it to clear a 3 x 3 area.':'Prism: swap with a neighbour to clear its colour.'));
   ok(backend+' announced selection '+special,await p.eval('document.getElementById("accessibility-status").textContent')===text);
   await shot(`${out}/${backend}-touch-${special}.png`);
   await p.eval('document.getElementById("accessibility-status").textContent="Later status";__step(.1)');ok(backend+' redraw preserves later status '+special,await p.eval('document.getElementById("accessibility-status").textContent==="Later status"'));
   await press('Escape');await p.eval('__step(.1)');ok(backend+' Escape hides tip '+special,await p.eval('__jewel.app.ui.specialGuideLayout()===null'));
   await p.eval(`__jewel.app.keyboardCell=${cell};__jewel.app.ui.focus=null`);await press(' ');await p.eval('__step(.1)');ok(backend+' keyboard selection restores tip '+special,await p.eval(`__jewel.app.selected===${cell}&&document.getElementById('accessibility-status').textContent===${JSON.stringify(text)}`));
   if(special===2){const neighbour=cell%8<7?cell+1:cell-1;await press(neighbour>cell?'ArrowRight':'ArrowLeft');await press(' ');await p.eval('__step(8)');ok(backend+' prism swap still scores once',await p.eval('__jewel.state().moves===2&&__jewel.state().score>350&&__jewel.app.ui.specialGuideLayout()===null'));}
  }
  await p.eval(`__jewel.challenge('zen',{seed:13});__step(4)`);for(const cell of [53,61])await touch(cell);await p.eval('__step(8)');const cell=await p.eval('__jewel.state().cells.findIndex(c=>c?.special===2)');await touch(cell);await p.eval('__step(.1)');
  for(const[why,setup,restore]of[
   ['notice','a.toast("Priority notice")','u.toastUntil=-1000'],['panel','a.panelOpen=true','a.panelOpen=false'],['result','a.gameOver={}','a.gameOver=null'],['finished','e.run.finished=true','e.run.finished=false'],['cascade','a.phase="fall"','a.phase="idle"'],['auto','a.auto=true','a.auto=false'],['freeze','a.frozen=true','a.frozen=false'],['photo','e.photo={}','e.photo=null'],['AA','a.aaCompare=true','a.aaCompare=false'],['pending','n.pending={}','n.pending=null'],['election','n.electing=true','n.electing=false'],['spectator','n.publicRoom=true;n.synced=true;n.slot=0','n.publicRoom=false;n.slot=1'],['unsynced peer','n.role="peer";n.synced=false','n.role="solo";n.synced=true'],['About','document.getElementById("trontAbout").open=true','document.getElementById("trontAbout").open=false'],['announcement','e.announcement={at:a.time,duration:2}','e.announcement=null'],['combo','u.co={birth:a.time}','u.co=null']
  ]){
   const pass=await p.eval(`(()=>{const a=__jewel.app,e=a.expedition,n=a.coop,u=a.ui;${setup};const hidden=u.specialGuideLayout()===null;${restore};return hidden;})()`);ok(backend+' yields to '+why,pass);
  }
  const purity=await p.eval(`(()=>{const a=__jewel.app,e=a.expedition,u=a.ui,snapshot=()=>JSON.stringify({board:a.board.cells,score:a.board.score,moves:a.board.moves,profile:e.profile,run:e.run,prefs:a.prefs,selected:a.selected,toast:[u.toastMessage,u.toastUntil],save:localStorage.getItem('gemstogether-expedition-v1')});const before=snapshot();for(let i=0;i<4;i++)u.specialGuideLayout();return before===snapshot();})()`);ok(backend+' layout reads without gameplay/save changes',purity);
  for(const[w,h]of[[1280,800],[1024,600],[800,450],[568,320],[667,375],[390,844],[320,480],[280,360]]){
   await p.call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<500});await p.eval('__step(.1)');
   for(const mode of ['zen','timed','moves','daily','puzzle']){
    // Explicit layout fixture; real forging is exercised above.
    await p.eval(`(()=>{const a=__jewel.app;__jewel.challenge('${mode}',{seed:13,puzzle:1});__step(4);a.board.cells[27].special=2;a.selected=27;a.ui.toastUntil=-1000;__step(.1);})()`);
    const r=await p.eval('(()=>{const u=__jewel.app.ui,r=u.specialGuideLayout();return r&&{...r,cell:undefined,fits:r.lines.every(s=>u.measure(s,r.font)<=r.w-2*(r.padding??12))};})()');ok(`${backend} ${w}x${h} ${mode} readable safe card`,r&&r.fits&&r.font>=12);
   }
   await shot(`${out}/${backend}-${w}x${h}.png`);
  }
  await p.call('Emulation.setDeviceMetricsOverride',{width:667,height:375,deviceScaleFactor:1,mobile:false});await p.eval(`(()=>{const a=__jewel.app,u=a.ui;__jewel.challenge('zen',{seed:13});__step(4);a.board.cells[27].special=2;a.selected=27;u.toastUntil=-1000;u.lastCascade=3;a.comboEnd=a.time+.5;u.co=null;__step(0);})()`);
  await p.eval('__step(.3)');ok(backend+' late cascade plaque owns its visible tail',await p.eval('__jewel.app.ui.cE.al>0&&__jewel.app.ui.specialGuideLayout()===null'));await shot(`${out}/${backend}-cascade-tail.png`);await p.eval('__step(.9)');ok(backend+' tip returns after cascade tail',await p.eval('!!__jewel.app.ui.specialGuideLayout()'));
  await p.eval(`(()=>{__jewel.challenge('zen',{seed:13});__step(4);const a=__jewel.app;a.board.cells[27].special=2;a.keyboardCell=27;a.ui.toastUntil=-1000;window.__pad={id:'A19 standard pad',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[__pad]});__step(0);__step(8);})()`);
  await p.eval('__pad.buttons[0].pressed=true;__step(.05);__pad.buttons[0].pressed=false;__step(.05)');ok(backend+' pad selects with unchanged A release',await p.eval('__jewel.app.selected===27&&!!__jewel.app.ui.specialGuideLayout()'));
  await p.eval('__pad.buttons[1].pressed=true;__step(.05);__pad.buttons[1].pressed=false;__step(.05)');ok(backend+' pad B dismisses tip',await p.eval('__jewel.app.selected===-1&&__jewel.app.ui.specialGuideLayout()===null'));
  ok(backend+' clean runtime',await p.eval('__jewel.diagnostics().errors.length===0')&&!p.logs.some(s=>s.startsWith('EXCEPTION')));p.kill();p=null;
 }
}finally{p?.kill();writeFileSync(out+'/checks.json',JSON.stringify(checks,null,2));}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
