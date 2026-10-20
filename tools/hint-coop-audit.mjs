// Prove that host/peer hints stay local and the hinted real move still synchronizes.
import {launch,sleep,until} from './cdp.mjs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {writeFileSync,mkdirSync} from 'node:fs';
const target=process.argv[2]||'index.html',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href;
const results=[],check=(name,pass)=>{results.push({name,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
let A,B;
const key=async p=>{await p.call('Input.dispatchKeyEvent',{type:'keyDown',key:'h',code:'KeyH'});await p.call('Input.dispatchKeyEvent',{type:'keyUp',key:'h',code:'KeyH'});};
const boot=async(p,hash)=>{await p.goto(base+hash);await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});};
try{
 A=await launch({port:9680});await boot(A,'#solo=1');
 await A.eval('__jewel.app.openPanel("coop");__jewel.app.ui.activate("coop-host")');
 const code=await until(()=>A.eval('__jewel.net().code'));
 B=await launch({port:9681});await boot(B,'#room='+code);
 await until(async()=>await A.eval('__jewel.net().connected')&&await B.eval('__jewel.net().connected&&__jewel.app.coop.synced'),{timeout:60000});
 await A.eval('__jewel.app.closePanel()');await B.eval('__jewel.app.closePanel()');
 await until(async()=>await A.eval('__jewel.net().hash')===await B.eval('__jewel.net().hash'));
 check('isolated private room',await A.eval('!__jewel.net().publicRoom')&&await B.eval('!__jewel.net().publicRoom'));
 for(const p of [A,B])await p.eval('__jewel.app.hintCells=[];__jewel.app.idleSince=__jewel.app.time');
 const hash=await A.eval('__jewel.net().hash');
 await key(A);await sleep(200);
 check('host hint stays local',await A.eval('__jewel.app.hintCells.length===2')&&await B.eval('__jewel.app.hintCells.length===0'));
 await A.eval('__jewel.app.hintCells=[];__jewel.app.idleSince=__jewel.app.time');
 await key(B);await sleep(200);
 check('peer hint stays local',await B.eval('__jewel.app.hintCells.length===2')&&await A.eval('__jewel.app.hintCells.length===0'));
 check('hints preserve synchronized board',hash===await A.eval('__jewel.net().hash')&&hash===await B.eval('__jewel.net().hash'));
 const pair=await B.eval('__jewel.app.hintCells.map(i=>__jewel.project(i))');
 for(const [x,y]of pair){await B.mouse('mousePressed',x,y);await B.mouse('mouseReleased',x,y);}
 await until(async()=>await A.eval('__jewel.state().moves===1&&__jewel.state().phase==="idle"')&&await B.eval('__jewel.state().moves===1&&__jewel.state().phase==="idle"'),{timeout:20000});
 check('peer hinted swap scores and synchronizes',await A.eval('__jewel.state().score>0')&&await A.eval('__jewel.net().hash')===await B.eval('__jewel.net().hash'));
 check('peer swap clears both hints',await A.eval('__jewel.app.hintCells.length===0')&&await B.eval('__jewel.app.hintCells.length===0'));
 check('host and peer runtime clean',await A.eval('__jewel.diagnostics().errors.length===0')&&await B.eval('__jewel.diagnostics().errors.length===0'));
}finally{A?.kill();B?.kill();mkdirSync('tools/out/hints',{recursive:true});writeFileSync('tools/out/hints/coop-results.json',JSON.stringify(results,null,2));}
console.log(JSON.stringify({passed:results.filter(x=>x.pass).length,total:results.length}));
if(results.some(x=>!x.pass))process.exitCode=1;
