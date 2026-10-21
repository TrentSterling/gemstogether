// Real touch input plus layout boundaries for A04's short landscape controls.
import {launch,sleep,until} from './cdp.mjs';
import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
const target=process.argv[2]||'index.html',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href;
const out='tools/out/landscape';mkdirSync(out,{recursive:true});const checks=[],events=[];let p,view;
const ok=(name,pass,detail)=>{checks.push({view,name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${view} ${name}`);};
const tap=async(x,y)=>{await p.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await sleep(60);await p.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(120);};
const button=async id=>{const h=await until(()=>p.eval(`__jewel.ui().hits.find(h=>h.id===${JSON.stringify(id)})`),{timeout:2000});if(!h)throw Error('Missing button '+id);await tap(h.x+h.w/2,h.y+h.h/2);};
const idle=()=>until(()=>p.eval('__jewel.state().phase==="idle"'),{timeout:30000});
const resize=async(w,h)=>{await p.call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:2,mobile:true});await until(()=>p.eval(`__jewel.app.cssWidth===${w}&&__jewel.app.cssHeight===${h}`));await sleep(150);};
const geometry=`(()=>{const ids=['hint','play','journey','demo','sound','settings','coop-open'],buttons=__jewel.ui().hits.filter(h=>ids.includes(h.id)),centers=Array.from({length:64},(_,i)=>__jewel.project(i)),r=Math.abs(centers[1][0]-centers[0][0])*.44;return {buttons,centers,r,blocked:centers.flatMap(([x,y],i)=>buttons.filter(b=>x+r>b.x&&x-r<b.x+b.w&&y+r>b.y&&y-r<b.y+b.h).map(b=>({i,control:b.id}))),boardRect:__jewel.app.ui.boardRect};})()`;
try{
 for(const backend of ['webgpu','webgl']){
  p=await launch({port:backend==='webgl'?9771:9770,width:568,height:320,mobile:true,deviceScaleFactor:2});
  await p.goto(base+(backend==='webgl'?'?webgl':'')+'#solo=1');await until(()=>p.eval('window.__jewel?.ready'),{timeout:60000});await idle();await sleep(400);
  view=backend+'-568x320';await p.shot(`${out}/${view}-start.png`);
  // Normal, unmodified board and real touch events. In baseline, 60,61 opens Journey.
  for(let i=0;i<8;i++){
   const before=await p.eval('__jewel.state()'),pair=i===0?[60,61]:before.legalMoves.slice().sort((a,b)=>Math.max(...b)-Math.max(...a))[0];
   for(const cell of pair)await tap(...await p.eval(`__jewel.project(${cell})`));
   await until(()=>p.eval(`__jewel.state().moves>${before.moves}`),{timeout:8000});await idle();
   events.push({view,pair,...await p.eval('({moves:__jewel.state().moves,score:__jewel.state().score,panel:__jewel.ui().panel})')});
  }
  ok('eight normal lower-board touch swaps score',await p.eval('__jewel.state().moves===8&&__jewel.state().score>0&&!__jewel.app.panelOpen'));
  await p.shot(`${out}/${view}-play.png`);
  const key='JSON.stringify([__jewel.state().score,__jewel.state().moves,__jewel.app.coop.snapshot().board,__jewel.expedition().profile])',saved=await p.eval(key);
  await resize(390,844);await p.shot(`${out}/${backend}-portrait.png`);await resize(568,320);
  ok('rotation preserves board, score, moves and profile',saved===await p.eval(key));
  for(const [w,h]of [[540,320],[568,320],[599,320],[600,320],[640,320],[568,359],[600,359],[599,360],[600,360],[640,360],[667,375],[844,390],[390,844],[1280,900]]){
   await resize(w,h);view=backend+'-'+w+'x'+h;const g=await p.eval(geometry);
   ok('all seven touch controls remain inside viewport',g.buttons.length===7&&g.buttons.every(b=>b.x>=0&&b.y>=0&&b.x+b.w<=w+.01&&b.y+b.h<=h+.01&&b.h>=40),g.buttons);
   ok('gem envelopes clear controls',g.blocked.length===0,g.blocked);
   if(h<360&&w>=540)ok('utility buttons retain readable width',g.buttons.filter(b=>['sound','settings','coop-open'].includes(b.id)).every(b=>b.w>=90));
   if(['webgpu-568x320','webgpu-600x320','webgpu-600x359','webgpu-600x360','webgpu-1280x900'].includes(view))await p.shot(`${out}/${view}.png`);
  }
  await resize(568,320);view=backend+'-panels';
  for(const id of ['journey','play','settings','coop-open']){
   await button(id);ok(id+' opens with About entry hidden',await p.eval('__jewel.app.panelOpen&&getComputedStyle(document.querySelector("#trontAbout")).visibility==="hidden"'));
   await p.shot(`${out}/${backend}-${id}.png`);await button('close');
   ok(id+' physical Back returns and restores About',await p.eval('!__jewel.app.panelOpen&&!document.querySelector("#trontAbout").open&&getComputedStyle(document.querySelector("#trontAbout")).visibility!=="hidden"'));
  }
  const muted=await p.eval('__jewel.app.prefs.muted');await button('sound');ok('sound toggle works',muted!==await p.eval('__jewel.app.prefs.muted'));await button('sound');
  await button('demo');ok('showcase starts',await p.eval('__jewel.app.auto'));await button('demo');ok('showcase stops',await p.eval('!__jewel.app.auto'));await idle();
  await p.eval('__jewel.app.openPanel("settings")');await p.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await p.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await sleep(100);ok('Escape restores About',await p.eval('!__jewel.app.panelOpen&&!document.body.classList.contains("gems-panel-open")'));
  await p.eval('document.querySelector("#trontAbout").open=true;__jewel.app.openPanel("settings")');
  ok('already-open About stays visible',await p.eval('document.querySelector("#trontAbout").open&&getComputedStyle(document.querySelector("#trontAbout")).visibility!=="hidden"'));
  await p.eval('document.querySelector("#trontAbout").open=false;__jewel.app.closePanel()');
  await p.eval('__jewel.app.openPanel("journey")');await sleep(100);const back=await p.eval('__jewel.ui().hits.find(h=>h.id==="close")');await p.mouse('mousePressed',back.x+back.w/2,back.y+back.h/2);await p.mouse('mouseReleased',back.x+back.w/2,back.y+back.h/2);await sleep(100);ok('mouse Back does not open About',await p.eval('!__jewel.app.panelOpen&&!document.querySelector("#trontAbout").open&&!document.body.classList.contains("gems-panel-open")'));
  await p.eval('__jewel.app.expedition.enterPhoto()');await button('close');
  ok('photo close restores About and photo state',await p.eval('!__jewel.app.expedition.photo&&!document.body.classList.contains("gems-panel-open")'));
  for(const mode of ['zen','timed','moves','daily','puzzle']){
   await p.eval(`__jewel.challenge(${JSON.stringify(mode)},{seed:43})`);await idle();await sleep(100);
   ok(mode+' board clear of controls',(await p.eval(geometry)).blocked.length===0);await p.shot(`${out}/${backend}-${mode}.png`);
  }
  await p.eval('__jewel.app.prefs.motion=false;__jewel.app.prefs.flash="off";__jewel.app.prefs.tapOnly=true');
  const count=await p.eval('__jewel.state().moves');for(const cell of await p.eval('__jewel.state().legalMoves[0]'))await tap(...await p.eval(`__jewel.project(${cell})`));await idle();
  ok('tap-only comfort mode still accepts touch',await p.eval(`__jewel.state().moves>${count}`));
  ok('requested backend and runtime clean',await p.eval(`__jewel.diagnostics().backend===${JSON.stringify(backend==='webgl'?'WebGL 2':'WebGPU')}&&__jewel.diagnostics().errors.length===0`)&&!p.logs.some(l=>l.startsWith('EXCEPTION')));
  p.kill();p=null;
 }
}finally{p?.kill();writeFileSync(`${out}/checks.json`,JSON.stringify({checks,events},null,2));}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
