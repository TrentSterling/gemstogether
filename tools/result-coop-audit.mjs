// Finish a real private co-op move with different existing local records.
import {launch,sleep,until} from './cdp.mjs';
import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
const target=process.argv[2]||'index.html',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href;
const checks=[],ok=(name,pass)=>{checks.push({name,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};let A,B;
const idle=p=>until(()=>p.eval('__jewel.state().phase==="idle"'),{timeout:30000});
const sync=()=>until(async()=>await A.eval('__jewel.net().hash')===await B.eval('__jewel.net().hash')&&await B.eval('__jewel.app.coop.synced'),{timeout:30000});
try{
 A=await launch({port:9720});B=await launch({port:9721});
 for(const p of [A,B]){await p.goto(base+'#solo=1');await until(()=>p.eval('window.__jewel?.ready'),{timeout:60000});await idle(p);}
 await A.eval('__jewel.app.ui.activate("coop-host")');const code=await until(()=>A.eval('__jewel.net().code'));
 await B.eval(`__jewel.app.coop.join(${JSON.stringify(code)})`);
 await until(async()=>await A.eval('__jewel.net().connected')&&await B.eval('__jewel.net().connected&&__jewel.app.coop.synced'),{timeout:60000});await sync();
 ok('isolated private room',await A.eval('!__jewel.net().publicRoom')&&await B.eval('!__jewel.net().publicRoom'));
 await A.eval('__jewel.challenge("moves",{seed:1})');await idle(A);await sync();
 await A.eval('__jewel.app.expedition.profile.bests.moves={score:1,samples:[]};__jewel.app.expedition.save();__jewel.app.board.moves=29;__jewel.app.coop.fullSync()');
 await until(()=>B.eval('__jewel.state().moves===29'));
 await B.eval('__jewel.app.expedition.profile.bests.moves={score:999999,samples:[]};__jewel.app.expedition.save()');
 // Real pointer input completes the host turn. No forced finish or fake packets.
 for(const [x,y]of await A.eval('[1,2].map(i=>__jewel.project(i))')){await A.mouse('mousePressed',x,y);await A.mouse('mouseReleased',x,y);}
 await until(async()=>await A.eval('__jewel.expedition().run.finished')&&await B.eval('__jewel.expedition().run.finished'),{timeout:30000});await idle(A);await sync();
 const score=await A.eval('__jewel.state().score');
 ok('real shared final move scores',score>1&&await A.eval('__jewel.state().moves===30')&&await B.eval(`__jewel.state().score===${score}&&__jewel.state().moves===30`));
 ok('host gets its own new record',await A.eval('__jewel.app.expedition.resultComparison().title==="NEW PERSONAL BEST"'));
 ok('peer sees its own target gap',await B.eval(`__jewel.app.expedition.resultComparison().title===${JSON.stringify((999999-score).toLocaleString()+' TO YOUR BEST')}`));
 ok('separate saved records preserved',await A.eval(`JSON.parse(localStorage.getItem('gemstogether-expedition-v1')).bests.moves.score===${score}`)&&await B.eval("JSON.parse(localStorage.getItem('gemstogether-expedition-v1')).bests.moves.score===999999"));
 ok('comparison absent from shared snapshot',await A.eval('!JSON.stringify(__jewel.app.coop.snapshot()).includes("resultRecord")&&!JSON.stringify(__jewel.app.coop.snapshot()).includes("previous")'));
 const host=await A.eval('JSON.stringify(__jewel.app.expedition.resultComparison())'),peer=await B.eval('JSON.stringify(__jewel.app.expedition.resultComparison())');
 await A.eval('__jewel.app.coop.fullSync()');await sleep(1200);
 ok('repeated completed checkpoint keeps both comparisons',host===await A.eval('JSON.stringify(__jewel.app.expedition.resultComparison())')&&peer===await B.eval('JSON.stringify(__jewel.app.expedition.resultComparison())'));
 mkdirSync('tools/out/results',{recursive:true});await A.shot('tools/out/results/coop-host.png');await B.shot('tools/out/results/coop-peer.png');
 ok('both runtimes clean',await A.eval('__jewel.diagnostics().errors.length===0')&&await B.eval('__jewel.diagnostics().errors.length===0')&&![...A.logs,...B.logs].some(x=>x.startsWith('EXCEPTION')));
}finally{A?.kill();B?.kill();mkdirSync('tools/out/results',{recursive:true});writeFileSync('tools/out/results/coop-checks.json',JSON.stringify(checks,null,2));}
console.log(JSON.stringify({passed:checks.filter(x=>x.pass).length,total:checks.length}));if(checks.some(x=>!x.pass))process.exitCode=1;
