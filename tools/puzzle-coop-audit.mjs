import {launch,until,sleep} from './cdp.mjs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {mkdirSync,writeFileSync} from 'node:fs';
const base=pathToFileURL(resolve('index.html')).href,out='tools/out/puzzle';mkdirSync(out,{recursive:true});let A,B;const checks=[];
const ok=(name,pass)=>{checks.push({name,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
const idle=p=>until(()=>p.eval('__jewel.state().phase==="idle"'),{timeout:30000});
async function boot(p,hash){await p.goto(base+hash);await until(()=>p.eval('window.__jewel?.ready'),{timeout:60000});await idle(p);}
try{
 A=await launch({port:9831,width:1280,height:800});B=await launch({port:9832,width:568,height:320,mobile:true});await boot(A,'#solo=1');
 await A.eval('__jewel.app.openPanel("coop");__jewel.app.ui.activate("coop-host")');const code=await until(()=>A.eval('__jewel.net().code'),{timeout:30000});await boot(B,'#room='+code);
 await until(async()=>await A.eval('__jewel.net().connected')&&await B.eval('__jewel.net().connected&&__jewel.app.coop.synced'),{timeout:60000});for(const p of [A,B])await p.eval('__jewel.app.closePanel()');
 ok('isolated private room on both clients',await A.eval('!__jewel.net().publicRoom')&&await B.eval('!__jewel.net().publicRoom'));
 for(let i=0;i<4;i++){
  await A.eval(`__jewel.challenge('puzzle',{puzzle:${i}})`);await idle(A);await until(()=>B.eval(`__jewel.expedition().run.mode==='puzzle'&&__jewel.expedition().run.puzzle===${i}&&!__jewel.expedition().run.finished`));await idle(B);await sleep(300);
  ok('shared initial objective '+i,await A.eval('__jewel.app.expedition.puzzleObjective()')===await B.eval('__jewel.app.expedition.puzzleObjective()'));
  if(i===1){await A.shot(out+'/private-host.png');await B.shot(out+'/private-peer.png');}
  const p=i%2?B:A,pair=[[1,2],[28,36],[53,61],[11,19]][i];for(const cell of pair){const [x,y]=await p.eval(`__jewel.project(${cell})`);if(p===B){await p.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await p.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await p.mouse('mousePressed',x,y);await p.mouse('mouseReleased',x,y);}await sleep(120);}
  await until(async()=>await A.eval('__jewel.expedition().run.finished')&&await B.eval('__jewel.expedition().run.finished'),{timeout:40000});
  ok('shared completed objective '+i,await A.eval('__jewel.app.expedition.puzzleObjective()')===await B.eval('__jewel.app.expedition.puzzleObjective()'));
  ok('both clients solve and retain equal board '+i,await A.eval('__jewel.expedition().run.reason==="PUZZLE COMPLETE"&&__jewel.state().moves===1')&&await B.eval('__jewel.expedition().run.reason==="PUZZLE COMPLETE"&&__jewel.state().moves===1')&&await A.eval('__jewel.net().hash')===await B.eval('__jewel.net().hash'));
 }
 for(const p of [A,B])ok('clean runtime',await p.eval('__jewel.diagnostics().errors.length===0'));
}finally{A?.kill();B?.kill();writeFileSync(out+'/private-checks.json',JSON.stringify(checks,null,2));}
console.log(JSON.stringify({passed:checks.filter(x=>x.pass).length,total:checks.length}));if(checks.some(x=>!x.pass))process.exitCode=1;
