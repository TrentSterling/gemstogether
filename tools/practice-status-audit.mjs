// Actual Showcase controls, manual practice swaps and return to scored play.
import {launch,until} from './cdp.mjs';import {mkdirSync,writeFileSync} from 'node:fs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
const file=process.argv[2]||'index.html',label=process.argv[3]||'after',base=/^https?:/.test(file)?file:pathToFileURL(resolve(file)).href,out='tools/out/practice-status';mkdirSync(out,{recursive:true});
const views=[['desktop',1280,800,false],['webgl',1280,800,true],['phone',390,844,false],['phone-webgl',390,844,true],['tiny',320,480,true],['short-phone',390,600,true],['landscape',568,320,true],['landscape-tall',667,375,true],['short-desktop',1280,400,true],['square-landscape',568,480,true],['narrow-wide',704,464,true],['micro-landscape',336,320,true]];
const checks=[],captures=[];let view,state;const ok=(name,pass,detail)=>{checks.push({view,state,name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${view} ${state} ${name}`);};
const overlap=(a,b)=>a&&b&&a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const tap=async(p,[x,y],mobile)=>{if(mobile){await p.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await p.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await p.mouse('mousePressed',x,y);await p.mouse('mouseReleased',x,y);}};
const button=async(p,id,mobile)=>{const b=await p.eval(`__jewel.ui().hits.find(h=>h.id==='${id}')`);if(!b)throw Error('No button '+id);await tap(p,[b.x+b.w/2,b.y+b.h/2],mobile);};
try{
 for(const[n,[name,w,h,webgl]]of views.entries()){
  if(label==='before'&&!['phone','tiny'].includes(name))continue;view=name;const mobile=w<900,p=await launch({port:9870+n,width:w,height:h,mobile});
  try{
   await p.goto(base+(webgl?'?webgl':'')+'#solo=1');await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});
   await p.eval(`(()=>{let clock=performance.now();performance.now=()=>clock;window.__practiceStep=s=>{clock+=s*1000;__jewel.advance(s);};const a=__jewel.app,u=a.ui,draw=a.draw,text=u.text;a.draw=function(...args){window.__practiceText=[];return draw.apply(this,args);};u.text=function(...args){__practiceText.push(args);return text.apply(this,args);};__jewel.challenge('zen',{seed:1});__practiceStep(2);})()`);
   const snapshot=()=>p.eval(`({score:__jewel.state().score,moves:__jewel.state().moves,auto:__jewel.app.auto,practice:__jewel.app.practice,gems:__jewel.app.expedition.profile.gems,best:__jewel.app.best,layout:__jewel.app.ui.practiceStatusLayout?.()??null,text:__practiceText,board:__jewel.app.ui.boardRect,plaque:__jewel.app.ui.plaqueAt,hits:__jewel.ui().hits,announcement:document.getElementById('accessibility-status').textContent})`);
   state='normal';ok('normal play has no practice card',(await snapshot()).layout===null);
   for(let i=0;i<3;i++){for(const xy of await p.eval('__jewel.state().legalMoves[0].map(i=>__jewel.project(i))'))await tap(p,xy,mobile);await p.eval('__practiceStep(4)');}
   const normal=await snapshot();ok('three real swaps earn saved progress',normal.moves===3&&normal.score===450&&normal.gems===9);
   for(state of ['showcase','practice']){
    await button(p,'demo',mobile);await p.eval('__practiceStep(.2)');
    if(state==='practice'){for(const xy of await p.eval('__jewel.state().legalMoves[0].map(i=>__jewel.project(i))'))await tap(p,xy,mobile);await p.eval('__practiceStep(7)');}
    const r=await snapshot();ok('Showcase and stop preserve practice rules',r.practice&&r.auto===(state==='showcase')&&r.gems===normal.gems&&r.best===normal.best);
    if(state==='practice')ok('manual practice scores without saving progress',r.moves===4&&r.score===600);
    if(['phone','tiny','desktop','landscape','square-landscape','narrow-wide','micro-landscape'].includes(name)){const path=`${out}/${label}-${name}-${state}.png`;await p.shot(path);captures.push({view,state,path,capturedAt:new Date().toISOString(),...r});}
    if(label==='before'){ok('baseline lacks persistent practice explanation',r.layout===null);continue;}
    ok('persistent status names the actual mode',r.layout?.label===(state==='showcase'?'SHOWCASE':'PRACTICE'),r.layout);
    ok('card explains unsaved progress and the Play route',r.layout&&/no progress saved|progress not saved/.test(r.layout.lines.join(' ').toLowerCase())&&r.layout.lines.join(' ').includes('Play'));
    ok('full status text is drawn at readable size',r.layout&&r.layout.lines.every((line,i)=>r.text.some(t=>t[0]===line&&t[3]>=(r.layout.strip?11:12)))&&await p.eval(`(()=>{const r=__jewel.app.ui.practiceStatusLayout();return r.lines.every((s,i)=>__jewel.app.ui.measure(s,r.strip?r.font:i===0?r.titleFont:r.font)<=r.w-(r.strip?8:r.padding*2)+.1);})()`));
    ok('card is contained and clears board, score and buttons',r.layout&&r.layout.x>=0&&r.layout.y>=0&&r.layout.x+r.layout.w<=w+.1&&r.layout.y+r.layout.h<=h&&!overlap(r.layout,r.board)&&!r.hits.some(b=>overlap(r.layout,b))&&!overlap(r.layout,r.plaque?{x:r.plaque[0],y:r.plaque[1],w:r.plaque[2],h:r.plaque[3]}:null),r.layout);
    ok('accessible transition explains how to resume progress',r.announcement===(state==='showcase'?'Showcase.':'Practice continues.')+' Progress is not saved. Open Play to start a new run.',r.announcement);
    ok('compact score never labels practice as normal Score',r.plaque||r.text.some(t=>t[0]===(state==='showcase'?'Demo':'Lab')));
    ok('drawing cannot change saves, score or network state',await p.eval(`(()=>{const a=__jewel.app,key=()=>JSON.stringify([a.board.score,a.board.moves,a.expedition.profile,a.expedition.summary(),a.coop.revision,a.coop.seq,localStorage.getItem('gemstogether-expedition-v1')]),before=key();for(let i=0;i<3;i++)a.ui.draw();return key()===before;})()`));
   }
   if(label==='before')continue;
   state='return';await button(p,'play',mobile);await p.eval('__practiceStep(0)');ok('existing Play target opens mode picker and hides card',await p.eval('__jewel.app.panelOpen&&__jewel.ui().tab==="play"&&__jewel.app.ui.practiceStatusLayout()===null'));
   await button(p,'exp-mode-zen',mobile);await p.eval('__practiceStep(2)');ok('choosing Endless starts a scored run',await p.eval('!__jewel.app.practice&&!__jewel.app.auto&&__jewel.state().score===0&&__jewel.app.ui.practiceStatusLayout()===null'));
   for(const xy of await p.eval('__jewel.state().legalMoves[0].map(i=>__jewel.project(i))'))await tap(p,xy,mobile);await p.eval('__practiceStep(4)');ok('real play resumes saved progression',await p.eval('__jewel.app.expedition.profile.gems')>normal.gems);
   for(const mode of ['moves','daily','timed','puzzle']){
    state=mode;await p.eval(`__jewel.challenge('${mode}',{seed:1,puzzle:0});__practiceStep(2)`);const before=await p.eval('JSON.stringify(__jewel.app.expedition.run)');
    await button(p,'demo',mobile);await p.eval('__practiceStep(.2)');await button(p,'demo',mobile);await p.eval('__practiceStep(2)');
    ok('practice presentation preserves '+mode+' challenge rules',await p.eval('JSON.stringify(__jewel.app.expedition.run)')===before&&await p.eval('__jewel.app.ui.practiceStatusLayout()?.label==="PRACTICE"'));
   }
   state='overlays';await p.eval('__jewel.app.openPanel("comfort");__practiceStep(0)');ok('panel suppresses card',await p.eval('__jewel.app.ui.practiceStatusLayout()===null'));await p.eval('__jewel.app.closePanel();__practiceStep(0)');
   for(const [setup,clear]of [['__jewel.app.aaCompare=true','__jewel.app.aaCompare=false'],['__jewel.app.gameOver={birth:__jewel.app.time,score:0,stage:__jewel.app.fx.stageInfo()}','__jewel.app.gameOver=null'],['document.getElementById("trontAbout").open=true','document.getElementById("trontAbout").open=false']]){await p.eval(setup+';__practiceStep(0)');ok('overlay suppresses practice card',await p.eval('__jewel.app.ui.practiceStatusLayout()===null'));await p.eval(clear+';__practiceStep(0)');}
   await p.eval('__jewel.app.expedition.enterPhoto();__practiceStep(0)');ok('photo mode suppresses card',await p.eval('__jewel.app.ui.practiceStatusLayout()===null'));await p.eval('__jewel.app.closePanel();__practiceStep(0)');
   await p.eval('__jewel.app.prefs.motion=false;__jewel.app.prefs.flash="off";__jewel.app.prefs.highContrast=true;__practiceStep(0)');ok('comfort settings retain complete practice status',await p.eval('!!__jewel.app.ui.practiceStatusLayout()'));
   ok('requested renderer and clean runtime',await p.eval(`__jewel.diagnostics().backend===${JSON.stringify(webgl?'WebGL 2':'WebGPU')}&&__jewel.diagnostics().errors.length===0`)&&!p.logs.some(s=>s.startsWith('EXCEPTION')));
  }finally{p.kill();}
 }
}finally{writeFileSync(`${out}/${label}-checks.json`,JSON.stringify({checks,captures},null,2));}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
