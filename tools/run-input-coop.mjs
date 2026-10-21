// Isolated private host/peer, with actual keyboard moves and blocked peer start.
import {launch,until,sleep} from './cdp.mjs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {mkdirSync,writeFileSync} from 'node:fs';
const target=process.argv[2]||'index.html',label=process.argv[3]||'local',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href,out='tools/out/run-input';mkdirSync(out,{recursive:true});let A,B;const checks=[];
const ok=(name,pass)=>{checks.push({name,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
const press=async(p,key)=>{await p.call('Input.dispatchKeyEvent',{type:'keyDown',key,code:key===' '?'Space':key});await p.call('Input.dispatchKeyEvent',{type:'keyUp',key,code:key===' '?'Space':key});};
const boot=async(p,hash)=>{await p.goto(base+hash);await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});};
try{
 A=await launch({port:9891,width:1280,height:800});B=await launch({port:9892,width:390,height:844});await boot(A,'#solo=1');await A.eval('__jewel.app.openPanel("coop");__jewel.app.ui.activate("coop-host")');const code=await until(()=>A.eval('__jewel.net().code'));await boot(B,'#room='+code);
 await until(async()=>await A.eval('__jewel.net().connected')&&await B.eval('__jewel.net().connected&&__jewel.app.coop.synced'),{timeout:60000});
 ok('isolated private room',await A.eval('!__jewel.net().publicRoom')&&await B.eval('!__jewel.net().publicRoom'));
 await B.eval('__jewel.app.openPanel("play");__jewel.app.ui.focus="exp-mode-timed"');await sleep(100);
 const id=await B.eval('__jewel.expedition().run.id'),hash=await B.eval('__jewel.net().hash');await press(B,'Enter');
 ok('peer cannot start challenge',await B.eval('__jewel.expedition().run.id')===id&&await B.eval('__jewel.net().hash')===hash);
 ok('rejected peer retains panel and focus',await B.eval('__jewel.app.panelOpen&&__jewel.app.ui.focus==="exp-mode-timed"'));
 await A.eval('__jewel.challenge("puzzle",{puzzle:0})');await until(()=>B.eval('__jewel.expedition().run.mode==="puzzle"&&__jewel.state().phase==="idle"'));
 ok('host start gives host board focus',await A.eval('__jewel.app.ui.focus===null&&!__jewel.app.panelOpen'));
 ok('remote reset preserves peer panel focus',await B.eval('__jewel.app.panelOpen&&__jewel.app.ui.focus==="exp-mode-timed"'));
 for(const[player,name]of[[A,'host'],[B,'peer']]){
  await A.eval('__jewel.challenge("puzzle",{puzzle:0})');await until(async()=>await A.eval('__jewel.state().moves===0&&__jewel.state().phase==="idle"')&&await B.eval('__jewel.state().moves===0&&__jewel.state().phase==="idle"'));await sleep(250);
  if(name==='peer'){await press(B,'Escape');await press(B,'Escape');}
  await player.eval('__jewel.app.keyboardCell=1');await press(player,' ');ok(name+' keyboard selects gem',await player.eval('__jewel.app.selected===1&&!__jewel.app.panelOpen'));await press(player,'ArrowRight');await press(player,' ');
  await until(async()=>await A.eval('__jewel.expedition().run.finished&&__jewel.state().moves===1')&&await B.eval('__jewel.expedition().run.finished&&__jewel.state().moves===1'));
  ok(name+' keyboard move completes shared puzzle',await A.eval('__jewel.state().score===150')&&await B.eval('__jewel.state().score===150'));
  ok(name+' board hashes agree',await A.eval('__jewel.net().hash')===await B.eval('__jewel.net().hash'));
 }
 for(const[p,name]of[[A,'host'],[B,'peer']])ok(name+' runtime clean',await p.eval('__jewel.diagnostics().errors.length===0'));
}finally{A?.kill();B?.kill();writeFileSync(`${out}/${label}-private-checks.json`,JSON.stringify(checks,null,2));}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
