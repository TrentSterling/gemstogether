// Readability, boundary behavior and input safety for the timed challenge HUD.
import {launch,until} from './cdp.mjs';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
const target=process.argv[2]||'index.html',label=process.argv[3]||'after',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href;
const snapshot=process.env.TIMER_SNAPSHOT?JSON.parse(readFileSync(process.env.TIMER_SNAPSHOT,'utf8')):null,out='tools/out/timer';mkdirSync(out,{recursive:true});const checks=[];let view;
const ok=(name,pass,detail)=>{checks.push({view,name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${view} ${name}`);};
const views=[{name:'desktop',width:1280,height:900},{name:'phone',width:390,height:844,mobile:true,deviceScaleFactor:2},{name:'webgl',width:1280,height:900,webgl:true},{name:'phone-webgl',width:390,height:844,mobile:true,deviceScaleFactor:2,webgl:true},...[390,375,360,320].map((height,i)=>({name:'landscape-'+height,width:[844,667,640,568][i],height,mobile:true,deviceScaleFactor:2,webgl:true}))];
for(const [n,v]of views.entries()){
 view=v.name;const p=await launch({port:9740+n,...v});
 try{
  await p.goto(base+(v.webgl?'?webgl':'')+'#solo=1');await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});
  await p.eval(`(()=>{const ui=__jewel.app.ui,draw=ui.expeditionHUD;ui.expeditionHUD=function(){const text=this.text,box=this.ink.box;window.__timerDraw={texts:[],boxes:[]};this.text=function(...a){__timerDraw.texts.push(a);return text.apply(this,a);};this.ink.box=function(...a){__timerDraw.boxes.push(a);return box.apply(this,a);};try{return draw.call(this);}finally{this.text=text;this.ink.box=box;}};})()`);
  if(snapshot)await p.eval(`(()=>{const a=__jewel.app;a.expedition.profile=${JSON.stringify(snapshot.expedition.profile)};a.coop.restore(${JSON.stringify(snapshot.snapshot)},true);a.ui.mouse.inside=false;__jewel.advance(0);})()`);
  else await p.eval('__jewel.challenge("timed",{seed:43});__jewel.advance(2);__jewel.app.expedition.run.elapsed=116;__jewel.app.ui.mouse.inside=false;__jewel.advance(0)');
  await p.shot(`${out}/${label}-${view}.png`);ok('late timed run active',await p.eval('__jewel.expedition().run.mode==="timed"&&!__jewel.expedition().run.finished'));
  if(label==='before')continue;
  ok('final seconds explicitly named',await p.eval('__timerDraw.texts.some(t=>/^FINAL 0:0[1-9]/.test(t[0]))'));
  ok('opaque backing and gauge fit above controls',await p.eval(`(()=>{const b=__timerDraw.boxes.find(b=>b[4]==='#08232e'),g=__timerDraw.boxes.find(b=>b[4]==='#31535d'),top=Math.min(...__jewel.ui().hits.filter(h=>['hint','play','journey','demo','sound','settings','coop-open'].includes(h.id)).map(h=>h.y));return b&&g&&b[0]>=0&&b[0]+b[2]<=innerWidth&&b[1]>=0&&b[1]+b[3]<=top&&b[6]===1&&g[0]>=b[0]&&g[1]>=b[1]&&g[0]+g[2]<=b[0]+b[2]&&g[1]+g[3]<=b[1]+b[3];})()`));
  // Turning off camera motion can move the projected board. Compare the countdown's
  // content, color and fraction, independent of that existing projection change.
  const comfortKey='(()=>{const d=__timerDraw,t=d.texts.filter(t=>/^(TIME |FINAL )/.test(t[0])).map(t=>[t[0],t[3],t[4]]),track=d.boxes.find(b=>b[4]==="#31535d"),fill=d.boxes.find(b=>["#a6fff0","#ffd36b"].includes(b[4])&&b[3]===3);return JSON.stringify([t,Math.round(fill[2]/track[2]*1e8),d.boxes.find(b=>b[4]==="#08232e").slice(4)]);})()';
  const comfortBefore=await p.eval(comfortKey);await p.eval('__jewel.app.prefs.motion=false;__jewel.app.prefs.flash="off";__jewel.advance(0)');ok('urgency unchanged with motion and flashes off',comfortBefore===await p.eval(comfortKey));
  await p.eval('__jewel.app.expedition.profile.bests.timed={score:40000,samples:[[0,0],[60,20000],[120,40000]]};__jewel.app.prefs.ghost=true;__jewel.advance(0)');
  ok('personal ghost remains visible',await p.eval('__timerDraw.texts.some(t=>/[Gg]host 20000/.test(t[0]))'));
  await p.shot(`${out}/${label}-${view}-ghost.png`);
  ok('rendering never mutates clock, board or saved profile',await p.eval('(()=>{const a=__jewel.app,key=()=>JSON.stringify([a.expedition.summary(),a.expedition.profile,a.coop.snapshot().board,localStorage.getItem("gemstogether-expedition-v1")]),before=key();for(let i=0;i<5;i++)a.ui.expeditionHUD();return key()===before;})()'));
  for(const [setting,expr,reset]of [['panel','__jewel.app.openPanel("play")','__jewel.app.closePanel()'],['practice','__jewel.app.practice=true','__jewel.app.practice=false'],['photo','__jewel.app.expedition.enterPhoto()','__jewel.app.closePanel()']]){
   await p.eval('__timerDraw={texts:[],boxes:[]};'+expr+';__jewel.advance(0)');ok(setting+' hides countdown backing',await p.eval('!__timerDraw.boxes.some(b=>b[4]==="#08232e")'));await p.eval(reset+';__jewel.advance(0)');
  }
  // Confirm the existing Play control still accepts real mouse/touch input beside the HUD.
  const b=await p.eval('__jewel.ui().hits.find(h=>h.id==="play")');
  if(v.mobile){await p.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.w/2,y:b.y+b.h/2}]});await p.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await p.mouse('mousePressed',b.x+b.w/2,b.y+b.h/2);await p.mouse('mouseReleased',b.x+b.w/2,b.y+b.h/2);}
  ok('real Play input remains reachable',await p.eval('__jewel.app.panelOpen&&__jewel.app.ui.tab==="play"'));await p.eval('__jewel.app.closePanel();__jewel.advance(0)');
  if(n===0){
   for(const [elapsed,title,fraction]of [[0,'TIME 2:00',1],[60,'TIME 1:00',.5],[109,'TIME 0:11',11/120],[110,'FINAL 0:10',10/120],[119,'FINAL 0:01',1/120]]){
    await p.eval(`__jewel.app.expedition.run.elapsed=${elapsed};__jewel.advance(0)`);
    ok('boundary '+elapsed+' displays '+title,await p.eval(`__timerDraw.texts.some(t=>t[0]===${JSON.stringify(title)})`));
    ok('remaining bar tracks '+elapsed,await p.eval(`(()=>{const boxes=__timerDraw.boxes,track=boxes.find(b=>b[4]==='#31535d'),fill=boxes.find(b=>['#a6fff0','#ffd36b'].includes(b[4])&&b[3]===3);return Math.abs(fill[2]/track[2]-${fraction})<.000001;})()`));
   }
   await p.eval('__jewel.challenge("timed",{seed:43});__jewel.advance(2);__jewel.app.expedition.run.elapsed=119.95;__jewel.swap(11,19);__jewel.advance(.1)');
   ok('expired clock explains the active cascade',await p.eval('__timerDraw.texts.some(t=>t[0]==="TIME UP")&&__timerDraw.texts.some(t=>t[0]==="Finishing cascade")&&!__jewel.expedition().run.finished'));
   ok('expired clock rejects another swap',await p.eval('!__jewel.app.expedition.acceptSwap()&&!__jewel.swap(0,1)'));
   await p.shot(`${out}/${label}-expiry.png`);await p.eval('for(let i=0;i<60&&!__jewel.expedition().run.finished;i++)__jewel.advance(1)');
   ok('final cascade scores before result',await p.eval('__jewel.expedition().run.finished&&__jewel.expedition().run.reason==="TIME COMPLETE"&&__jewel.state().score>0&&__jewel.expedition().run.score===__jewel.state().score&&__jewel.state().moves===1'),await p.eval('({run:__jewel.expedition().run,state:__jewel.state(),frozen:__jewel.app.frozen})'));
   for(const mode of ['zen','moves','daily','puzzle']){await p.eval(`__jewel.challenge(${JSON.stringify(mode)},{seed:1});__jewel.advance(2)`);ok(mode+' has no timed backing',await p.eval('!__timerDraw.boxes.some(b=>b[4]==="#08232e")'));}
  }
  ok('requested GPU backend and clean runtime',await p.eval(`__jewel.diagnostics().backend===${JSON.stringify(v.webgl?'WebGL 2':'WebGPU')}&&__jewel.diagnostics().errors.length===0&&__jewel.diagnostics().nonfiniteActors.length===0`));
 }finally{p.kill();}
}
writeFileSync(`${out}/${label}-checks.json`,JSON.stringify(checks,null,2));console.log(JSON.stringify({passed:checks.filter(x=>x.pass).length,total:checks.length}));if(checks.some(x=>!x.pass))process.exitCode=1;
