// Real audio-clock travel, stage phases and private co-op with different local clocks.
import {launch,until,sleep} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
const J='window.__jewel',base=pathToFileURL(resolve('index.html')).href,out='tools/out/journey';
mkdirSync(out,{recursive:true});let pass=0,fail=0;const receipts=[];
const ok=(name,value,detail)=>{value?pass++:fail++;receipts.push({name,pass:!!value,detail});console.log(`${value?'PASS':'FAIL'} ${name}${detail?' / '+JSON.stringify(detail):''}`);};
const idle=p=>until(()=>p.eval(`${J}.app.phase==='idle'`),{timeout:30000,every:80,label:'idle'});
const boot=async(p,gl=false)=>{await p.goto(base+(gl?'?webgl=1':'')+'#solo=1');await until(()=>p.eval(`!!${J}?.ready`),{timeout:60000,label:'GPU boot'});await idle(p);};
const room=p=>until(()=>p.eval(`(()=>{const a=${J}.app,t=a.music.nextDownbeat();return t!==null&&t-a.audio.ctx.currentTime>.8;})()`),{timeout:6000,every:60,label:'bar headroom'});
const phase=async(p,n)=>{await until(()=>p.eval(`${J}.app.fx.visualPhase===${n}&&${J}.app.music.phase===${n}`),{timeout:6000,every:60,label:'phase '+n});await sleep(450);};
for(const gl of [false,true]){let p;const tag=gl?'WebGL':'WebGPU';try{
 p=await launch({port:9990+(gl?1:0)});await boot(p,gl);await p.eval(`${J}.challenge('zen',{seed:1})`);await idle(p);
 await p.eval(`(async()=>{const a=${J}.app;a.expedition.dismissTour();await a.audio.start();a.announcer.stop();a.prefs.announcer=false;window.__bars=[];const play=a.music.play.bind(a.music);a.music.play=(i,t,...args)=>{if(i%16===0)window.__bars.push({i,t,prog:a.music.prog,phase:a.music.phase});return play(i,t,...args);};})()`);await room(p);
 await p.eval(`${J}.app.board.score=5010;${J}.app.displayScore=5010`);await until(()=>p.eval(`!!${J}.app.fx.stageTravel`),{timeout:1500,every:40,label:'queued travel'});
 const target=await p.eval(`${J}.app.fx.stageTravel.at`);
 ok(tag+' score stage advances while scenery waits',await p.eval(`${J}.app.fx.stage===1&&${J}.app.fx.visualStage===0&&${J}.app.fx.fieldForm===0&&${J}.app.fx.resCap()===72`));
 const before=await p.eval(`${J}.state().moves`);await p.eval(`${J}.swap(1,2)`);await until(()=>p.eval(`${J}.state().moves===${before+1}`),{label:'accepted real swap'});
 ok(tag+' accepts a real swap before travel',await p.eval(`${J}.app.audio.ctx.currentTime<${target}&&${J}.state().moves===${before+1}`));
 await until(()=>p.eval(`${J}.app.fx.visualStage===1`),{timeout:5000,every:40,label:'downbeat entry'});
 const entrance=await p.eval(`${J}.fx().entrance`);ok(tag+' scenery starts on the selected downbeat',Math.abs(entrance.actual-target)<.12,entrance);
 const bar=await p.eval(`window.__bars.find(b=>Math.abs(b.t-${target})<.005)`);ok(tag+' chord progression enters on the same bar',bar?.prog===1&&bar.phase===0,bar);
 await idle(p);ok(tag+' travel preserves the accepted board turn',await p.eval(`${J}.state().moves===${before+1}&&${J}.state().score>5010&&${J}.state().cells.length===64`));
 await until(()=>p.eval(`!${J}.app.fx.fieldBlend`),{timeout:6000,every:80});await p.shot(out+'/'+tag+'-phase-1.png');
 ok(tag+' first phase keeps four stage props',await p.eval(`${J}.app.fx.visualPhase===0&&${J}.expedition().props===4`));
 await p.eval(`${J}.app.board.score=8350;${J}.app.displayScore=8350`);await phase(p,1);
 ok(tag+' second phase adds scenery and sustained bass',await p.eval(`${J}.expedition().props===6&&${J}.app.music.targets({flow:0,cascade:0,laser:0,phase:1})[1]>=.65&&${J}.app.music.lv[1]>.6`));await p.shot(out+'/'+tag+'-phase-2.png');
 await p.eval(`${J}.app.board.score=11700;${J}.app.displayScore=11700`);await phase(p,2);
 ok(tag+' third phase adds scenery and sustained arpeggios',await p.eval(`${J}.expedition().props===8&&${J}.app.music.targets({flow:0,cascade:0,laser:0,phase:2})[2]>=.65&&${J}.app.music.lv[2]>.6`));await p.shot(out+'/'+tag+'-phase-3.png');
 ok(tag+' tempo stays at eighty-eight',await p.eval(`${J}.app.music.bpm===88`));
 await p.eval(`${J}.app.audio.setMute(true);${J}.app.board.score=15010`);await until(()=>p.eval(`${J}.app.fx.fieldForm===2`),{timeout:1500,every:40});
 ok(tag+' muted travel starts without waiting for inaudible music',await p.eval(`${J}.app.fx.visualStage===2&&${J}.app.fx.stageTravel===null`));
 await p.eval(`${J}.app.audio.setMute(false)`);await room(p);await p.eval(`${J}.app.board.score=30010`);await until(()=>p.eval(`!!${J}.app.fx.stageTravel`),{timeout:1500,every:40});
 await p.eval(`${J}.challenge('zen',{stage:0,seed:1})`);await idle(p);const stages=await p.eval(`${J}.fx().stages`);await sleep(3100);
 ok(tag+' a new board cancels queued travel',await p.eval(`${J}.app.fx.stage===0&&${J}.app.fx.visualStage===0&&${J}.app.fx.stageTravel===null&&${J}.fx().stages===${stages}`));
 ok(tag+' no GPU or runtime errors',await p.eval(`${J}.diagnostics().errors.length===0`)&&!p.logs.some(x=>x.startsWith('EXCEPTION')));
}catch(error){fail++;console.error(error.stack);if(p)console.log(await p.eval(`JSON.stringify({fx:${J}.fx(),music:{step:${J}.app.music.step,next:${J}.app.music.next,phase:${J}.app.music.phase,lv:${J}.app.music.lv},props:${J}.expedition().props})`));}finally{p?.kill();}}
let A,B;try{
 A=await launch({port:9992});B=await launch({port:9993});await boot(A);await boot(B);
 await A.eval(`${J}.app.ui.activate('coop-host')`);const code=await until(()=>A.eval(`${J}.net().code`));await B.eval(`${J}.app.coop.join(${JSON.stringify(code)})`);await until(async()=>await A.eval(`${J}.net().connected`)&&await B.eval(`${J}.app.coop.synced`),{timeout:60000,label:'private sync'});
 await A.eval(`${J}.challenge('zen',{seed:1})`);await idle(A);await until(()=>B.eval(`${J}.app.phase==='idle'&&${J}.state().moves===0`));
 await A.eval(`${J}.app.audio.start()`);await room(A);await A.eval(`${J}.app.board.score=5010;${J}.app.coop.fullSync()`);
 await until(async()=>await A.eval(`!!${J}.app.fx.stageTravel`)&&await B.eval(`${J}.app.fx.visualStage===1`),{timeout:1500,every:40,label:'different local travel'});
 ok('co-op scenery uses each player audio clock',await A.eval(`${J}.app.fx.visualStage===0`)&&await B.eval(`${J}.app.fx.visualStage===1&&!${J}.app.audio.started`));
 ok('co-op Resonance capacity follows the shared score immediately',await A.eval(`${J}.app.fx.resCap()===72`)&&await B.eval(`${J}.app.fx.resCap()===72`));
 await A.eval(`${J}.app.fx.res={fill:69,mine:36,theirs:33,on:false,count:0,until:0};${J}.app.coop.fullSync()`);await until(()=>B.eval(`${J}.app.fx.res?.fill===69`));await A.eval(`${J}.swap(1,2)`);await idle(A);await idle(B);
 ok('real co-op clear starts matching team Resonance through travel',await A.eval(`${J}.app.fx.res?.on&&${J}.app.fx.res.team`)&&await B.eval(`${J}.app.fx.res?.on&&${J}.app.fx.res.team`));
 ok('different local travel clocks preserve board hashes',await A.eval(`${J}.net().hash`)===await B.eval(`${J}.net().hash`));
 for(const p of [A,B])ok('private journey has no runtime errors',await p.eval(`${J}.diagnostics().errors.length===0`)&&!p.logs.some(x=>x.startsWith('EXCEPTION')));
}catch(error){fail++;console.error(error.stack);for(const p of [A,B])if(p)try{console.error(await p.eval(`JSON.stringify(${J}.net())`));}catch{}}finally{A?.kill();B?.kill();}
writeFileSync(out+'/results.json',JSON.stringify({pass,fail,receipts},null,2));console.log(`${pass} passed, ${fail} failed`);process.exitCode=fail?1:0;
