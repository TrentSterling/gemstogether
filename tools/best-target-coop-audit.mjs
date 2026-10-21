// Shared score, private target: two real peers must keep their own records.
import {launch,until} from './cdp.mjs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {mkdirSync,writeFileSync} from 'node:fs';
const target=process.argv[2]||'index.html',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href,out='tools/out/best-target';mkdirSync(out,{recursive:true});const checks=[];let A,B;
const ok=(name,pass)=>{checks.push({name,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
const synced=()=>until(async()=>await A.eval('__jewel.net().hash')===await B.eval('__jewel.net().hash')&&await B.eval('__jewel.app.coop.synced'),{timeout:30000});
const read=p=>p.eval('(()=>{const i=__targetText.findIndex(t=>["Best","Timed best","30-move best","Daily best"].includes(t));return __targetText[i+1];})()');
try{
 A=await launch({port:9890});B=await launch({port:9891,width:568,height:320,mobile:true});
 for(const p of[A,B]){await p.goto(base+'#solo=1');await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});await p.eval(`(()=>{const u=__jewel.app.ui,draw=u.drawHUD;u.drawHUD=function(){const text=this.text;window.__targetText=[];this.text=function(...a){__targetText.push(a[0]);return text.apply(this,a);};try{return draw.call(this);}finally{this.text=text;}};})()`);}
 await A.eval('__jewel.app.coop.host()');const code=await until(()=>A.eval('__jewel.net().code'));await B.eval(`__jewel.app.coop.join(${JSON.stringify(code)})`);await until(async()=>await A.eval('__jewel.net().connected')&&await B.eval('__jewel.net().connected&&__jewel.app.coop.synced'),{timeout:60000});await synced();
 ok('isolated private room',await A.eval('!__jewel.net().publicRoom')&&await B.eval('!__jewel.net().publicRoom'));
 for(const[mode,host,peer]of[['moves',1000,7000],['timed',2000,9000],['daily',1500,null]]){
  await A.eval(`__jewel.challenge(${JSON.stringify(mode)},{seed:1});__jewel.resume()`);await B.eval('__jewel.resume()');await until(()=>B.eval(`__jewel.expedition().run.mode===${JSON.stringify(mode)}&&__jewel.state().phase==="idle"`));await synced();
  for(const[p,value]of[[A,host],[B,peer]])await p.eval(`(()=>{const a=__jewel.app,e=a.expedition;a.best=888888;if(${JSON.stringify(mode)}==='daily'){e.profile.bests.daily={score:999999,samples:[]};e.profile.daily=${value===null?"{day:'2000-01-01',score:999999,moves:30}":`{day:e.run.day,score:${value},moves:30}`};}else e.profile.bests[${JSON.stringify(mode)}]={score:${value},samples:[]};e.save();a.draw();})()`);
  for(const xy of await B.eval('__jewel.state().legalMoves[0].map(i=>__jewel.project(i))')){await B.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:xy[0],y:xy[1]}]});await B.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  await until(async()=>await A.eval('__jewel.state().moves===1&&__jewel.state().phase==="idle"')&&await B.eval('__jewel.state().moves===1&&__jewel.state().phase==="idle"'),{timeout:30000});await synced();
  ok(mode+' actual peer touch scores on both boards',await A.eval('__jewel.state().score>0')&&await A.eval('__jewel.state().score')===await B.eval('__jewel.state().score'));
  ok(mode+' host sees its own target',await read(A)===host.toLocaleString('en-US'));
  ok(mode+' peer sees its different local target',await read(B)===(peer===null?'Set one':peer.toLocaleString('en-US')));
  for(const[p,name]of[[A,'host'],[B,'peer']])ok(mode+' '+name+' drawing cannot change or publish shared state',await p.eval(`(()=>{const a=__jewel.app,key=()=>JSON.stringify([a.best,a.expedition.profile,a.expedition.summary(),a.coop.revision,a.coop.seq,a.coop.stats.events,a.coop.snapshot().board,localStorage.getItem('gemstogether-expedition-v1')]),before=key();for(let i=0;i<10;i++)a.ui.draw();return key()===before;})()`));
  const id=await A.eval('__jewel.expedition().run.id');await B.eval('__jewel.challenge("zen")');ok(mode+' peer cannot change host challenge',await A.eval('__jewel.expedition().run.id')===id&&await B.eval('__jewel.expedition().run.id')===id);
  ok(mode+' record presentation stays outside shared summary',await A.eval('!Object.hasOwn(__jewel.app.expedition.summary(),"hudBest")')&&await B.eval('!Object.hasOwn(__jewel.app.expedition.summary(),"hudBest")'));
  await A.shot(`${out}/private-${mode}-host.png`);await B.shot(`${out}/private-${mode}-peer.png`);
 }
 ok('both runtimes clean',await A.eval('__jewel.diagnostics().errors.length===0')&&await B.eval('__jewel.diagnostics().errors.length===0')&&![...A.logs,...B.logs].some(s=>s.startsWith('EXCEPTION')));
}finally{A?.kill();B?.kill();writeFileSync(out+'/coop-checks.json',JSON.stringify(checks,null,2));}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
