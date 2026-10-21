import {launch,until,sleep} from './cdp.mjs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {mkdirSync,writeFileSync} from 'node:fs';
const target=process.argv[2]||'index.html',label=process.argv[3]||'local',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href,out='tools/out/miss-hint';mkdirSync(out,{recursive:true});let A,B;const checks=[];const ok=(name,pass)=>{checks.push({name,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
const boot=async(p,hash)=>{await p.goto(base+hash);await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});};
const invalid=`(()=>{const b=__jewel.app.board;for(let i=0;i<64;i++)for(const j of[i+1,i+8])if(j<64&&b.adjacent(i,j)&&!b.validSwap(i,j))return [i,j];})()`;
const input=async(p,pair)=>{for(const cell of pair){const[x,y]=await p.eval(`__jewel.project(${cell})`);await p.mouse('mousePressed',x,y);await p.mouse('mouseReleased',x,y);await sleep(70);}};
try{
 A=await launch({port:9891,width:1280,height:800});B=await launch({port:9892,width:390,height:844});await boot(A,'#solo=1');await A.eval('__jewel.app.openPanel("coop");__jewel.app.ui.activate("coop-host")');const code=await until(()=>A.eval('__jewel.net().code'));await boot(B,'#room='+code);
 await until(async()=>await A.eval('__jewel.net().connected')&&await B.eval('__jewel.net().connected&&__jewel.app.coop.synced'),{timeout:60000});for(const p of[A,B])await p.eval('__jewel.app.closePanel()');
 ok('isolated private room',await A.eval('!__jewel.net().publicRoom')&&await B.eval('!__jewel.net().publicRoom'));
 for(const[player,other,name]of[[B,A,'peer'],[A,B,'host']]){
  await A.eval('__jewel.challenge("zen",{seed:1})');await until(async()=>await A.eval('__jewel.state().phase==="idle"&&__jewel.state().moves===0')&&await B.eval('__jewel.state().phase==="idle"&&__jewel.state().moves===0'));await sleep(300);
  await player.eval('__jewel.app.expedition.dismissTour()');const profile=await player.eval('JSON.stringify({...__jewel.app.expedition.profile,input:undefined})'),hash=await player.eval('__jewel.net().hash');
  for(let n=0;n<3;n++){await input(player,await player.eval(invalid));await sleep(650);ok(name+' threshold '+n,await player.eval(`__jewel.app.hintCells.length===${n===2?2:0}`));}
  ok(name+' hint stays local',await other.eval('__jewel.app.hintCells.length===0'));
  ok(name+' no shared board mutation',await player.eval('__jewel.net().hash')===hash);ok(name+' no save mutation beyond existing input bookkeeping',await player.eval('JSON.stringify({...__jewel.app.expedition.profile,input:undefined})')===profile);
  await input(player,await player.eval('__jewel.app.hintCells'));await until(async()=>await A.eval('__jewel.state().moves===1&&__jewel.state().phase==="idle"')&&await B.eval('__jewel.state().moves===1&&__jewel.state().phase==="idle"'));
  ok(name+' hinted real swap synchronizes',await A.eval('__jewel.net().hash')===await B.eval('__jewel.net().hash'));
  for(const p of[A,B])ok(name+' success clears miss state',await p.eval('!__jewel.app.missHint'));
 }
 for(const p of[A,B])ok('runtime clean',await p.eval('__jewel.diagnostics().errors.length===0'));
}finally{A?.kill();B?.kill();writeFileSync(out+'/'+label+'-private-checks.json',JSON.stringify(checks,null,2));}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
