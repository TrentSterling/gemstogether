// Persistent puzzle objectives: real input, shared-state reads and compact layout.
import {launch,until} from './cdp.mjs';import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
const target=process.argv[2]||'index.html',label=process.argv[3]||'after',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href;
const out='tools/out/puzzle';mkdirSync(out,{recursive:true});const checks=[],captures=[];let view;
const ok=(name,pass,detail)=>{checks.push({view,name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${view} ${name}`);};
const views=[{name:'desktop',width:1280,height:800},{name:'phone',width:390,height:844,mobile:true},{name:'small-phone',width:320,height:568,mobile:true},{name:'compact',width:568,height:320,mobile:true},{name:'landscape',width:844,height:390,mobile:true},{name:'desktop-webgl',width:1280,height:800,webgl:true},{name:'phone-webgl',width:390,height:844,mobile:true,webgl:true},{name:'compact-webgl',width:568,height:320,mobile:true,webgl:true},{name:'short-wide',width:1280,height:460},{name:'short-wide-webgl',width:1280,height:520,webgl:true}];
for(const [n,v]of views.entries()){
 view=v.name;const p=await launch({port:9820+n,...v});
 try{
  await p.goto(base+(v.webgl?'?webgl':'')+'#solo=1');await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});
  await p.eval('(()=>{let now=performance.now();performance.now=()=>now;window.__captureStep=s=>{now+=s*1000;__jewel.advance(s);};})()');
  await p.eval(`(()=>{const ui=__jewel.app.ui,draw=ui.expeditionHUD;ui.expeditionHUD=function(){const text=this.text,box=this.ink.box;window.__puzzleDraw={texts:[],boxes:[]};this.text=function(...a){__puzzleDraw.texts.push(a);return text.apply(this,a);};this.ink.box=function(...a){__puzzleDraw.boxes.push(a);return box.apply(this,a);};try{return draw.call(this);}finally{this.text=text;this.ink.box=box;}};})()`);
  for(const i of [1,0,2,3]){
   await p.eval(`__jewel.challenge('puzzle',{puzzle:${i}});__captureStep(6);__jewel.app.ui.mouse.inside=false;__jewel.advance(0)`);
   const path=`${out}/${label}-${view}-${i}.png`;await p.shot(path);captures.push({path,utc:new Date().toISOString(),source:base,view,puzzle:i,manualElapsed:6});
   if(label==='before')continue;
   ok('opening toast has expired: '+i,await p.eval('performance.now()>__jewel.app.ui.toastUntil'));
   const expected=['Clear marked gems: 3 left','Forge a blast gem','Forge a prism','Best chain: 0 / 5'][i];
   ok('objective persists after toast: '+i,await p.eval(`__puzzleDraw.texts.some(t=>t[0].includes(${JSON.stringify(expected)}))`));
   ok('objective card clear of gems and controls: '+i,await p.eval(`(()=>{const b=__puzzleDraw.boxes.find(b=>b[4]==='#123b42'),hits=__jewel.ui().hits.filter(h=>['hint','play','journey','demo','sound','settings','coop-open'].includes(h.id)),over=h=>b[0]<h.x+h.w&&b[0]+b[2]>h.x&&b[1]<h.y+h.h&&b[1]+b[3]>h.y;return b&&b[0]>=0&&b[1]>=0&&b[0]+b[2]<=innerWidth&&b[1]+b[3]<=innerHeight&&!hits.some(over)&&!over(__jewel.app.ui.boardRect)&&b[6]===1;})()`));
   ok('draw leaves board, profile and run untouched: '+i,await p.eval(`(()=>{const a=__jewel.app,key=()=>JSON.stringify([a.expedition.summary(),a.expedition.profile,a.coop.snapshot().board,localStorage.getItem('gemstogether-expedition-v1')]),before=key();for(let k=0;k<10;k++)a.ui.expeditionHUD();return key()===before;})()`));
   // Exercise actual mouse/touch events against projected gem centers.
   const pair=[[1,2],[28,36],[53,61],[11,19]][i];
   for(const cell of pair){const [x,y]=await p.eval(`__jewel.project(${cell})`);if(v.mobile){await p.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await p.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await p.mouse('mousePressed',x,y);await p.mouse('mouseReleased',x,y);}await p.eval('__jewel.advance(.1)');}
   await p.eval('for(let k=0;k<40&&!__jewel.expedition().run.finished;k++)__jewel.advance(1)');
   ok('real input solves puzzle with one move: '+i,await p.eval('__jewel.expedition().run.reason==="PUZZLE COMPLETE"&&__jewel.state().moves===1&&__jewel.state().score>0'));
   const solved=['Clear marked gems: 0 left','Blast gem forged','Prism forged',null][i];
   ok('objective reflects actual earned progress: '+i,await p.eval(solved?`__jewel.app.expedition.puzzleObjective()===${JSON.stringify(solved)}`:'__jewel.expedition().run.bestChain>=5&&__jewel.app.expedition.puzzleObjective().includes(__jewel.expedition().run.bestChain+" / 5")'));
  }
  if(label==='before')continue;
  await p.eval('__jewel.challenge("puzzle",{puzzle:1});__captureStep(6);__jewel.swap(1,2);__captureStep(6)');
  ok('unsolved move preserves goal and singular remaining move',await p.eval('__puzzleDraw.texts.some(t=>t[0].includes("Forge a blast gem"))&&__puzzleDraw.texts.some(t=>t[0].includes("1 move left"))&&!__jewel.expedition().run.finished'));
  const textBefore=await p.eval('JSON.stringify(__puzzleDraw.texts.map(t=>t[0]))');await p.eval('__jewel.app.prefs.motion=false;__jewel.app.prefs.flash="off";__jewel.app.prefs.highContrast=true;__jewel.advance(0)');
  ok('goal persists with comfort options',textBefore===await p.eval('JSON.stringify(__puzzleDraw.texts.map(t=>t[0]))'));
  for(const [setting,expr,reset]of [['panel','__jewel.app.openPanel("play")','__jewel.app.closePanel()'],['practice','__jewel.app.practice=true','__jewel.app.practice=false'],['photo','__jewel.app.expedition.enterPhoto()','__jewel.app.closePanel()']]){
   await p.eval('__puzzleDraw={texts:[],boxes:[]};'+expr+';__jewel.advance(0)');ok(setting+' suppresses goal card',await p.eval('!__puzzleDraw.boxes.some(b=>b[4]==="#123b42")'));await p.eval(reset+';__jewel.advance(0)');
  }
  for(const mode of ['zen','timed','moves','daily']){await p.eval(`__jewel.challenge('${mode}',{seed:1});__jewel.advance(2)`);ok(mode+' keeps its existing HUD',await p.eval('!__puzzleDraw.boxes.some(b=>b[4]==="#123b42")&&__jewel.app.expedition.puzzleObjective()===null'));}
  ok('requested backend and clean runtime',await p.eval(`__jewel.diagnostics().backend==='${v.webgl?'WebGL 2':'WebGPU'}'&&__jewel.diagnostics().errors.length===0`));
 }finally{p.kill();}
}
writeFileSync(`${out}/${label}-checks.json`,JSON.stringify({checks,captures},null,2));console.log(JSON.stringify({passed:checks.filter(x=>x.pass).length,total:checks.length}));if(checks.some(x=>!x.pass))process.exitCode=1;
