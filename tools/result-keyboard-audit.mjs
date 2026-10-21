// Actual keyboard/pointer transitions, with fixture setup only for result states.
import {launch,until} from './cdp.mjs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {mkdirSync,writeFileSync} from 'node:fs';
const target=process.argv[2]||'index.html',label=process.argv[3]||'after',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href,out='tools/out/result-keyboard';mkdirSync(out,{recursive:true});
const checks=[],captures=[];let p,view;
const ok=async(name,expr)=>{const pass=!!await p.eval(expr);checks.push({view,name,pass});console.log(`${pass?'PASS':'FAIL'} ${view} ${name}`);};
const down=(key,repeat=false)=>p.call('Input.dispatchKeyEvent',{type:'keyDown',key,code:key===' '?'Space':key,autoRepeat:repeat});
const up=key=>p.call('Input.dispatchKeyEvent',{type:'keyUp',key,code:key===' '?'Space':key});
const press=async key=>{await down(key);await up(key);await p.eval('__step(.05)');};
const click=async id=>{const b=await p.eval(`__jewel.ui().hits.find(h=>h.id==='${id}')`);if(!b)throw Error('Missing '+id);await p.mouse('mousePressed',b.x+b.w/2,b.y+b.h/2);await p.mouse('mouseReleased',b.x+b.w/2,b.y+b.h/2);await p.eval('__step(.1)');};
const shiftTab=async()=>{await p.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',modifiers:8});await p.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',modifiers:8});await p.eval('__step(.05)');};
const start=async(mode='puzzle')=>p.eval(`__jewel.challenge('${mode}',{puzzle:0,seed:1});__step(2)`);
try{
 for(const[n,v]of [{name:'desktop',width:1280,height:800},{name:'phone',width:390,height:844,webgl:true},{name:'landscape',width:568,height:320,webgl:true},{name:'tiny',width:320,height:480,webgl:true}].entries()){
  view=v.name;p=await launch({port:9834+n,...v});await p.goto(base+(v.webgl?'?webgl':'')+'#solo=1');await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});
  await p.eval('(()=>{let clock=performance.now();performance.now=()=>clock;window.__step=s=>{clock+=s*1000;__jewel.advance(s);};__step(0);const ui=__jewel.app.ui,draw=ui.drawGameOver;ui.drawGameOver=function(){const text=this.text;window.__resultText=[];this.text=function(...args){__resultText.push(args);return text.apply(this,args);};try{return draw.call(this);}finally{this.text=text;}};})()');
  // Use the real Play menu, scroll and pointer target. Same actions as baseline.
  await click('play');for(let i=0;i<12;i++){const b=await p.eval("__jewel.ui().hits.find(h=>h.id==='exp-puzzle-0')");if(b&&b.y>100&&b.y+b.h<v.height-60)break;await p.call('Input.dispatchMouseEvent',{type:'mouseWheel',x:v.width/2,y:v.height/2,deltaX:0,deltaY:150});await p.eval('__step(.1)');}await click('exp-puzzle-0');await p.eval('__step(2)');
  for(let i=0;i<3;i++)await press('ArrowUp');for(let i=0;i<2;i++)await press('ArrowLeft');await press(' ');await press('ArrowRight');await press(' ');await p.eval('__step(4)');
  await ok('actual keyboard puzzle complete','__jewel.state().score===150&&__jewel.state().moves===1&&__jewel.expedition().run.finished');
  await press('Tab');await ok('first Tab focuses Next puzzle','__jewel.app.ui.focus==="exp-next-puzzle"');
  await ok('focused result names Enter','__resultText.some(t=>t[0]==="Enter / Next puzzle")');
  await ok('result focus announced','document.getElementById("accessibility-status").textContent==="Next puzzle. Press Enter or Space."');
  const file=`${out}/${label}-${v.width}-result-tab.png`;await p.shot(file);captures.push({file,at:new Date().toISOString(),viewport:[v.width,v.height],seed:1,state:await p.eval('({score:__jewel.state().score,moves:__jewel.state().moves,focus:__jewel.app.ui.focus,run:__jewel.expedition().run})')});
  const ids=await p.eval('__jewel.ui().hits.map(h=>h.id)'),seen=[];for(let i=0;i<ids.length;i++){seen.push(await p.eval('__jewel.app.ui.focus'));await press('Tab');}
  checks.push({view,name:'forward traversal includes every control',pass:new Set(seen).size===ids.length&&ids.every(id=>seen.includes(id))});
  const reverse=[];for(let i=0;i<ids.length;i++){reverse.push(await p.eval('__jewel.app.ui.focus'));await shiftTab();}
  checks.push({view,name:'reverse traversal includes every control',pass:new Set(reverse).size===ids.length&&ids.every(id=>reverse.includes(id))});
  await down('Enter');await p.eval('__step(2)');await down('Enter',true);await ok('Enter advances once without new-board selection','__jewel.expedition().run.puzzle===1&&!__jewel.expedition().run.finished&&__jewel.app.selected===-1&&__jewel.app.ui.focus===null');await up('Enter');await press(' ');await ok('fresh board input after replay','__jewel.app.selected===__jewel.app.keyboardCell');
  // Hold the solving Space through completion, then enter the result with Tab.
  await start();await p.eval('__jewel.app.keyboardCell=1');await press(' ');await press('ArrowRight');await down(' ');await p.eval('__step(4)');await press('Tab');await down(' ',true);await down(' ');
  await ok('held completion key and duplicate down cannot replay','__jewel.expedition().run.finished&&__jewel.expedition().run.puzzle===0&&__jewel.app.ui.focus==="exp-next-puzzle"');await up(' ');await press(' ');await ok('fresh Space activates result after release','__jewel.expedition().run.puzzle===1&&!__jewel.expedition().run.finished');
  for(const mode of ['moves','timed','daily']){
   await start(mode);await p.eval(`(()=>{const a=__jewel.app;a.board.score=300;a.board.moves=${mode==='timed'?1:30};if('${mode}'==='timed')a.expedition.run.elapsed=120;__step(.01);a.ui.focus='settings';window.__profile=JSON.stringify(a.expedition.profile);window.__cells=JSON.stringify(__jewel.state().cells);})()`);
   await press('Tab');await ok(mode+' fresh result bypasses stale utility focus','__jewel.app.ui.focus==="again"&&__resultText.some(t=>t[0]==="Enter / Play again")');
   await ok(mode+' traversal preserves board and saves','JSON.stringify(__jewel.app.expedition.profile)===__profile&&JSON.stringify(__jewel.state().cells)===__cells');
   await press('Enter');await p.eval('__step(2)');await ok(mode+' replay retains mode',`__jewel.expedition().run.mode==='${mode}'&&!__jewel.app.gameOver&&__jewel.state().moves===0`);
  }
  await start();await p.eval('__jewel.app.board.moves=1;__step(.01)');await shiftTab();await ok('reverse entry targets last result action','__jewel.app.ui.focus==="exp-endless"&&__resultText.some(t=>t[0]==="Enter / Return to endless")');await shiftTab();await ok('failed puzzle primary retry reachable','__jewel.app.ui.focus==="again"');await press('Enter');await p.eval('__step(2)');await ok('failed puzzle retries same puzzle','__jewel.expedition().run.puzzle===0&&!__jewel.expedition().run.finished');
  // Optional Endless has a delayed legacy replay button.
  await start('zen');await p.eval('__jewel.app.endRun();__step(.1)');await press('Tab');await ok('delayed replay has no premature focus','!__jewel.ui().hits.some(h=>h.id==="again")&&__jewel.app.ui.focus==="hint"');await p.eval('__step(1)');await press('Tab');await ok('first Tab after replay appears targets it','__jewel.app.ui.focus==="again"');
  await down('Enter');await down('Enter',true);await p.eval('__step(2)');await down('Enter',true);await ok('legacy Endless replay held Enter cannot select','!__jewel.app.gameOver&&__jewel.app.selected===-1&&__jewel.app.ui.focus===null');await up('Enter');await press('Enter');await ok('legacy replay fresh Enter selects','__jewel.app.selected>=0');
  await start();await p.eval('__jewel.app.board.moves=1;__step(.01)');await press('Tab');await click('settings');await press('Escape');await ok('ordinary panel return retains Settings focus','__jewel.app.ui.focus==="settings"');await press('Tab');await ok('same-result panel return continues utility traversal','__jewel.app.ui.focus==="coop-open"');
  await press('Escape');await press('Tab');await ok('Escape then Tab reenters result action','__jewel.app.ui.focus==="again"');await p.eval('__jewel.app.prefs.motion=false;__jewel.app.prefs.flash="off";__step(0)');await ok('comfort keeps result cue and touch bounds','__resultText.some(t=>t[0]==="Enter / Play again")&&__jewel.ui().hits.filter(h=>["again","exp-endless"].includes(h.id)).every(h=>h.h>=38&&h.x>=0&&h.y>=0&&h.x+h.w<=innerWidth&&h.y+h.h<=innerHeight)');
  await click('exp-endless');await p.eval('__step(2)');await ok('pointer result activation unchanged','__jewel.expedition().run.mode==="zen"&&!__jewel.app.gameOver');await press('Tab');await ok('ordinary board Tab still begins at Hint','__jewel.app.ui.focus==="hint"');
  await ok('runtime and geometry clean','__jewel.diagnostics().errors.length===0&&__jewel.diagnostics().nonfiniteActors.length===0');
  await ok('requested renderer',`__jewel.diagnostics().backend==='${v.webgl?'WebGL 2':'WebGPU'}'`);p.kill();p=null;
 }
}finally{p?.kill();writeFileSync(`${out}/${label}-checks.json`,JSON.stringify({checks,captures},null,2));}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
