// Isolated real Gamepad API signals across the existing game modes.
import {launch,until} from './cdp.mjs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {mkdirSync,writeFileSync} from 'node:fs';
const out='tools/out/controller-guide',checks=[];mkdirSync(out,{recursive:true});const ok=(name,pass)=>{checks.push({name,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
const p=await launch({port:9842,width:568,height:320});
const button=async(i,down)=>p.eval(`__pad.buttons[${i}].pressed=${down};__step(.05)`);
try{
 await p.goto(pathToFileURL(resolve('index.html')).href+'?webgl#solo=1');await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});
 await p.eval(`(()=>{let clock=performance.now();performance.now=()=>clock;window.__step=s=>{clock+=s*1000;__jewel.advance(s);};window.__pad={id:'Unknown standard pad',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[__pad]});__step(0);})()`);
 for(const mode of ['zen','moves','timed','daily','puzzle']){
  await p.eval(`__jewel.challenge('${mode}',{seed:1,puzzle:0});__step(2);__jewel.app.toast(controllerGuideText(__pad.id),'controller');__step(.3)`);
  ok(mode+' complete generic guidance',await p.eval('__jewel.app.ui.toastMessage==="A select / Hold A + direction to swap / X hint / Y point"'));
  const pair=await p.eval('__jewel.state().legalMoves[0]');await p.eval(`__jewel.app.keyboardCell=${pair[0]}`);
  await button(0,true);await button(0,false);ok(mode+' tap A selects',await p.eval(`__jewel.app.selected===${pair[0]}&&__jewel.state().moves===0`));await button(1,true);await button(1,false);
  ok(mode+' B clears selection',await p.eval('__jewel.app.selected===-1'));
  const dir=pair[1]-pair[0],index=dir===1?15:dir===-1?14:dir===8?13:12;
  await button(0,true);await button(index,true);await button(index,false);await button(0,false);await p.eval('__step(5)');
  ok(mode+' hold A and direction swaps exactly once',await p.eval('__jewel.state().moves===1&&__jewel.state().score>0&&__jewel.app.selected===-1'));
  await p.shot(`${out}/input-${mode}.png`);
 }
 await p.eval('__jewel.challenge("zen",{seed:1});__step(2);__pad.connected=false;__step(0);__pad.connected=true;__pad.buttons[0].pressed=true;__step(0)');
 ok('held A at reconnect cannot immediately swap',await p.eval('__jewel.state().moves===0'));
 await button(0,false); // Existing release-to-select behavior remains unchanged.
 await p.eval('__pad.id="DualShock 4";__step(0);__step(.3)');ok('device replacement announces PlayStation names',await p.eval('__jewel.app.ui.toastMessage.includes("Cross select")'));
 await p.eval('__jewel.app.openPanel("settings");__step(7);__jewel.app.closePanel();__step(0)');ok('guide expires while panel is open',await p.eval('__jewel.app.ui.toastUntil<performance.now()'));
 const saved=await p.eval('localStorage.getItem("gemstogether-expedition-v1")');
 await p.eval('__jewel.app.toast(controllerGuideText(__pad.id),"controller");__step(.3)');
 ok('connection notice preserves persisted profile',await p.eval('localStorage.getItem("gemstogether-expedition-v1")')===saved);
 ok('clean WebGL runtime',await p.eval('__jewel.diagnostics().backend==="WebGL 2"&&__jewel.diagnostics().errors.length===0'));
}finally{p.kill();writeFileSync(out+'/input-checks.json',JSON.stringify(checks,null,2));}
console.log(JSON.stringify({total:checks.length,passed:checks.filter(c=>c.pass).length}));if(checks.some(c=>!c.pass))process.exitCode=1;
