// Short portrait regression: real touch/mouse input, all modes, shared projection.
import {launch,until,sleep} from './cdp.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
const file=process.argv[2]||'index.html',label=process.argv[3]||'after',base=/^https?:/.test(file)?file:pathToFileURL(resolve(file)).href,out='tools/out/portrait-layout';mkdirSync(out,{recursive:true});
const views=[['tiny',320,480,true],['tiny-gpu',320,480,false],['short',360,480,true],['boundary',375,500,true],['narrow',320,568,true],['phone-short',390,568,true],['phone',390,844,false],['landscape',568,320,true],['landscape-tall',667,375,true],['desktop',1280,800,false]];
const checks=[],captures=[];let view,mode;
const ok=(name,pass,detail)=>{checks.push({view,mode,name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${view} ${mode} ${name}`);};
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const tap=async(p,[x,y],mobile)=>{if(mobile){await p.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await p.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await p.mouse('mousePressed',x,y);await p.mouse('mouseReleased',x,y);}};
try{
 for(const [n,[name,w,h,webgl]]of views.entries()){
  if(label==='before'&&name!=='tiny')continue;view=name;const mobile=w<900,p=await launch({port:9850+n,width:w,height:h,mobile});
  try{
   await p.goto(base+(webgl?'?webgl':'')+'#solo=1');await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});
   await p.eval(`(()=>{let clock=performance.now();performance.now=()=>clock;window.__portraitStep=s=>{clock+=s*1000;__jewel.advance(s);};const a=__jewel.app,u=a.ui,draw=a.draw,box=u.ink.box;a.draw=function(...args){window.__portraitBoxes=[];return draw.apply(this,args);};u.ink.box=function(...args){__portraitBoxes.push(args.slice(0,5));return box.apply(this,args);};})()`);
   for(mode of ['zen','moves','daily','timed','puzzle']){
    await p.eval(`__jewel.challenge('${mode}',{seed:1,puzzle:0});__portraitStep(2)`);
    if(mode!=='puzzle')for(let i=0;i<3;i++){for(const xy of await p.eval('__jewel.state().legalMoves[0].map(i=>__jewel.project(i))'))await tap(p,xy,mobile);await p.eval('__portraitStep(4)');}
    await p.eval('__jewel.app.ui.toastUntil=0;__portraitStep(3)');
    const r=await p.eval(`({score:__jewel.state().score,moves:__jewel.state().moves,board:__jewel.app.ui.boardRect,hits:__jewel.ui().hits,framing:cabinetFraming(innerWidth,innerHeight),boxes:__portraitBoxes,points:Array.from({length:64},(_,i)=>__jewel.project(i)),errors:__jewel.diagnostics().errors})`);
    const buttons=r.hits.filter(b=>['hint','play','journey','demo','sound','coop-open','settings'].includes(b.id));
    ok('three real swaps resolve normally',mode==='puzzle'||r.moves===3&&r.score>0,{moves:r.moves,score:r.score});
    ok('all seven full-height controls remain available',buttons.length===7&&buttons.every(b=>b.h>=(w>=600?42:40)-.1),buttons);
    ok('controls remain within viewport',buttons.every(b=>b.x>=0&&b.y>=0&&b.x+b.w<=w+.1&&b.y+b.h<=h+.1));
    ok('control targets do not overlap',buttons.every((b,i)=>buttons.every((c,j)=>i===j||!overlap(b,c))));
    ok('projected gem centers clear control targets',r.points.every(([x,y])=>buttons.every(b=>x<b.x||x>b.x+b.w||y<b.y||y>b.y+b.h)));
    if(w<600&&h>=w&&mode!=='zen'){
     const strip={x:r.board.x,y:r.board.y+r.board.h+6,w:r.board.w,h:22},clear=buttons.every(b=>!overlap(strip,b));
     ok(label==='before'?'baseline reproduces obscured controls':'challenge strip clears all control targets',label==='before'?!clear:clear,{strip,top:Math.min(...buttons.map(b=>b.y))});
     ok('status strip is actually drawn at measured position',r.boxes.some(b=>Math.abs(b[1]-strip.y)<1&&Math.abs(b[3]-22)<1),r.boxes.filter(b=>Math.abs(b[1]-strip.y)<1));
    }
    if(name==='tiny'&&['moves','timed','puzzle'].includes(mode)||name==='phone'&&mode==='moves'){
     const path=`${out}/${label}-${name}-${mode}.png`;await p.shot(path);captures.push({view,mode,path,capturedAt:new Date().toISOString(),...r});
    }
    const play=buttons.find(b=>b.id==='play');await tap(p,[play.x+play.w/2,play.y+play.h/2],mobile);ok('Play opens from its visible target',await p.eval('__jewel.app.panelOpen&&__jewel.ui().tab==="play"'));await p.eval('__jewel.app.closePanel();__portraitStep(0)');
    const sound=buttons.find(b=>b.id==='sound'),muted=await p.eval('__jewel.app.prefs.muted');await tap(p,[sound.x+sound.w/2,sound.y+sound.h/2],mobile);ok('bottom-row sound toggle responds',await p.eval('__jewel.app.prefs.muted')!==muted);await tap(p,[sound.x+sound.w/2,sound.y+sound.h/2],mobile);
    ok('drawing preserves saves and shared gameplay',await p.eval(`(()=>{const a=__jewel.app,key=()=>JSON.stringify([a.board.score,a.board.moves,a.expedition.profile,a.expedition.summary(),a.coop.revision,a.coop.seq,localStorage.getItem('gemstogether-expedition-v1')]),before=key();for(let i=0;i<3;i++)a.ui.draw();return before===key();})()`));
   }
   if(label!=='before'){
    mode='resize-input';await p.eval('__jewel.challenge("moves",{seed:1});__portraitStep(2)');
    if(mobile){const [from,to]=await p.eval('__jewel.state().legalMoves[0].map(i=>__jewel.project(i))');await p.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from[0],y:from[1]}]});await p.call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:to[0],y:to[1]}]});await p.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.eval('__portraitStep(5)');ok('real drag uses matching camera and picking',await p.eval('__jewel.state().moves===1&&__jewel.state().score>0'));}
    await p.call('Emulation.setDeviceMetricsOverride',{width:h,height:w,deviceScaleFactor:1,mobile});await sleep(100);await p.eval('__portraitStep(0)');await p.call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile});await sleep(100);await p.eval('__portraitStep(0)');
    ok('rotation restores exact framing',await p.eval(`cabinetFraming(innerWidth,innerHeight).w===${w}&&cabinetFraming(innerWidth,innerHeight).h===${h}&&Object.isFrozen(cabinetFraming(innerWidth,innerHeight))`));
    const before=await p.eval('__jewel.state().moves');for(const xy of await p.eval('__jewel.state().legalMoves[0].map(i=>__jewel.project(i))'))await tap(p,xy,mobile);await p.eval('__portraitStep(5)');ok('real selection works after rotation',await p.eval('__jewel.state().moves')===before+1);
    await p.eval('__jewel.app.prefs.motion=false;__jewel.app.prefs.flash="off";__jewel.app.prefs.highContrast=true;__portraitStep(0)');ok('comfort settings keep seven controls',await p.eval('__jewel.ui().hits.filter(b=>["hint","play","journey","demo","sound","coop-open","settings"].includes(b.id)).length===7'));
    ok('requested renderer and clean runtime',await p.eval(`__jewel.diagnostics().backend===${JSON.stringify(webgl?'WebGL 2':'WebGPU')}&&__jewel.diagnostics().errors.length===0`)&&!p.logs.some(s=>s.startsWith('EXCEPTION')));
   }
  }finally{p.kill();}
 }
}finally{writeFileSync(`${out}/${label}-checks.json`,JSON.stringify({checks,captures},null,2));}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
