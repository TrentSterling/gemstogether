// Move-budget readability, real pointer/touch play, boundary behavior and presentation purity.
import {launch,until} from './cdp.mjs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {mkdirSync,writeFileSync} from 'node:fs';
const target=process.argv[2]||'index.html',label=process.argv[3]||'after',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href,out='tools/out/move-budget';mkdirSync(out,{recursive:true});
const checks=[],captures=[];let view;const ok=(name,pass,detail)=>{checks.push({view,name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${view} ${name}`);};
const views=[{name:'desktop',width:1280,height:800},{name:'webgl',width:1280,height:800,webgl:true},{name:'phone',width:390,height:844,mobile:true},{name:'phone-webgl',width:390,height:844,mobile:true,webgl:true},{name:'narrow',width:320,height:600,mobile:true,webgl:true},{name:'landscape',width:568,height:320,mobile:true,webgl:true},{name:'wide-landscape',width:844,height:390,mobile:true,webgl:true},{name:'short-desktop',width:1280,height:400,webgl:true}];
const tap=async(p,x,y,mobile)=>{if(mobile){await p.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await p.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await p.mouse('mousePressed',x,y);await p.mouse('mouseReleased',x,y);}};
const reset=(p,mode)=>p.eval(`__jewel.challenge(${JSON.stringify(mode)},{seed:1,day:'2026-10-21'});__budgetStep(2);__jewel.app.ui.toastUntil=0;__jewel.app.ui.mouse.inside=false;__budgetStep(0)`);
const budget=p=>p.eval('({texts:__budgetDraw.texts,boxes:__budgetDraw.boxes,board:__jewel.app.ui.boardRect,hits:__jewel.ui().hits,run:__jewel.expedition().run,moves:__jewel.state().moves})');
try{
 for(const [n,v]of views.entries()){
  if(label==='before'&&!['desktop','landscape'].includes(v.name))continue;
  view=v.name;const p=await launch({port:9830+n,...v});
  try{
   await p.goto(base+(v.webgl?'?webgl':'')+'#solo=1');await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});
   await p.eval(`(()=>{let clock=performance.now();performance.now=()=>clock;window.__budgetStep=s=>{clock+=s*1000;__budgetDraw={texts:[],boxes:[]};__jewel.advance(s);};const ui=__jewel.app.ui,draw=ui.expeditionHUD;ui.expeditionHUD=function(){const text=this.text,box=this.ink.box;window.__budgetDraw={texts:[],boxes:[]};this.text=function(...a){__budgetDraw.texts.push(a);return text.apply(this,a);};this.ink.box=function(...a){__budgetDraw.boxes.push(a);return box.apply(this,a);};try{return draw.call(this);}finally{this.text=text;this.ink.box=box;}};})()`);
   for(const mode of label==='before'?['moves']:['moves','daily']){
    await reset(p,mode);
    for(let i=0;i<3;i++){const pair=await p.eval('__jewel.state().legalMoves[0]');for(const xy of await p.eval(`${JSON.stringify(pair)}.map(i=>__jewel.project(i))`))await tap(p,...xy,v.mobile);await p.eval('__budgetStep(4)');}
    await p.eval('__budgetStep(4);__jewel.app.ui.toastUntil=0;__budgetStep(0)');
    await p.shot(`${out}/${label}-${view}-${mode}.png`);captures.push({view,mode,capturedAt:new Date().toISOString(),...await budget(p)});
    ok(mode+' three real swaps consume three moves',await p.eval('__jewel.state().moves===3&&__jewel.state().score>0'));
    if(label==='before')continue;
    ok(mode+' remaining count leads the label',await p.eval('__budgetDraw.texts.some(t=>t[0].startsWith("27 MOVES LEFT"))'));
    ok(mode+' identity remains visible',await p.eval(`__budgetDraw.texts.some(t=>t[0].includes(${JSON.stringify(mode==='daily'?'DAILY 2026-10-21':'30-MOVE CHALLENGE')}))`));
    ok(mode+' opaque card fits and clears board controls',await p.eval(`(()=>{const b=__budgetDraw.boxes.find(b=>b[4]==='#12343c'),u=__jewel.ui(),about=document.querySelector('#trontAbout').getBoundingClientRect(),blocks=[...u.hits.filter(h=>['hint','play','journey','demo','sound','settings','coop-open'].includes(h.id)),{x:about.x,y:about.y,w:about.width,h:about.height}],over=h=>b[0]<h.x+h.w&&b[0]+b[2]>h.x&&b[1]<h.y+h.h&&b[1]+b[3]>h.y;return b&&b[6]===1&&b[0]>=0&&b[1]>=0&&b[0]+b[2]<=innerWidth+.1&&b[1]+b[3]<=innerHeight+.1&&!blocks.some(over);})()`));
    ok(mode+' remaining gauge is 27/30 and inside card',await p.eval(`(()=>{const b=__budgetDraw.boxes.find(b=>b[4]==='#12343c'),track=__budgetDraw.boxes.find(b=>b[4]==='#31535d'),fill=__budgetDraw.boxes.find(b=>b[4]==='#a6fff0'&&b[3]===3);return b&&track&&fill&&Math.abs(fill[2]/track[2]-.9)<1e-8&&track[0]>=b[0]&&track[1]>=b[1]&&track[0]+track[2]<=b[0]+b[2]&&track[1]+track[3]<=b[1]+b[3];})()`));
    ok(mode+' rendering preserves saves and shared state',await p.eval(`(()=>{const a=__jewel.app,key=()=>JSON.stringify([a.expedition.summary(),a.expedition.profile,a.coop.snapshot().board,a.coop.revision,a.coop.seq,localStorage.getItem('gemstogether-expedition-v1')]),before=key();for(let i=0;i<5;i++)a.ui.expeditionHUD();return key()===before;})()`));
    for(const [moves,title]of [[0,'30 MOVES LEFT'],[24,'6 MOVES LEFT'],[25,'5 MOVES LEFT'],[29,'FINAL MOVE']]){
     await p.eval(`__jewel.app.board.moves=${moves};__budgetStep(0)`);
     ok(mode+' boundary '+moves+' correct label and urgency',await p.eval(`__budgetDraw.texts.some(t=>t[0].startsWith(${JSON.stringify(title)})&&t[4]===${JSON.stringify(moves>=25?'#ffd36b':'#a6fff0')})`));
    }
    const content=await p.eval('__budgetDraw.texts.map(t=>[t[0],t[3],t[4]])');await p.eval('__jewel.app.prefs.motion=false;__jewel.app.prefs.flash="off";__budgetStep(0)');
    ok(mode+' final cue stays static with comfort options off',JSON.stringify(content)===JSON.stringify(await p.eval('__budgetDraw.texts.map(t=>[t[0],t[3],t[4]])')));
    await p.shot(`${out}/${label}-${view}-${mode}-final.png`);
    for(const [setting,enter,leave]of [['panel','__jewel.app.openPanel("play")','__jewel.app.closePanel()'],['practice','__jewel.app.practice=true','__jewel.app.practice=false'],['photo','__jewel.app.expedition.enterPhoto()','__jewel.app.closePanel()']]){await p.eval(enter+';__budgetStep(0)');ok(mode+' '+setting+' hides budget',await p.eval('!__budgetDraw.boxes.some(b=>b[4]==="#12343c")'));await p.eval(leave+';__budgetStep(0)');}
    const play=await p.eval('__jewel.ui().hits.find(h=>h.id==="play")');await tap(p,play.x+play.w/2,play.y+play.h/2,v.mobile);await p.eval('__budgetStep(0)');ok(mode+' real Play input remains reachable',await p.eval('__jewel.app.panelOpen&&__jewel.ui().tab==="play"'));await p.eval('__jewel.app.closePanel()');
    await reset(p,mode);await p.eval('__jewel.app.board.moves=29;__jewel.swap(...__jewel.state().legalMoves[0]);__budgetStep(.1)');
    ok(mode+' final accepted turn explains cascade',await p.eval('__jewel.state().moves===30&&!__jewel.expedition().run.finished&&__budgetDraw.texts.some(t=>t[0].includes("LAST CASCADE"))&&__budgetDraw.texts.some(t=>t[0].includes("Finishing cascade"))'));
    ok(mode+' empty budget has no negative bar and rejects extra swap',await p.eval('!__budgetDraw.boxes.some(b=>["#a6fff0","#ffd36b"].includes(b[4])&&b[3]===3)&&!__jewel.app.expedition.acceptSwap()&&!__jewel.swap(0,1)'));
    await p.eval('__budgetStep(12)');ok(mode+' final cascade scores before normal result',await p.eval(`__jewel.expedition().run.finished&&__jewel.expedition().run.reason===${JSON.stringify(mode==='daily'?'DAILY COMPLETE':'RUN COMPLETE')}&&__jewel.state().score>0&&__jewel.expedition().run.score===__jewel.state().score&&__jewel.state().moves===30&&__jewel.ui().hits.some(h=>h.id==='again')`));
   }
   if(label!=='before'){
    for(const mode of ['zen','timed','puzzle']){await reset(p,mode);ok(mode+' keeps its existing HUD',await p.eval('!__budgetDraw.boxes.some(b=>b[4]==="#12343c")'));}
    ok('requested renderer and clean runtime',await p.eval(`__jewel.diagnostics().backend===${JSON.stringify(v.webgl?'WebGL 2':'WebGPU')}&&__jewel.diagnostics().errors.length===0&&__jewel.diagnostics().nonfiniteActors.length===0`)&&!p.logs.some(s=>s.startsWith('EXCEPTION')));
   }
  }finally{p.kill();}
 }
}finally{writeFileSync(`${out}/${label}-checks.json`,JSON.stringify({checks,captures},null,2));}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
