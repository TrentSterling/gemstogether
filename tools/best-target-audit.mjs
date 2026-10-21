// The HUD target reads completed local records; it never changes the shared run.
// node tools/best-target-audit.mjs [file|url] [label=after]
import {launch,until} from './cdp.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
const file=process.argv[2]||'index.html',label=process.argv[3]||'after',base=/^https?:/.test(file)?file:pathToFileURL(resolve(file)).href,out='tools/out/best-target';mkdirSync(out,{recursive:true});
const original=JSON.parse(readFileSync(process.env.SELF_PLAY||new URL('./fixtures/a08-self-play.json',import.meta.url),'utf8')).events.find(e=>e.label==='daily-after-move-record');
const views=[{name:'desktop',width:1280,height:800},{name:'webgl',width:1280,height:800,webgl:true},{name:'phone',width:390,height:844,mobile:true},{name:'phone-webgl',width:390,height:844,mobile:true,webgl:true},{name:'narrow',width:320,height:600,mobile:true,webgl:true},{name:'landscape',width:568,height:320,mobile:true,webgl:true},{name:'wide-landscape',width:844,height:390,mobile:true,webgl:true},{name:'short-desktop',width:1280,height:400,webgl:true}];
const checks=[],captures=[];let view;const ok=(name,pass,detail)=>{checks.push({view,name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${view} ${name}`);};
const tap=async(p,xy,mobile)=>{const[x,y]=xy;if(mobile){await p.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await p.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await p.mouse('mousePressed',x,y);await p.mouse('mouseReleased',x,y);}};
const setup=async(p,mode)=>{await p.eval(`(()=>{const a=__jewel.app,e=a.expedition;e.profile=${JSON.stringify(original.profile)};a.best=${original.legacyBest};__jewel.challenge(${JSON.stringify(mode)},{seed:1});__bestStep(2);a.ui.toastUntil=0;})()`);};
const swap=async(p,v)=>{for(const xy of await p.eval('__jewel.state().legalMoves[0].map(i=>__jewel.project(i))'))await tap(p,xy,v.mobile);await p.eval('__bestStep(4)');};
const read=p=>p.eval('(()=>{const ts=__bestTexts,i=ts.findIndex(t=>["Best","Timed best","30-move best","Daily best"].includes(t[0]));return {label:ts[i],value:ts[i+1],plaque:__jewel.app.ui.plaqueAt,score:__jewel.state().score,moves:__jewel.state().moves,day:__jewel.expedition().run.day};})()');
try{
 for(const [n,v]of views.entries()){
  if(label==='before'&&!['desktop','landscape'].includes(v.name))continue;
  view=v.name;const p=await launch({port:9860+n,...v});
  try{
   await p.goto(base+(v.webgl?'?webgl':'')+'#solo=1');await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});
   await p.eval(`(()=>{let clock=performance.now();performance.now=()=>clock;window.__bestStep=s=>{clock+=s*1000;__jewel.advance(s);};const ui=__jewel.app.ui,draw=ui.drawHUD;ui.drawHUD=function(){const text=this.text;window.__bestTexts=[];this.text=function(...args){__bestTexts.push(args);return text.apply(this,args);};try{return draw.call(this);}finally{this.text=text;}};})()`);
   for(const mode of label==='before'?['daily']:['daily','moves','timed']){
    await setup(p,mode);for(let i=0;i<3;i++)await swap(p,v);await p.eval('__bestStep(4);__jewel.app.ui.toastUntil=0;__jewel.app.ui.mouse.inside=false;__bestStep(0)');
    const r=await read(p);await p.shot(`${out}/${label}-${view}-${mode}.png`);captures.push({view,mode,capturedAt:new Date().toISOString(),...r});
    ok(mode+' three real input swaps score normally',r.moves===3&&r.score>0);
    if(label==='before')continue;
    const text=mode==='moves'?original.profile.bests.moves.score.toLocaleString('en-US'):'Set one';
    ok(mode+' shows only its completed local record',r.value?.[0]===text,r);
    ok(mode+' label belongs to the current mode',r.label?.[0]==='Best'||r.label?.[0]===(mode==='moves'?'30-move best':mode==='timed'?'Timed best':'Daily best'));
    ok(mode+' label and value do not overlap or leave viewport',await p.eval(`(()=>{const ts=__bestTexts,i=ts.findIndex(t=>['Best','Timed best','30-move best','Daily best'].includes(t[0])),l=ts[i],v=ts[i+1],u=__jewel.app.ui,lw=Math.min(u.measure(l[0],l[3]),l[6]??Infinity),vw=Math.min(u.measure(v[0],v[3]),v[6]??Infinity);return l[1]>=0&&l[2]>=0&&v[1]<=innerWidth&&v[2]+v[3]<innerHeight&&v[6]>0&&l[1]+lw+7<=v[1]-vw+.01;})()`));
    ok(mode+' drawing is read-only for records, saves and network',await p.eval(`(()=>{const a=__jewel.app,key=()=>JSON.stringify([a.best,a.board.score,a.expedition.profile,a.expedition.summary(),localStorage.getItem('gemstogether-expedition-v1'),a.coop.snapshot().board,a.coop.revision,a.coop.seq]),b=key();for(let i=0;i<4;i++)a.ui.drawHUD();return key()===b;})()`));
    await p.eval('__jewel.app.prefs.motion=false;__jewel.app.prefs.flash="off";__jewel.app.prefs.highContrast=true;__bestStep(0)');ok(mode+' comfort options preserve target',(await read(p)).value?.[0]===text);
   }
   if(label!=='before'){
    const cases=[['moves',null,'Set one'],['moves',0,'0'],['moves',12345,'12,345'],['timed',9876,'9,876'],['daily',1234,'1,234'],['daily',0,'0'],['daily','old','Set one'],['moves',1e12,'1,000,000,000,000']];
    for(const[mode,value,text]of cases){
     await setup(p,mode);await p.eval(`(()=>{const e=__jewel.app.expedition;if(${JSON.stringify(mode)}==='daily'){e.profile.bests.daily={score:999999,samples:[]};e.profile.daily=${value==='old'?"{day:'2000-01-01',score:999999,moves:30}":`{day:e.run.day,score:${value},moves:30}`};}else e.profile.bests[${JSON.stringify(mode)}]=${value===null?'undefined':`{score:${value},samples:[]}`};__bestStep(0);})()`);
     const r=await read(p);ok(`${mode} record ${value} uses correct target`,r.value?.[0]===text,r.value);
     ok(`${mode} record ${value} keeps the original number-width budget`,await p.eval(`(()=>{const ts=__bestTexts,i=ts.findIndex(t=>['Best','Timed best','30-move best','Daily best'].includes(t[0])),v=ts[i+1],ui=__jewel.app.ui;return !ui.plaqueAt||v[6]+.01>=Math.min(ui.measure(v[0],17),ui.plaqueAt[2]-80);})()`));
    }
    await setup(p,'daily');await p.eval("__jewel.app.expedition.profile.daily={day:'2000-01-01',score:777,moves:30};__jewel.app.expedition.run.day='2000-01-01';__bestStep(0)");ok('daily compares the shared run day, not the wall clock',(await read(p)).value?.[0]==='777');
    await setup(p,'moves');
    for(const kind of ['practice','auto','spectator']){
     await p.eval(kind==='spectator'?'Object.defineProperty(__jewel.app.coop,"spectator",{configurable:true,get:()=>true});__bestStep(0)':`__jewel.app.${kind}=true;__bestStep(0)`);
     const r=await read(p);ok(kind+' keeps legacy Best presentation',r.label?.[0]==='Best'&&r.value?.[0]===original.legacyBest.toLocaleString('en-US'));
     await p.eval(kind==='spectator'?'delete __jewel.app.coop.spectator;__bestStep(0)':`__jewel.app.${kind}=false;__bestStep(0)`);
    }
    for(const mode of ['zen','puzzle']){await setup(p,mode);const r=await read(p);ok(mode+' retains its legacy Best',r.label?.[0]==='Best'&&r.value?.[0]===original.legacyBest.toLocaleString('en-US'));}
    await setup(p,'moves');await p.eval('__jewel.app.expedition.profile.bests.moves={score:100,samples:[]};__bestStep(0)');await swap(p,v);
    ok('passing the target keeps the completed record until finish',(await read(p)).value?.[0]==='100'&&await p.eval('__jewel.state().score>100'));
    await p.eval('__jewel.app.board.moves=29');await swap(p,v);await p.eval('__bestStep(8)');
    ok('normal completion saves a new best and retains prior result comparison',await p.eval('(()=>{const a=__jewel.app,e=a.expedition;return e.run.finished&&e.hudBest().score===e.run.score&&e.profile.bests.moves.score===e.run.score&&e.resultRecord.previous===100&&e.resultComparison().title==="NEW PERSONAL BEST";})()'));
    const again=await p.eval('__jewel.ui().hits.find(h=>h.id==="again")');await tap(p,[again.x+again.w/2,again.y+again.h/2],v.mobile);await p.eval('__bestStep(2)');ok('real replay keeps the saved challenge target',await p.eval('__jewel.state().moves===0&&!__jewel.app.gameOver&&__jewel.app.expedition.hudBest().score===__jewel.app.expedition.profile.bests.moves.score'));
    ok('requested renderer is clean',await p.eval(`__jewel.diagnostics().backend===${JSON.stringify(v.webgl?'WebGL 2':'WebGPU')}&&__jewel.diagnostics().errors.length===0&&__jewel.diagnostics().nonfiniteActors.length===0`)&&!p.logs.some(s=>s.startsWith('EXCEPTION')));
   }
  }finally{p.kill();}
 }
}finally{writeFileSync(`${out}/${label}-checks.json`,JSON.stringify({checks,captures,recordSource:'A08 real self-play profile; subsequent edge cases use explicit QA fixtures'},null,2));}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
