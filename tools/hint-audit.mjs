// A01: real input plus geometry/lifecycle checks for the local hint cue.
// node tools/hint-audit.mjs [file|url] [capture-label]
import {launch,sleep,until} from './cdp.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const target=process.argv[2]||'index.html',label=process.argv[3]||'after';
const base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href;
const out=resolve('tools/out/hints');mkdirSync(out,{recursive:true});
const results=[];let current='';
function check(name,pass,detail){results.push({view:current,name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${current}: ${name}`);}
const views=[{name:'desktop',width:1280,height:900},{name:'phone',width:390,height:844,mobile:true,deviceScaleFactor:2},{name:'fallback',width:1280,height:900,webgl:true}];
for(let n=0;n<views.length;n++){
 const v=views[n];current=v.name;const p=await launch({port:9670+n,...v});
 try{
  await p.goto(base+(v.webgl?'?webgl':'')+'#solo=1');
  await until(()=>p.eval('window.__jewel?.ready'),{timeout:60000});
  await until(()=>p.eval('__jewel.state().phase==="idle"'));
  await p.eval(`(()=>{const a=__jewel.app;a.newBoard(1);a.expedition.dismissTour();__jewel.advance(2);a.ui.mouse.inside=false;
   if(a.ui.drawHintSwap){const original=a.ui.drawHintSwap;a.ui.drawHintSwap=function(){const line=this.ink.line;window.__hintLines=[];this.ink.line=function(...args){window.__hintLines.push(args);return line.apply(this,args);};try{return original.call(this);}finally{this.ink.line=line;}};}})()`);
  const state=()=>p.eval('JSON.stringify({cells:__jewel.state().cells,score:__jewel.state().score,moves:__jewel.state().moves,phase:__jewel.state().phase})');
  const before=await state();
  // Use the visible Hint button on touch, H on desktop.
  if(v.mobile){const h=await p.eval('__jewel.ui().hits.find(h=>h.id==="hint")');await p.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:h.x+h.w/2,y:h.y+h.h/2}]});await p.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await p.call('Input.dispatchKeyEvent',{type:'keyDown',key:'h',code:'KeyH'});await p.call('Input.dispatchKeyEvent',{type:'keyUp',key:'h',code:'KeyH'});}
  await p.eval('__jewel.advance(.1)');
  check('hint leaves board, score and move budget unchanged',(await state())===before);
  const info=await p.eval('({cells:__jewel.app.hintCells,lines:window.__hintLines,diag:__jewel.diagnostics()})');
  check('actual Hint selects a legal move',await p.eval('__jewel.state().legalMoves.some(m=>m.join()===__jewel.app.hintCells.join())'));
  if(label!=='before'){
   check('swap cue rendered',info.lines?.length>0);
   check('finite cue stays within viewport',info.lines?.every(l=>l.slice(0,4).every(Number.isFinite)&&l[0]>=0&&l[0]<=v.width&&l[2]>=0&&l[2]<=v.width&&l[1]>=0&&l[1]<=v.height&&l[3]>=0&&l[3]<=v.height));
  }
  await p.shot(`${out}/${label}-${v.name}.png`);
  if(label==='before')continue;
  // Static cue has the same geometry with reduced motion and flashes disabled.
  await p.eval('__jewel.app.prefs.motion=false;__jewel.app.prefs.flash="off";__jewel.app.prefs.highContrast=true;__jewel.advance(.25)');
  check('reduced motion retains static geometry',JSON.stringify(await p.eval('window.__hintLines'))===JSON.stringify(info.lines));
  await p.shot(`${out}/${label}-${v.name}-comfort.png`);
  if(v.mobile){await p.call('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:2,mobile:true});await sleep(300);await p.eval('__jewel.advance(.01)');check('phone rotation reprojects cue',await p.eval('window.__hintLines.length>0&&window.__hintLines.every(l=>l[0]>=0&&l[0]<=844&&l[1]>=0&&l[1]<=390&&l[2]>=0&&l[2]<=844&&l[3]>=0&&l[3]<=390)'));await p.shot(`${out}/${label}-phone-landscape.png`);}
  await p.eval('__jewel.app.openPanel("settings");__jewel.advance(.01)');check('hidden behind panels',await p.eval('window.__hintLines.length===0'));
  await p.eval('__jewel.app.closePanel();__jewel.advance(.01)');check('returns after panel closes',await p.eval('window.__hintLines.length>0'));
  const pair=await p.eval('__jewel.app.hintCells.map(i=>__jewel.project(i))');
  for(const [x,y]of pair){if(v.mobile){await p.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await p.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await p.mouse('mousePressed',x,y);await p.mouse('mouseReleased',x,y);}}
  await p.eval('__jewel.advance(.01)');check('hint clears as real swap starts',await p.eval('window.__hintLines.length===0&&__jewel.app.hintCells.length===0'));
  await p.eval('__jewel.resume()');await until(()=>p.eval('__jewel.state().phase==="idle"'));
  check('normal hinted swap scores',await p.eval('__jewel.state().score>0&&__jewel.state().moves===1'));
  await p.eval('__jewel.advance(0);__jewel.hint();__jewel.advance(4.1)');check('manual hint expires',await p.eval('window.__hintLines.length===0'));
  await p.eval('__jewel.advance(4)');check('idle hint receives the same cue',await p.eval('window.__hintLines.length>0'));
  await p.eval('__jewel.app.newBoard(43);__jewel.advance(2)');check('new board clears old hint',await p.eval('window.__hintLines.length===0'));
  // Exercise both directions and protect against wrapped/nonadjacent stale indices.
  for(const axis of ['horizontal','vertical']){await p.eval(`(()=>{const a=__jewel.app;a.hintCells=a.board.legalMoves().find(m=>${axis==='horizontal'?'m[1]-m[0]===1':'m[1]-m[0]===8'});a.hintUntil=a.time+4;__jewel.advance(.01);})()`);check(axis+' arrow points between projected neighbours',await p.eval(`(()=>{const a=__jewel.app,[u,v]=a.hintCells.map(i=>__jewel.project(i)),l=window.__hintLines[0];return l&&Math.abs((l[0]+l[2])/2-(u[0]+v[0])/2)<.01&&Math.abs((l[1]+l[3])/2-(u[1]+v[1])/2)<.01;})()`));}
  await p.eval('__jewel.app.hintCells=[7,8];__jewel.advance(.01)');check('row-wrap rejected',await p.eval('window.__hintLines.length===0'));
  check('runtime clean',await p.eval('__jewel.diagnostics().errors.length===0&&__jewel.diagnostics().nonfiniteActors.length===0'));
  check('requested backend',info.diag.backend===(v.webgl?'WebGL 2':'WebGPU'),info.diag.backend);
 }finally{p.kill();}
}
writeFileSync(`${out}/${label}-results.json`,JSON.stringify(results,null,2));
console.log(JSON.stringify({passed:results.filter(x=>x.pass).length,total:results.length}));
if(results.some(x=>!x.pass))process.exitCode=1;
