// Private host/peer move-budget presentation and authority, with real peer input.
import {launch,until} from './cdp.mjs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {mkdirSync,writeFileSync} from 'node:fs';
const target=process.argv[2]||'index.html',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href,out='tools/out/move-budget';mkdirSync(out,{recursive:true});const checks=[];let A,B;
const ok=(name,pass)=>{checks.push({name,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
const synced=()=>until(async()=>await A.eval('__jewel.net().hash')===await B.eval('__jewel.net().hash')&&await B.eval('__jewel.app.coop.synced'),{timeout:30000});
try{
 A=await launch({port:9840});B=await launch({port:9841,width:568,height:320,mobile:true});
 for(const p of [A,B]){await p.goto(base+'#solo=1');await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});await p.eval(`(()=>{const u=__jewel.app.ui,draw=u.expeditionHUD;u.expeditionHUD=function(){const text=this.text;window.__budgetText=[];this.text=function(...args){__budgetText.push(args[0]);return text.apply(this,args);};try{return draw.call(this);}finally{this.text=text;}};})()`);}
 await A.eval('__jewel.app.coop.host()');const code=await until(()=>A.eval('__jewel.net().code'));await B.eval(`__jewel.app.coop.join(${JSON.stringify(code)})`);await until(async()=>await A.eval('__jewel.net().connected')&&await B.eval('__jewel.net().connected&&__jewel.app.coop.synced'),{timeout:60000});await synced();
 ok('isolated private room',await A.eval('!__jewel.net().publicRoom')&&await B.eval('!__jewel.net().publicRoom'));
 for(const mode of ['moves','daily']){
  await A.eval(`__jewel.challenge(${JSON.stringify(mode)},{seed:1,day:'2026-10-21'});__jewel.resume()`);await B.eval('__jewel.resume()');await until(()=>B.eval(`__jewel.expedition().run.mode===${JSON.stringify(mode)}&&__jewel.state().phase==="idle"`));await synced();
  for(const xy of await B.eval('__jewel.state().legalMoves[0].map(i=>__jewel.project(i))')){await B.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:xy[0],y:xy[1]}]});await B.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  await until(async()=>await A.eval('__jewel.state().moves===1&&__jewel.state().phase==="idle"')&&await B.eval('__jewel.state().moves===1&&__jewel.state().phase==="idle"'),{timeout:30000});await synced();
  ok(mode+' real peer touch consumes one shared move',await A.eval('__jewel.state().score>0')&&await A.eval('__budgetText.some(t=>t.startsWith("29 MOVES LEFT"))')&&await B.eval('__budgetText.some(t=>t.startsWith("29 MOVES LEFT"))'));
  const beforeMode=await A.eval('__jewel.expedition().run.id');await B.eval('__jewel.challenge("zen")');ok(mode+' host retains challenge authority',beforeMode===await B.eval('__jewel.expedition().run.id')&&beforeMode===await A.eval('__jewel.expedition().run.id'));
  for(const [p,name]of [[A,'host'],[B,'peer']])ok(mode+' '+name+' HUD cannot mutate or publish',await p.eval(`(()=>{const a=__jewel.app,key=()=>JSON.stringify([a.expedition.summary(),a.expedition.profile,a.coop.revision,a.coop.seq,a.coop.stats.events,a.coop.snapshot().board,localStorage.getItem('gemstogether-expedition-v1')]),before=key();for(let i=0;i<10;i++)a.ui.expeditionHUD();return key()===before;})()`));
  await A.eval('__jewel.advance(0);__jewel.app.board.moves=29;__jewel.app.coop.fullSync()');await until(()=>B.eval('__jewel.state().moves===29'));for(const p of [A,B])await p.eval('__jewel.advance(0)');
  ok(mode+' both show final shared move',await A.eval('__budgetText.some(t=>t.startsWith("FINAL MOVE"))')&&await B.eval('__budgetText.some(t=>t.startsWith("FINAL MOVE"))'));
  await A.shot(`${out}/private-${mode}-host.png`);await B.shot(`${out}/private-${mode}-peer.png`);
  for(const [x,y]of await A.eval('__jewel.state().legalMoves[0].map(i=>__jewel.project(i))')){await A.mouse('mousePressed',x,y);await A.mouse('mouseReleased',x,y);}
  await A.eval('__jewel.advance(.1);__jewel.app.coop.fullSync()');await until(()=>B.eval('__jewel.state().moves===30'));for(const p of [A,B])await p.eval('__jewel.advance(0)');
  ok(mode+' both explain final cascade',await A.eval('__budgetText.some(t=>t.startsWith("LAST CASCADE"))&&!__jewel.expedition().run.finished')&&await B.eval('__budgetText.some(t=>t.startsWith("LAST CASCADE"))&&!__jewel.expedition().run.finished'));
  ok(mode+' neither accepts an extra shared move',await A.eval('!__jewel.app.expedition.acceptSwap()')&&await B.eval('!__jewel.app.expedition.acceptSwap()'));
  await A.eval('__jewel.advance(12);__jewel.app.coop.fullSync()');await until(()=>B.eval('__jewel.expedition().run.finished'));await synced();
  ok(mode+' completed scores and boards agree',await A.eval('__jewel.expedition().run.finished&&__jewel.state().moves===30')&&await A.eval('__jewel.state().score')===await B.eval('__jewel.state().score'));
 }
 ok('host and peer runtimes clean',await A.eval('__jewel.diagnostics().errors.length===0')&&await B.eval('__jewel.diagnostics().errors.length===0')&&![...A.logs,...B.logs].some(s=>s.startsWith('EXCEPTION')));
}finally{A?.kill();B?.kill();writeFileSync(out+'/coop-checks.json',JSON.stringify(checks,null,2));}
console.log(JSON.stringify({passed:checks.filter(x=>x.pass).length,total:checks.length}));if(checks.some(x=>!x.pass))process.exitCode=1;
