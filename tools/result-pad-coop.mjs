// A result controller must obey the existing host-only challenge control.
import {launch,until,sleep} from './cdp.mjs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {mkdirSync,writeFileSync} from 'node:fs';
const base=pathToFileURL(resolve('index.html')).href,out='tools/out/result-pad';mkdirSync(out,{recursive:true});let A,B;const checks=[];const ok=(name,pass)=>{checks.push({name,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
const boot=async(p,hash)=>{await p.goto(base+hash);await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});};
const press=async(p,b)=>{await p.eval(`__pad.buttons[${b}].pressed=true`);await sleep(120);await p.eval(`__pad.buttons[${b}].pressed=false`);await sleep(120);};
try{
 A=await launch({port:9861,width:1280,height:800});B=await launch({port:9862,width:568,height:320});await boot(A,'#solo=1');await A.eval('__jewel.app.openPanel("coop");__jewel.app.ui.activate("coop-host")');const code=await until(()=>A.eval('__jewel.net().code'),{timeout:30000});await boot(B,'#room='+code);
 await until(async()=>await A.eval('__jewel.net().connected')&&await B.eval('__jewel.net().connected&&__jewel.app.coop.synced'),{timeout:60000});
 for(const p of [A,B])await p.eval(`(()=>{__jewel.app.closePanel();window.__pad={id:'Private result standard controller',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[__pad]});__jewel.app.lastInputDevice='pad';})()`);
 ok('private room isolated',await A.eval('!__jewel.net().publicRoom')&&await B.eval('!__jewel.net().publicRoom'));
 await A.eval('__jewel.challenge("puzzle",{puzzle:0})');await until(()=>A.eval('__jewel.state().phase==="idle"'));await until(()=>B.eval('__jewel.expedition().run.mode==="puzzle"'));await A.eval('__jewel.swap(1,2)');
 await until(async()=>await A.eval('__jewel.expedition().run.finished')&&await B.eval('__jewel.expedition().run.finished'));await sleep(300);
 ok('both clients focus primary result action',await A.eval('__jewel.app.ui.focus==="exp-next-puzzle"')&&await B.eval('__jewel.app.ui.focus==="exp-next-puzzle"'));
 const id=await A.eval('__jewel.expedition().run.id');await press(B,0);
 ok('peer cannot start a shared challenge',await A.eval(`__jewel.expedition().run.id==='${id}'&&__jewel.expedition().run.finished`)&&await B.eval(`__jewel.expedition().run.id==='${id}'&&__jewel.expedition().run.finished`));
 await press(B,13);ok('peer can locally select second action',await B.eval('__jewel.app.ui.focus==="exp-endless"'));await sleep(2200);ok('heartbeat preserves peer focus',await B.eval('__jewel.app.ui.focus==="exp-endless"'));await press(B,0);ok('peer cannot reset to endless',await A.eval('__jewel.expedition().run.mode==="puzzle"'));
 await A.shot(out+'/private-host.png');await B.shot(out+'/private-peer.png');await press(A,0);
 await until(async()=>await A.eval('__jewel.expedition().run.puzzle===1&&!__jewel.expedition().run.finished')&&await B.eval('__jewel.expedition().run.puzzle===1&&!__jewel.expedition().run.finished'));await until(()=>A.eval('__jewel.state().phase==="idle"'));await sleep(500);
 ok('host advances both clients to next puzzle',await A.eval('__jewel.net().hash')===await B.eval('__jewel.net().hash'));
 ok('result A release leaves board unselected and unplayed',await A.eval('__jewel.app.selected===-1&&__jewel.state().moves===0')&&await B.eval('__jewel.state().moves===0'));
 // Real peer mouse input is still accepted on the new shared board.
 for(const cell of [28,36]){const [x,y]=await B.eval(`__jewel.project(${cell})`);await B.mouse('mousePressed',x,y);await B.mouse('mouseReleased',x,y);await sleep(150);}
 await until(async()=>await A.eval('__jewel.expedition().run.finished')&&await B.eval('__jewel.expedition().run.finished'),{timeout:40000});ok('peer gameplay still solves new puzzle',await A.eval('__jewel.state().moves===1&&__jewel.expedition().run.reason==="PUZZLE COMPLETE"')&&await A.eval('__jewel.net().hash')===await B.eval('__jewel.net().hash'));
 for(const p of [A,B])ok('runtime clean',await p.eval('__jewel.diagnostics().errors.length===0'));
}finally{A?.kill();B?.kill();writeFileSync(out+'/private-checks.json',JSON.stringify(checks,null,2));}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
