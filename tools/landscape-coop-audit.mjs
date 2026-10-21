// Isolated private room: normal bottom-row touch input at both compact widths.
import {launch,sleep,until} from './cdp.mjs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {mkdirSync,writeFileSync} from 'node:fs';
const target=process.argv[2]||'index.html',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href,checks=[];let A,B;
const ok=(name,pass)=>{checks.push({name,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
const synced=()=>until(async()=>await A.eval('__jewel.net().hash')===await B.eval('__jewel.net().hash')&&await B.eval('__jewel.app.coop.synced&&__jewel.state().phase==="idle"')&&await A.eval('__jewel.state().phase==="idle"'),{timeout:30000});
try{
 A=await launch({port:9780,width:600,height:320,mobile:true,deviceScaleFactor:2});B=await launch({port:9781,width:568,height:320,mobile:true,deviceScaleFactor:2});
 for(const p of [A,B]){await p.goto(base+'#solo=1');await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});}
 await A.eval('__jewel.app.ui.activate("coop-host")');const code=await until(()=>A.eval('__jewel.net().code'));await B.eval(`__jewel.app.coop.join(${JSON.stringify(code)})`);
 await until(async()=>await A.eval('__jewel.net().connected')&&await B.eval('__jewel.net().connected&&__jewel.app.coop.synced'),{timeout:60000});await synced();
 ok('private room keeps live public players untouched',await A.eval('!__jewel.net().publicRoom')&&await B.eval('!__jewel.net().publicRoom'));
 await A.eval('__jewel.challenge("timed",{seed:43})');await until(()=>B.eval('__jewel.expedition().run.mode==="timed"'));await synced();
 for(const i of [60,61]){const [x,y]=await B.eval(`__jewel.project(${i})`);await B.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await sleep(70);await B.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(150);}
 await until(()=>A.eval('__jewel.state().moves===1'));await synced();
 ok('bottom-row peer touch scores on both boards',await A.eval('__jewel.state().score>0&&__jewel.state().moves===1')&&await B.eval('__jewel.state().moves===1&&!__jewel.app.panelOpen'));
 ok('score and complete board agree',await A.eval('__jewel.state().score')===await B.eval('__jewel.state().score')&&await A.eval('__jewel.net().hash')===await B.eval('__jewel.net().hash'));
 mkdirSync('tools/out/landscape',{recursive:true});await A.shot('tools/out/landscape/private-host-600.png');await B.shot('tools/out/landscape/private-peer-568.png');
 for(const [p,name]of [[A,'host'],[B,'peer']]){
  ok(name+' rendering does not mutate save or send events',await p.eval('(()=>{const a=__jewel.app,key=()=>JSON.stringify([a.coop.snapshot().board,a.expedition.profile,a.coop.revision,a.coop.seq,a.coop.stats.events]),before=key();for(let i=0;i<5;i++)a.ui.drawHUD();return before===key();})()'));
  ok(name+' clean runtime',await p.eval('__jewel.diagnostics().errors.length===0')&&!p.logs.some(l=>l.startsWith('EXCEPTION')));
 }
}finally{A?.kill();B?.kill();mkdirSync('tools/out/landscape',{recursive:true});writeFileSync('tools/out/landscape/coop-checks.json',JSON.stringify(checks,null,2));}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
