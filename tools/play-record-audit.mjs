// Local menu targets: true zero, UTC daily freshness, retained saves and real input.
import {launch,until,sleep} from './cdp.mjs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {mkdirSync,writeFileSync} from 'node:fs';
const target=process.argv[2]||'index.html',label=process.argv[3]||'local',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href,out='tools/out/play-record';mkdirSync(out,{recursive:true});
const checks=[],captures=[];let p;const ok=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
const key=async(key,code,keyCode)=>{await p.call('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:keyCode});await p.call('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:keyCode});await p.eval('__step(0)');};
const tap=async(x,y,mobile)=>{if(mobile){await p.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await p.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await p.mouse('mousePressed',x,y);await p.mouse('mouseReleased',x,y);}};
const click=async(id,mobile)=>{const hit=await p.eval(`__jewel.ui().hits.find(h=>h.id===${JSON.stringify(id)})`);if(!hit)throw Error('Missing '+id);await tap(hit.x+hit.w/2,hit.y+hit.h/2,mobile);await p.eval('__step(0)');};
const views=[{width:1280,height:800},{width:390,height:844,mobile:true,webgl:true},{width:320,height:480,mobile:true,webgl:true},{width:568,height:320,mobile:true,webgl:true}];
try{for(const[n,v]of views.entries()){
 p=await launch({port:9854+n,...v});await p.goto(base+(v.webgl?'?webgl':'')+'#solo=1');await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});
 await p.eval(`(()=>{let clock=performance.now();performance.now=()=>clock;window.__step=s=>{clock+=s*1000;__jewel.advance(s);};const u=__jewel.app.ui,panel=u.expeditionPanel,para=u.paragraph,text=u.text;u.expeditionPanel=function(){window.__recordDraw=[];return panel.call(this);};u.paragraph=function(t,...args){const record=/^(Your best:|Today's best:|Set your first best|Set today's first best)/.test(t);if(record)window.__recordPainting=[];const end=para.call(this,t,...args);if(record){__recordDraw.push({text:t,args,end,lines:__recordPainting});window.__recordPainting=null;}return end;};u.text=function(...args){if(window.__recordPainting)__recordPainting.push({args,width:this.measure(args[0],args[3])});return text.apply(this,args);};__jewel.challenge('zen',{seed:18018});__step(3);})()`);
 for(const i of await p.eval('__jewel.state().legalMoves[0]'))await tap(...await p.eval(`__jewel.project(${i})`),v.mobile);await p.eval('__step(4)');ok(v.width+' real solo input scores',await p.eval('__jewel.state().moves===1&&__jewel.state().score>0'));
 await click('play',v.mobile);ok(v.width+' first-run target labels',await p.eval('__recordDraw.map(r=>r.text).join("|")==="Set your first best|Set your first best|Set today\'s first best"'));
 const cases=[['zero',0,0,'today',0],['existing',1800,8750,'today',4321],['old-daily',1800,8750,'2000-01-01',99999],['large',1e12,1e12,'today',1e12]];
 for(const[name,timed,moves,day,daily]of cases){
  await p.eval(`(()=>{const e=__jewel.app.expedition;e.profile.bests={timed:{score:${timed},samples:[]},moves:{score:${moves},samples:[]},daily:{score:999999,samples:[]}};e.profile.daily={day:${day==='today'?'new Date().toISOString().slice(0,10)':JSON.stringify(day)},score:${daily},moves:30};e.run.day='2000-01-01';__step(0);})()`);
  const expected=['Your best: '+timed.toLocaleString('en-US'),'Your best: '+moves.toLocaleString('en-US'),day==='today'?"Today's best: "+daily.toLocaleString('en-US'):"Set today's first best"];
  ok(v.width+' '+name+' displays the right local records',JSON.stringify(await p.eval('__recordDraw.map(r=>r.text)'))===JSON.stringify(expected));
  ok(v.width+' '+name+' full-size glyphs fit and rows stay separated',await p.eval('__recordDraw.every(r=>r.lines.every(l=>l.width<=r.args[2]+.01&&l.args[3]===12)&&r.end>=r.args[1]+12)'));
  if(name==='existing'){
   await p.eval('__jewel.app.ui.scroll=105;__step(0)');await p.shot(`${out}/${label}-${v.width}-records.png`);captures.push({view:v,at:new Date().toISOString(),records:await p.eval('__recordDraw'),file:`${label}-${v.width}-records.png`});
  }
 }
 ok(v.width+' menu draws preserve saves board run and network',await p.eval(`(()=>{const a=__jewel.app,key=()=>JSON.stringify([a.board.cells,a.board.score,a.board.moves,a.expedition.profile,a.expedition.summary(),localStorage.getItem('gemstogether-expedition-v1'),a.coop.snapshot(),a.coop.revision,a.coop.seq]),before=key();for(let n=0;n<4;n++){a.ui.ink.begin(a.cssWidth,a.cssHeight);a.ui.hits=[];a.ui.expeditionPanel();}return key()===before;})()`));
 for(const flag of ['practice','auto','spectator']){
  await p.eval(flag==='spectator'?'Object.defineProperty(__jewel.app.coop,"spectator",{configurable:true,get:()=>true});__step(0)':`__jewel.app.${flag}=true;__step(0)`);
  ok(v.width+' '+flag+' retains personal targets',await p.eval('__recordDraw[0].text==="Your best: 1,000,000,000,000"'));
  await p.eval(flag==='spectator'?'delete __jewel.app.coop.spectator;__step(0)':`__jewel.app.${flag}=false;__step(0)`);
 }
 // Put the timed choice within the scroll body, then Tab into it using actual input.
 await p.eval(`(()=>{const u=__jewel.app.ui;u.scroll=0;__step(0);const r=__recordDraw[0];u.scroll=Math.max(0,r.args[1]-u.panelRect.body.y-58);__step(0);const ix=u.hits.findIndex(h=>h.id==='exp-mode-timed');u.focus=u.hits[ix-1].id;})()`);
 await key('Tab','Tab',9);ok(v.width+' focus announces the record',await p.eval('__jewel.app.ui.focus==="exp-mode-timed"&&document.getElementById("accessibility-status").textContent==="Two minutes. Your best: 1,000,000,000,000"'));
 await p.eval('document.getElementById("accessibility-status").textContent="Later status";__step(0);__step(0)');ok(v.width+' redraw keeps later accessible status',await p.eval('document.getElementById("accessibility-status").textContent==="Later status"'));
 await key('Enter','Enter',13);await p.eval('__step(3)');ok(v.width+' keyboard starts original timed mode',await p.eval('!__jewel.app.panelOpen&&__jewel.expedition().run.mode==="timed"&&__jewel.state().moves===0'));
 for(const i of await p.eval('__jewel.state().legalMoves[0]'))await tap(...await p.eval(`__jewel.project(${i})`),v.mobile);await p.eval('__step(4)');ok(v.width+' play remains usable after menu selection',await p.eval('__jewel.state().moves===1&&__jewel.state().score>0'));
 await click('play',v.mobile);await p.eval('__jewel.app.ui.scroll=__jewel.app.ui.maxScroll;__step(0)');ok(v.width+' puzzle actions remain reachable',await p.eval('__jewel.ui().hits.some(h=>h.id==="exp-puzzle-3")'));
 await click('exp-puzzle-3',v.mobile);await p.eval('__step(3)');ok(v.width+' last puzzle starts through actual input',await p.eval('__jewel.expedition().run.mode==="puzzle"&&__jewel.expedition().run.puzzle===3&&!__jewel.app.panelOpen'));
 ok(v.width+' runtime and renderer clean',await p.eval(`__jewel.diagnostics().errors.length===0&&__jewel.diagnostics().backend===${JSON.stringify(v.webgl?'WebGL 2':'WebGPU')}`)&&!p.logs.some(s=>s.startsWith('EXCEPTION')));
 p.kill();p=null;
}}finally{p?.kill();writeFileSync(`${out}/${label}-checks.json`,JSON.stringify({checks,captures},null,2));}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
