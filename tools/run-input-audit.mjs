// Actual keyboard/pointer transitions, with fixture setup only for result states.
import {launch,until} from './cdp.mjs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {mkdirSync,writeFileSync} from 'node:fs';
const target=process.argv[2]||'index.html',label=process.argv[3]||'after',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href,out='tools/out/run-input';mkdirSync(out,{recursive:true});
const checks=[],captures=[];let p,view;
const ok=async(name,expr)=>{const pass=!!await p.eval(expr);checks.push({view,name,pass});console.log(`${pass?'PASS':'FAIL'} ${view} ${name}`);};
const down=(key,repeat=false)=>p.call('Input.dispatchKeyEvent',{type:'keyDown',key,code:key===' '?'Space':key,autoRepeat:repeat});
const up=key=>p.call('Input.dispatchKeyEvent',{type:'keyUp',key,code:key===' '?'Space':key});
const press=async key=>{await down(key);await up(key);await p.eval('__step(.05)');};
const click=async id=>{const b=await p.eval(`__jewel.ui().hits.find(h=>h.id==='${id}')`);if(!b)throw Error('Missing '+id);await p.mouse('mousePressed',b.x+b.w/2,b.y+b.h/2);await p.mouse('mouseReleased',b.x+b.w/2,b.y+b.h/2);await p.eval('__step(.1)');};
const start=async(mode='puzzle')=>p.eval(`__jewel.challenge('${mode}',{puzzle:0,seed:1});__step(2)`);
try{
 for(const[n,v]of [{name:'desktop',width:1280,height:800},{name:'phone',width:390,height:844,webgl:true},{name:'landscape',width:568,height:320,webgl:true},{name:'tiny',width:320,height:480,webgl:true}].entries()){
  view=v.name;p=await launch({port:9834+n,...v});await p.goto(base+(v.webgl?'?webgl':'')+'#solo=1');await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});
  await p.eval('(()=>{let clock=performance.now();performance.now=()=>clock;window.__step=s=>{clock+=s*1000;__jewel.advance(s);};__step(0);})()');
  // Use the real Play menu, scroll and pointer target. Same actions as baseline.
  await click('play');for(let i=0;i<12;i++){const b=await p.eval("__jewel.ui().hits.find(h=>h.id==='exp-puzzle-0')");if(b&&b.y>100&&b.y+b.h<v.height-60)break;await p.call('Input.dispatchMouseEvent',{type:'mouseWheel',x:v.width/2,y:v.height/2,deltaX:0,deltaY:150});await p.eval('__step(.1)');}await click('exp-puzzle-0');await p.eval('__step(2)');
  await ok('Play picker starts puzzle with board focus','!__jewel.app.panelOpen&&__jewel.expedition().run.mode==="puzzle"&&__jewel.app.ui.focus===null');
  await press('ArrowUp');await press(' ');await ok('first Space selects gem instead of reopening Settings','!__jewel.app.panelOpen&&__jewel.app.selected===19');
  const file=`${out}/${label}-${v.width}-board-input.png`;await p.shot(file);captures.push({file,at:new Date().toISOString(),viewport:[v.width,v.height],seed:1,state:await p.eval('({selected:__jewel.app.selected,cell:__jewel.app.keyboardCell,score:__jewel.state().score,moves:__jewel.state().moves,focus:__jewel.app.ui.focus,panel:__jewel.app.panelOpen})')});
  // Solve using only actual keyboard events after fresh start.
  await start();for(let i=0;i<3;i++)await press('ArrowUp');for(let i=0;i<2;i++)await press('ArrowLeft');await press(' ');await press('ArrowRight');await press(' ');await p.eval('__step(4)');
  await ok('keyboard-only puzzle earns score and completes','__jewel.state().score===150&&__jewel.state().moves===1&&__jewel.expedition().run.finished');
  await p.eval('__jewel.app.ui.focus="exp-next-puzzle"');await down('Enter');await p.eval('__step(2)');await down('Enter',true);
  await ok('held result activation cannot select on next board','__jewel.expedition().run.puzzle===1&&!__jewel.expedition().run.finished&&__jewel.app.selected===-1&&__jewel.app.ui.focus===null');
  await up('Enter');await press('Enter');await ok('fresh Enter selects after result activation release','__jewel.app.selected===__jewel.app.keyboardCell');
  for(const mode of ['zen','timed','moves','daily','puzzle']){await p.eval('__jewel.app.ui.focus="settings"');await start(mode);await ok(mode+' accepted start clears focus','__jewel.app.ui.focus===null&&__jewel.app.selected===-1');const cell=await p.eval('__jewel.app.keyboardCell'),next=cell%8?cell-1:cell;await press('ArrowLeft');await press(' ');await ok(mode+' arrows and Space control board',`__jewel.app.keyboardCell===${next}&&__jewel.app.selected===${next}&&!__jewel.app.panelOpen`);}
  // A pointer start while Space is down must not carry a repeat into the board.
  await start();await down(' ');await click('play');await click('exp-mode-zen');await p.eval('__step(2)');await down(' ',true);await ok('pointer start latches a held Space','__jewel.app.selected===-1&&__jewel.app.runStartKeys.has(" ")');await up(' ');await press(' ');await ok('pointer-start release restores Space','__jewel.app.selected>=0');
  // Ordinary panel close retains keyboard return focus.
  await click('settings');await press('Escape');await ok('ordinary Back retains Settings focus','!__jewel.app.panelOpen&&__jewel.app.ui.focus==="settings"');await press('Enter');await ok('Settings remains keyboard reachable','__jewel.app.panelOpen');await press('Escape');await press('Escape');
  // Lost keyup cannot manufacture a fresh activation.
  await start();await down('Enter');await start();await p.eval('dispatchEvent(new Event("blur"))');await down('Enter',true);await ok('orphan repeat after blur ignored','__jewel.app.selected===-1');await up('Enter');await press('Enter');await ok('fresh input recovers after blur','__jewel.app.selected>=0');
  await start();await p.eval('__jewel.app.ui.focus="settings";window.__oldRun=__jewel.expedition().run.id;__jewel.app.coop.electing=true;__jewel.challenge("puzzle",{puzzle:1})');await ok('rejected handoff start preserves focus and run','__jewel.app.ui.focus==="settings"&&__jewel.expedition().run.id===__oldRun');await p.eval('__jewel.app.coop.electing=false');
  await ok('runtime and geometry clean','__jewel.diagnostics().errors.length===0&&__jewel.diagnostics().nonfiniteActors.length===0');
  await ok('requested renderer',`__jewel.diagnostics().backend==='${v.webgl?'WebGL 2':'WebGPU'}'`);p.kill();p=null;
 }
}finally{p?.kill();writeFileSync(`${out}/${label}-checks.json`,JSON.stringify({checks,captures},null,2));}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
