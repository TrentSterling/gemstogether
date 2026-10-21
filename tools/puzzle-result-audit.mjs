// Puzzle goal results: actual mouse/touch play plus explicitly marked boundary fixtures.
import {launch,until} from './cdp.mjs';import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
const target=process.argv[2]||'index.html',label=process.argv[3]||'local',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href,out='tools/out/puzzle-result';mkdirSync(out,{recursive:true});
const checks=[],captures=[];let view;const ok=(name,pass,detail)=>{checks.push({view,name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${view} ${name}`);};
const views=[{name:'desktop',width:1280,height:800},{name:'phone',width:390,height:844,mobile:true},{name:'tiny',width:320,height:480,mobile:true},{name:'landscape',width:568,height:320,mobile:true},{name:'desktop-gl',width:1280,height:800,webgl:true},{name:'phone-gl',width:390,height:844,mobile:true,webgl:true},{name:'landscape-gl',width:568,height:320,mobile:true,webgl:true}];
for(const[n,v]of views.entries()){
 view=v.name;const p=await launch({port:9800+n,...v});
 const tap=async cell=>{const[x,y]=await p.eval(`__jewel.project(${cell})`);if(v.mobile){await p.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await p.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await p.mouse('mousePressed',x,y);await p.mouse('mouseReleased',x,y);}await p.eval('__step(.1)');};
 const shot=async name=>{const file=`${out}/${label}-${view}-${name}.png`;await p.shot(file);captures.push({file,at:new Date().toISOString(),viewport:v,source:base,state:await p.eval('({run:__jewel.expedition().run,score:__jewel.state().score,moves:__jewel.state().moves,texts:__resultTexts})')});};
 try{
  await p.goto(base+(v.webgl?'?webgl':'')+'#solo=1');await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});
  await p.eval(`(()=>{let clock=performance.now();performance.now=()=>clock;window.__step=s=>{clock+=s*1000;__jewel.advance(s);};const ui=__jewel.app.ui,draw=ui.drawGameOver;ui.drawGameOver=function(){const text=this.text;window.__resultTexts=[];this.text=function(...args){__resultTexts.push(args);return text.apply(this,args);};try{return draw.call(this);}finally{this.text=text;}};})()`);
  // Same first-puzzle seed and real losing swap as baseline self-play.
  await p.eval('__jewel.challenge("puzzle",{puzzle:0});__step(6)');await tap(28);await tap(36);await p.eval('__step(6)');
  ok('real scoring move fails unmet target goal',await p.eval('__jewel.state().score===300&&__jewel.state().moves===1&&__jewel.expedition().run.finished&&__jewel.expedition().run.targets.length===3'));
  ok('result explains goal instead of inferring success from score',await p.eval('__resultTexts.some(t=>t[0]==="Marked gems: 3 left")&&__resultTexts.some(t=>t[0]==="Clear every marked gem")'));
  ok('goal result announced',await p.eval('document.getElementById("accessibility-status").textContent.includes("Marked gems: 3 left. Clear every marked gem.")'));
  await shot('failed');
  const layout=()=>p.eval(`(()=>{const e=__jewel.app.expedition,s=e.puzzleResultSummary(),title=__resultTexts.find(t=>t[0]===s.title),detail=__resultTexts.find(t=>t[0]===s.detail),hits=__jewel.ui().hits.filter(h=>['again','exp-next-puzzle','exp-endless'].includes(h.id)),above=__resultTexts.filter(t=>/moves \\/|CASCADE|^[0-9,]+$/.test(t[0]));return {title,detail,hits,pass:title&&detail&&title[3]>=11&&detail[3]>=11&&title[2]+title[3]<detail[2]&&hits.length>=2&&hits.every(h=>h.y>detail[2]+detail[3]&&h.h>=38&&h.y+h.h<=innerHeight)&&above.every(t=>t[2]+t[3]<title[2]-6)};})()`);
  let fit=await layout();ok('failed card readable and clear of summary/actions',fit.pass,fit);
  ok('finished puzzle decor emits no overlaid geometry',await p.eval(`(()=>{const ui=__jewel.app.ui,p=ui.ink,old={};let count=0;for(const k of ['box','line','triangle','circle'])if(typeof p[k]==='function'){old[k]=p[k];p[k]=function(...a){count++;return old[k].apply(this,a);};}try{ui.expeditionDecor();return count===0;}finally{Object.assign(p,old);}})()`));
  ok('draw and summary leave shared run/profile/board/storage untouched',await p.eval(`(()=>{const a=__jewel.app,key=()=>JSON.stringify([a.expedition.summary(),a.expedition.profile,a.coop.snapshot().board,localStorage.getItem('gemstogether-expedition-v1')]),before=key();for(let k=0;k<10;k++){a.expedition.puzzleResultSummary();a.ui.drawGameOver();a.ui.expeditionDecor();}return key()===before;})()`));
  await p.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab'});await p.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab'});
  ok('same-result restores do not clobber focused action announcement',await p.eval(`(()=>{const e=__jewel.app.expedition,b=document.getElementById('accessibility-status').textContent;e.commitResult();e.restore(e.summary());return b==='Play again. Press Enter or Space.'&&document.getElementById('accessibility-status').textContent===b;})()`));
  const again=await p.eval('__jewel.ui().hits.find(h=>h.id==="again")');await p.mouse('mousePressed',again.x+again.w/2,again.y+again.h/2);await p.mouse('mouseReleased',again.x+again.w/2,again.y+again.h/2);await p.eval('__step(2)');
  ok('replay resets result and preserves puzzle',await p.eval('__jewel.expedition().run.puzzle===0&&!__jewel.expedition().run.finished&&__jewel.app.expedition.puzzleResultSummary()===null'));
  for(const i of[0,1,2,3]){
   await p.eval(`__jewel.challenge('puzzle',{puzzle:${i}});__step(6)`);for(const cell of[[1,2],[28,36],[53,61],[11,19]][i])await tap(cell);await p.eval('for(let k=0;k<40&&!__jewel.expedition().run.finished;k++)__step(1)');
   ok('actual input meets goal '+i,await p.eval('__jewel.expedition().run.reason==="PUZZLE COMPLETE"&&__jewel.state().moves===1&&__jewel.app.expedition.puzzleResultSummary().detail==="Puzzle goal reached"'));
   fit=await layout();ok('success card fits '+i,fit.pass,fit);await shot('goal-'+i);
   // Boundary fixture: exhaust this goal without changing rules or saves outside this isolated profile.
   await p.eval(`__jewel.challenge('puzzle',{puzzle:${i}});__step(2);__jewel.app.expedition.finish('TRY THIS PUZZLE AGAIN');__step(0)`);
   const wanted=['Marked gems: 3 left','Blast gem still needed','Prism still needed','Best chain: 0 / 5'][i];
   ok('unmet goal fixture '+i,await p.eval(`__jewel.app.expedition.puzzleResultSummary().title===${JSON.stringify(wanted)}`));fit=await layout();ok('failure card fits '+i,fit.pass,fit);
  }
  await p.eval('__jewel.app.prefs.motion=false;__jewel.app.prefs.flash="off";__jewel.app.prefs.highContrast=true;__step(0)');ok('comfort options retain goal text',await p.eval('__resultTexts.some(t=>t[0]==="Reach a 5-wave cascade")'));await shot('comfort');
  for(const mode of['zen','timed','moves','daily']){await p.eval(`__jewel.challenge('${mode}',{seed:1});__step(2);__jewel.app.expedition.finish('RUN COMPLETE');__step(0)`);ok(mode+' has no puzzle summary',await p.eval('__jewel.app.expedition.puzzleResultSummary()===null'));}
  ok('requested backend and clean runtime',await p.eval(`__jewel.diagnostics().backend==='${v.webgl?'WebGL 2':'WebGPU'}'&&__jewel.diagnostics().errors.length===0`));
 }finally{p.kill();}
}
writeFileSync(`${out}/${label}-checks.json`,JSON.stringify({checks,captures},null,2));console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
