// Real private peer input plus shared-clock display with different local ghosts.
import {launch,sleep,until} from './cdp.mjs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
const target=process.argv[2]||'index.html',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href,checks=[];let A,B;
const ok=(name,pass)=>{checks.push({name,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
const synced=()=>until(async()=>await A.eval('__jewel.net().hash')===await B.eval('__jewel.net().hash')&&await B.eval('__jewel.app.coop.synced'),{timeout:30000});
try{
 A=await launch({port:9750});B=await launch({port:9751});
 for(const p of [A,B]){await p.goto(base+'#solo=1');await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});await p.eval('(()=>{const u=__jewel.app.ui,draw=u.expeditionHUD;u.expeditionHUD=function(){const text=this.text;window.__clockText=[];this.text=function(...args){__clockText.push(args[0]);return text.apply(this,args);};try{return draw.call(this);}finally{this.text=text;}};})()');}
 await A.eval('__jewel.app.ui.activate("coop-host")');const code=await until(()=>A.eval('__jewel.net().code'));await B.eval(`__jewel.app.coop.join(${JSON.stringify(code)})`);
 await until(async()=>await A.eval('__jewel.net().connected')&&await B.eval('__jewel.net().connected&&__jewel.app.coop.synced'),{timeout:60000});await synced();
 ok('isolated private room',await A.eval('!__jewel.net().publicRoom')&&await B.eval('!__jewel.net().publicRoom'));
 await A.eval('__jewel.challenge("timed",{seed:1})');await until(()=>A.eval('__jewel.state().phase==="idle"'));await synced();await until(()=>B.eval('__jewel.state().phase==="idle"'));
 for(const [x,y]of await B.eval('[1,2].map(i=>__jewel.project(i))')){await B.mouse('mousePressed',x,y);await B.mouse('mouseReleased',x,y);}
 await until(async()=>await A.eval('__jewel.state().moves===1&&__jewel.state().phase==="idle"')&&await B.eval('__jewel.state().moves===1&&__jewel.state().phase==="idle"'),{timeout:30000});await synced();
 ok('real peer swap scores and synchronizes',await A.eval('__jewel.state().score>0')&&await A.eval('__jewel.net().hash')===await B.eval('__jewel.net().hash'));
 for(const [p,score]of [[A,100],[B,500]])await p.eval(`__jewel.advance(0);__jewel.app.expedition.profile.bests.timed={score:${score},samples:[[0,0],[100,${score}]]};__jewel.app.prefs.ghost=true`);
 await A.eval('__jewel.app.expedition.run.elapsed=111;__jewel.app.coop.fullSync()');await until(()=>B.eval('__jewel.expedition().run.elapsed===111'));
 for(const p of [A,B])await p.eval('__jewel.advance(0)');
 ok('host and peer display the same shared countdown',await A.eval('__clockText.includes("FINAL 0:09")')&&await B.eval('__clockText.includes("FINAL 0:09")'));
 ok('personal ghosts stay local',await A.eval('__clockText.some(t=>t.startsWith("Ghost 100 /"))')&&await B.eval('__clockText.some(t=>t.startsWith("Ghost 500 /"))'));
 for(const [p,name]of [[A,'host'],[B,'peer']])ok(name+' HUD cannot mutate shared run or publish',await p.eval('(()=>{const a=__jewel.app,read=()=>JSON.stringify([a.expedition.summary(),a.coop.revision,a.coop.seq,a.coop.stats.events,a.coop.snapshot().board]),before=read();for(let i=0;i<10;i++)a.ui.expeditionHUD();return read()===before;})()'));
 mkdirSync('tools/out/timer',{recursive:true});await A.shot('tools/out/timer/coop-host.png');await B.shot('tools/out/timer/coop-peer.png');
 await A.eval('__jewel.app.expedition.run.elapsed=119.95');
 for(const [x,y]of await A.eval('__jewel.state().legalMoves[0].map(i=>__jewel.project(i))')){await A.mouse('mousePressed',x,y);await A.mouse('mouseReleased',x,y);}
 await A.eval('__jewel.advance(.1);__jewel.app.coop.fullSync()');await until(()=>B.eval('__jewel.expedition().run.elapsed>=120'));
 for(const p of [A,B])await p.eval('__jewel.advance(0)');
 ok('both show expiry while the accepted turn resolves',await A.eval('__clockText.includes("TIME UP")&&__clockText.includes("Finishing cascade")&&!__jewel.expedition().run.finished')&&await B.eval('__clockText.includes("TIME UP")&&__clockText.includes("Finishing cascade")&&!__jewel.expedition().run.finished'));
 ok('expired clock blocks new host and peer turns',await A.eval('!__jewel.app.expedition.acceptSwap()')&&await B.eval('!__jewel.app.expedition.acceptSwap()'));
 await A.eval('__jewel.advance(12);__jewel.app.coop.fullSync()');await until(()=>B.eval('__jewel.expedition().run.finished'));await synced();
 ok('completed scores agree after final cascade',await A.eval('__jewel.expedition().run.finished&&__jewel.state().moves===2')&&await A.eval('__jewel.state().score')===await B.eval('__jewel.state().score'));
 ok('both runtimes clean',await A.eval('__jewel.diagnostics().errors.length===0')&&await B.eval('__jewel.diagnostics().errors.length===0')&&![...A.logs,...B.logs].some(s=>s.startsWith('EXCEPTION')));
}finally{A?.kill();B?.kill();mkdirSync('tools/out/timer',{recursive:true});writeFileSync('tools/out/timer/coop-checks.json',JSON.stringify(checks,null,2));}
console.log(JSON.stringify({passed:checks.filter(x=>x.pass).length,total:checks.length}));if(checks.some(x=>!x.pass))process.exitCode=1;
