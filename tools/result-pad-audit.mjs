// Real browser result controls with emulated standard/PlayStation gamepad signals.
// node tools/result-pad-audit.mjs [file|url] [after|before|live]
import {launch,until} from './cdp.mjs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {mkdirSync,writeFileSync} from 'node:fs';
const target=process.argv[2]||'index.html',label=process.argv[3]||'after',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href,out='tools/out/result-pad';mkdirSync(out,{recursive:true});
const checks=[],captures=[];let view;const ok=(name,pass,detail)=>{checks.push({view,name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${view} ${name}`);};
const signal=(p,index,on)=>p.eval(`__pad.buttons[${index}].pressed=${on};__jewel.app.pollPad();__resultStep(0)`);
const press=async(p,index)=>{await signal(p,index,true);await signal(p,index,false);};
const puzzle=p=>p.eval(`(()=>{const a=__jewel.app;__pad.buttons.forEach(b=>b.pressed=false);__pad.axes.fill(0);a.expedition.start('puzzle',{puzzle:0});__resultStep(2);a.lastInputDevice='pad';__jewel.swap(1,2);__resultStep(4);a.ui.toastUntil=0;a.ui.mouse.inside=false;a.pollPad();__resultStep(0);})()`);
try{
 for(const [n,v]of [{name:'desktop',width:1280,height:800},{name:'webgl',width:1280,height:800,webgl:true},{name:'phone',width:390,height:844,mobile:true},{name:'landscape',width:568,height:320,mobile:true,webgl:true}].entries()){
  view=v.name;const p=await launch({port:9850+n,...v});
  try{
   await p.goto(base+(v.webgl?'?webgl':'')+'#solo=1');await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});
   await p.eval(`(()=>{let clock=performance.now();performance.now=()=>clock;window.__resultStep=s=>{clock+=s*1000;__jewel.advance(s);};__resultStep(0);window.__pad={id:'A06 standard controller',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[__pad]});const ui=__jewel.app.ui,draw=ui.drawGameOver;ui.drawGameOver=function(){const text=this.text;window.__resultText=[];this.text=function(...args){__resultText.push(args);return text.apply(this,args);};try{return draw.call(this);}finally{this.text=text;}};})()`);
   await puzzle(p);await press(p,13);await press(p,12);await p.eval('__jewel.app.ui.toastUntil=0;__resultStep(0)');
   const file=`${out}/${label}-${view}.png`;await p.shot(file);captures.push({view,file,utc:new Date().toISOString(),seed:1,viewport:[v.width,v.height],state:await p.eval('({score:__jewel.state().score,moves:__jewel.state().moves,run:__jewel.expedition().run,focus:__jewel.app.ui.focus})')});
   if(label==='before')continue;
   ok('puzzle primary focused with A prompt',await p.eval('__jewel.app.ui.focus==="exp-next-puzzle"&&__resultText.some(t=>t[0]==="A / Next puzzle")'));
   ok('result actions retain full-size bounds',await p.eval('__jewel.ui().hits.filter(h=>["exp-next-puzzle","exp-endless"].includes(h.id)).every(h=>h.h>=38&&h.x>=0&&h.y>=0&&h.x+h.w<=innerWidth&&h.y+h.h<=innerHeight)'));
   const cell=await p.eval('__jewel.app.keyboardCell');await press(p,13);
   ok('D-pad selects only visible second action without moving board cursor',await p.eval(`__jewel.app.ui.focus==='exp-endless'&&__jewel.app.keyboardCell===${cell}`));
   await press(p,13);ok('D-pad wraps to primary',await p.eval('__jewel.app.ui.focus==="exp-next-puzzle"'));
   await signal(p,0,true);ok('A advances to next puzzle',await p.eval('__jewel.expedition().run.puzzle===1&&!__jewel.expedition().run.finished'));
   await p.eval('__resultStep(2)');await signal(p,0,false);ok('replay release never selects or swaps a gem',await p.eval('__jewel.app.selected===-1&&__jewel.state().moves===0'));
   await press(p,0);ok('fresh A still selects a gem on new board',await p.eval('__jewel.app.selected>=0'));await p.eval('__jewel.app.selected=-1');
   await puzzle(p);await press(p,13);await press(p,0);ok('second action returns to endless',await p.eval('__jewel.expedition().run.mode==="zen"&&!__jewel.app.gameOver&&__jewel.app.selected===-1'));
   for(const mode of ['moves','timed','daily']){
    await p.eval(`(()=>{const a=__jewel.app,e=a.expedition;e.start('${mode}',{seed:1});__resultStep(2);a.board.score=300;a.board.moves=${mode==='timed'?1:30};if('${mode}'==='timed')e.run.elapsed=120;__resultStep(.01);a.pollPad();__resultStep(0);})()`);
    ok(mode+' replay action focused',await p.eval('__jewel.app.ui.focus==="again"&&__resultText.some(t=>t[0]==="A / Play again")'));
    const id=await p.eval('__jewel.expedition().run.id');await press(p,0);await p.eval('__resultStep(2)');ok(mode+' replay retains mode and clears result',await p.eval(`__jewel.expedition().run.mode==='${mode}'&&__jewel.expedition().run.id!=='${id}'&&!__jewel.app.gameOver&&__jewel.state().moves===0&&__jewel.app.selected===-1`));
   }
   await p.eval(`(()=>{const a=__jewel.app;a.expedition.start('puzzle',{puzzle:0});__resultStep(2);__pad.buttons[0].pressed=true;__pad.buttons[13].pressed=true;a.board.moves=1;__resultStep(.01);a.pollPad();__resultStep(0);})()`);
   const heldId=await p.eval('__jewel.expedition().run.id');await p.eval('for(let i=0;i<4;i++){__jewel.app.pollPad();__resultStep(.1)}');
   ok('A and direction held through completion cannot replay or change focus',await p.eval(`__jewel.expedition().run.id==='${heldId}'&&__jewel.expedition().run.finished&&__jewel.app.ui.focus==='again'`));
   await signal(p,0,false);await signal(p,13,false);await press(p,0);ok('neutral then fresh A can retry failed puzzle',await p.eval(`!__jewel.expedition().run.finished&&__jewel.expedition().run.puzzle===0&&__jewel.expedition().run.id!=='${heldId}'`));
   await puzzle(p);await press(p,9);ok('Start opens settings once',await p.eval('__jewel.app.panelOpen&&__jewel.ui().tab==="audio"'));await press(p,1);ok('B returns to result without activation',await p.eval('!__jewel.app.panelOpen&&__jewel.expedition().run.finished'));await p.eval('__jewel.app.pollPad();__resultStep(0)');
   await p.eval('__pad.id="DualSense Wireless Controller";__jewel.app.pollPad();__resultStep(0)');ok('PlayStation prompt uses Cross',await p.eval('__resultText.some(t=>t[0]==="Cross / Next puzzle")'));await p.shot(`${out}/${label}-${view}-playstation.png`);
   await p.eval('__pad.connected=false;__jewel.app.pollPad();__pad.connected=true;__pad.buttons[0].pressed=true;__jewel.app.pollPad();__resultStep(0)');ok('reconnect with held A cannot activate',await p.eval('__jewel.expedition().run.finished'));await signal(p,0,false);
   await p.eval('__jewel.app.prefs.motion=false;__jewel.app.prefs.flash="off";__resultStep(0)');ok('comfort settings retain visible focus',await p.eval('__resultText.some(t=>t[0]==="Cross / Next puzzle")'));
   // A mouse/touch click still uses the original result hit target.
   const b=await p.eval('__jewel.ui().hits.find(h=>h.id==="exp-next-puzzle")');
   if(v.mobile){await p.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.w/2,y:b.y+b.h/2}]});await p.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await p.mouse('mousePressed',b.x+b.w/2,b.y+b.h/2);await p.mouse('mouseReleased',b.x+b.w/2,b.y+b.h/2);}
   ok('existing pointer replay preserved',await p.eval('__jewel.expedition().run.puzzle===1&&!__jewel.expedition().run.finished'));
   if(n===0){
    await p.eval('__jewel.challenge("zen",{seed:1});__resultStep(2);__jewel.app.endRun();__jewel.app.lastInputDevice="pad";__resultStep(1);__jewel.app.pollPad();__resultStep(0)');ok('optional endless result focuses replay',await p.eval('__jewel.app.ui.focus==="again"'));await press(p,0);await p.eval('__resultStep(2)');ok('optional endless result replays safely',await p.eval('!__jewel.app.gameOver&&__jewel.app.selected===-1'));
    await puzzle(p);await p.eval('Object.defineProperty(navigator,"getGamepads",{configurable:true,value:()=>[{...__pad,id:"nonstandard",mapping:""},__pad]});__jewel.app.pollPad();__resultStep(0)');ok('standard controller preferred',await p.eval('__jewel.app.padState.id===__pad.id'));
    await p.eval('__pad.connected=false;__jewel.app.ui.focus="exp-next-puzzle"');await p.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter'});await p.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter'});ok('existing keyboard result activation preserved',await p.eval('__jewel.expedition().run.puzzle===1&&!__jewel.expedition().run.finished'));
   }
   ok('runtime and actors clean',await p.eval('__jewel.diagnostics().errors.length===0&&__jewel.diagnostics().nonfiniteActors.length===0'));
   ok('requested renderer',await p.eval(`__jewel.diagnostics().backend===${JSON.stringify(v.webgl?'WebGL 2':'WebGPU')}`));
  }finally{p.kill();}
 }
}finally{writeFileSync(`${out}/${label}-checks.json`,JSON.stringify({checks,captures},null,2));}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length,captures:captures.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
