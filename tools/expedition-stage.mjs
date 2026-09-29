// Verify that stage travel keeps light continuous and accepts a real move mid-fade.
import {launch,until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
const J='window.__jewel',out='tools/out/expedition';mkdirSync(out,{recursive:true});
let pass=0,fail=0;const receipts=[];const ok=(name,value)=>{value?pass++:fail++;receipts.push({name,pass:!!value});console.log(`${value?'PASS':'FAIL'} ${name}`);};
for(const gl of [false,true]){let page;const label=gl?'WebGL':'WebGPU';try{
 page=await launch({port:9980+(gl?1:0)});await page.goto(pathToFileURL(resolve('index.html')).href+(gl?'?webgl':'')+'#solo=1');await until(()=>page.eval(`!!${J}?.ready`),{timeout:45000});await until(()=>page.eval(`${J}.app.phase==='idle'`),{timeout:20000});
 await page.eval(`(()=>{const t=performance.now();window.__stageClock=0;performance.now=()=>t+window.__stageClock;${J}.advance(0);${J}.app.expedition.dismissTour();})()`);
 const step=seconds=>page.eval(`(()=>{for(let n=0;n<${Math.round(seconds*60)};n++){window.__stageClock+=1000/60;${J}.advance(1/60);}})()`);
 await page.shot(out+'/stage-'+label+'-before.png');
 await page.eval(`${J}.app.board.score=5010;${J}.app.displayScore=5010`);await step(1/60);
 ok(label+' incoming light starts softly',await page.eval(`${J}.app.fx.fieldBlend.progress<.001&&${J}.app.fx.outgoingField.mesh.count===7000&&${J}.app.fx.field.data[11]<.01`));
 ok(label+' sky keeps its previous colour on entry',await page.eval(`${J}.app.fx.stTint[0]>127`));
 await step(1.5);await page.shot(out+'/stage-'+label+'-middle.png');
 ok(label+' old and new props overlap in transition',await page.eval(`${J}.expedition().props===8&&${J}.app.fx.fieldBlend.progress>.4&&${J}.app.fx.fieldBlend.progress<.6`));
 const before=await page.eval(`${J}.state().moves`);await page.eval(`(()=>{const m=${J}.state().legalMoves[0];${J}.swap(m[0],m[1]);})()`);await step(5);
 ok(label+' a real swap completes during travel',await page.eval(`${J}.state().moves===${before+1}&&${J}.app.phase==='idle'`));
 ok(label+' old field retires after fade',await page.eval(`!${J}.app.fx.fieldBlend&&${J}.app.fx.outgoingField.mesh.count===0&&${J}.expedition().props===4`));await page.shot(out+'/stage-'+label+'-after.png');
 await page.eval(`${J}.app.prefs.motion=false;${J}.app.board.score=15010`);await step(4);
 ok(label+' reduced motion still completes a smooth fade',await page.eval(`!${J}.app.fx.fieldBlend&&${J}.app.fx.fieldForm===2`));
 await page.eval(`${J}.app.prefs.motion=true;${J}.app.board.score=50010`);await step(4);
 ok(label+' Starfall sends real shooting stars on the beat',await page.eval(`${J}.app.fx.fieldForm===4&&${J}.app.fx.shootingBeat>0&&${J}.app.world.sparks.count>0`));await page.shot(out+'/starfall-'+label+'.png');
 ok(label+' stage travel has no GPU or script errors',await page.eval(`${J}.diagnostics().errors.length===0`)&&!page.logs.some(x=>x.startsWith('EXCEPTION')));
}catch(error){fail++;console.error(error.stack);}finally{page?.kill();}}
writeFileSync(out+'/stage-results.json',JSON.stringify({pass,fail,receipts},null,2));console.log(`${pass} passed, ${fail} failed`);process.exitCode=fail?1:0;
