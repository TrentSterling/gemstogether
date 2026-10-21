// Practice presentation must not bypass shared-board authority or save guards.
import {launch,until,sleep} from './cdp.mjs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {mkdirSync,writeFileSync} from 'node:fs';
const base=pathToFileURL(resolve('index.html')).href,out='tools/out/practice-status';mkdirSync(out,{recursive:true});let A,B;const checks=[];const ok=(name,pass)=>{checks.push({name,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
const boot=async(p,hash)=>{await p.goto(base+hash);await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});};
try{
 A=await launch({port:9891,width:1280,height:800});B=await launch({port:9892,width:568,height:480});await boot(A,'#solo=1');await A.eval('__jewel.app.openPanel("coop");__jewel.app.ui.activate("coop-host")');const code=await until(()=>A.eval('__jewel.net().code'),{timeout:30000});await boot(B,'#room='+code);
 await until(async()=>await A.eval('__jewel.net().connected')&&await B.eval('__jewel.net().connected&&__jewel.app.coop.synced'),{timeout:60000});
 for(const p of [A,B])await p.eval('__jewel.app.closePanel()');
 ok('private room isolated',await A.eval('!__jewel.net().publicRoom')&&await B.eval('!__jewel.net().publicRoom'));
 for(const p of [A,B])ok('normal co-op has no practice card',await p.eval('__jewel.app.ui.practiceStatusLayout()===null'));
 await B.eval('__jewel.app.toggleDemo()');await sleep(200);
 ok('peer cannot start Showcase or announce a false practice transition',await B.eval('!__jewel.app.auto&&!__jewel.app.practice&&document.getElementById("accessibility-status").textContent==="The host controls the shared board and timing"'));
 await A.eval('__jewel.app.toggleDemo(true)');
 await until(()=>B.eval('__jewel.app.auto&&__jewel.app.practice'));
 for(const p of [A,B])ok('host Showcase state appears on both clients',await p.eval('__jewel.app.ui.practiceStatusLayout()?.label==="SHOWCASE"'));
 await A.eval('__jewel.app.toggleDemo(false)');await until(()=>B.eval('!__jewel.app.auto&&__jewel.app.practice'));
 for(const p of [A,B])ok('stopping Showcase retains practice status',await p.eval('__jewel.app.ui.practiceStatusLayout()?.label==="PRACTICE"'));
 const profile=await B.eval('JSON.stringify(__jewel.app.expedition.profile)');await B.eval('__jewel.app.toggleDemo(false)');
 ok('blocked peer stop preserves authority message and profile',await B.eval('document.getElementById("accessibility-status").textContent==="The host controls the shared board and timing"')&&await B.eval('JSON.stringify(__jewel.app.expedition.profile)')===profile);
 await A.eval('__jewel.challenge("zen",{seed:1})');await until(async()=>await A.eval('!__jewel.app.practice&&__jewel.state().phase==="idle"')&&await B.eval('!__jewel.app.practice&&__jewel.state().phase==="idle"'));
 ok('host new run clears practice on both clients',await A.eval('__jewel.app.ui.practiceStatusLayout()===null')&&await B.eval('__jewel.app.ui.practiceStatusLayout()===null'));
 const pair=await B.eval('__jewel.state().legalMoves[0]');for(const cell of pair){const [x,y]=await B.eval(`__jewel.project(${cell})`);await B.mouse('mousePressed',x,y);await B.mouse('mouseReleased',x,y);await sleep(120);}
 await until(async()=>await A.eval('__jewel.state().moves===1&&__jewel.state().phase==="idle"')&&await B.eval('__jewel.state().moves===1&&__jewel.state().phase==="idle"'));
 ok('peer real swap remains synchronized',await A.eval('__jewel.net().hash')===await B.eval('__jewel.net().hash'));
 for(const p of [A,B])ok('runtime clean',await p.eval('__jewel.diagnostics().errors.length===0'));
}finally{A?.kill();B?.kill();writeFileSync(out+'/private-checks.json',JSON.stringify(checks,null,2));}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
