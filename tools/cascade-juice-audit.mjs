// Muted real-renderer gate: normal legal cascade, comfort presets, bounded long-chain FX.
// CDP input only; isolated solo profiles, no desktop focus or OS input.
import {launch,until} from './cdp.mjs';
import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {mkdirSync,writeFileSync} from 'node:fs';
const target=process.argv[2]||'index.html',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href;
const out='tools/out/cascade-juice';mkdirSync(out,{recursive:true});const checks=[],runs=[];
const ok=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${name}`)};
let p;
try{for(const [gl,width,height]of [[false,1280,800],[true,1280,800],[false,390,844],[true,390,844]]){
 const tag=`${gl?'WebGL':'WebGPU'}-${width}`;
 p=await launch({port:9880+runs.length,width,height,mobile:width===390});
 await p.goto(base+(gl?'?webgl':'')+'#solo=1');await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});
 ok(tag+' expected backend',await p.eval(`__jewel.diagnostics().backend.includes('${gl?'WebGL':'WebGPU'}')`));
 await p.eval(`(()=>{window.__clock=10000;performance.now=()=>__clock;__jewel.advance(0);const a=__jewel.app;a.time=0;a.fx.last=__clock;a.audio.muted=true;__jewel.challenge('zen',{seed:43});window.__chain=[];const f=a.fx,original=f.match;f.match=function(...args){const before=a.world.sparks.emitted;original.apply(this,args);__chain.push({cascade:args[2],score:a.board.score,bursts:f.stats.cascadeBursts||0,emitted:a.world.sparks.emitted-before,time:a.time});};})()`);
 const step=n=>p.eval(`(()=>{for(let f=0;f<${n};f++){__clock+=1000/60;__jewel.advance(1/60)}})()`);
 await step(120);
 ok(tag+' normal board has legal nine-wave move',await p.eval('__jewel.state().legalMoves.some(m=>m[0]===11&&m[1]===19)'));
 for(const cell of [11,19]){const[x,y]=await p.eval(`__jewel.project(${cell})`);await p.mouse('mousePressed',x,y);await p.mouse('mouseReleased',x,y);}
 await step(540);
 const chain=await p.eval('__chain'),state=await p.eval('__jewel.state()');
 ok(tag+' actual input produces all nine cascades',chain.length===9&&chain.every((e,i)=>e.cascade===i+1),chain);
 ok(tag+' x2 and x3 each earn a burst',chain[0]?.bursts===0&&chain[1]?.bursts===1&&chain[2]?.bursts===2);
 ok(tag+' settled legal board after one move',state.phase==='idle'&&state.moves===1&&state.legalMoves.length>0&&state.cells.filter(Boolean).length===64);
 if(runs.length)ok(tag+' same score and cells on both renderers/viewports',JSON.stringify({score:state.score,cells:state.cells})===JSON.stringify(runs[0].result));
 await p.shot(`${out}/${tag}-settled.png`);
 for(const [name,prefs]of [['particles off',{particles:false}],['motion off',{motion:false}],['flashes off',{flash:'off'}],['combo treatment off',{comboTreatment:false}],['zero juice',{juice:0}],['low flashes',{flash:'low'}],['full',{flash:'full'}]]){
  const r=await p.eval(`(()=>{const a=__jewel.app,f=a.fx,s=a.world.sparks,old={...a.prefs};Object.assign(a.prefs,{particles:true,motion:true,flash:'full',comboTreatment:true,juice:100},${JSON.stringify(prefs)});__clock+=1000;const before=s.emitted,stats=f.stats.cascadeBursts||0,snapshot=JSON.stringify({board:a.board.cells,score:a.board.score,moves:a.board.moves,phase:a.phase,deadline:a.deadline,hitstop:a.hitstop,slowUntil:a.slowUntil,punch:a.punch,save:{...localStorage},net:__jewel.net().hash});const flash=f.flashEvent();f.cascadeBurst([0,0,.24],[.1,1,.5],3,a.time,flash);const emit=s.emitted-before,burst=(f.stats.cascadeBursts||0)-stats;const unchanged=snapshot===JSON.stringify({board:a.board.cells,score:a.board.score,moves:a.board.moves,phase:a.phase,deadline:a.deadline,hitstop:a.hitstop,slowUntil:a.slowUntil,punch:a.punch,save:{...localStorage},net:__jewel.net().hash});a.draw();Object.assign(a.prefs,old);return {emit,burst,unchanged}})()`);
  ok(tag+' '+name+' preserves gameplay, clock, saves and network state',r.unchanged);
  ok(tag+' '+name+' obeys effect setting',name==='full'||name==='low flashes'?r.emit>0&&r.burst===1:r.emit===0&&r.burst===0,r);
 }
 const budget=await p.eval(`(()=>{const a=__jewel.app,f=a.fx,s=a.world.sparks,old={...a.prefs};Object.assign(a.prefs,{particles:true,motion:true,flash:'full',comboTreatment:true,juice:150});const rows=[];for(const cascade of [2,3,5,9,100,1000]){__clock+=1000;const before=s.emitted;f.cascadeBurst([0,0,.24],[1,.3,.1],cascade,a.time,true);rows.push({cascade,emitted:s.emitted-before})}const before=s.emitted;f.cascadeBurst([0,0,.24],[1,.3,.1],1000,a.time,true);const sameEvent=s.emitted-before;const finite=Array.from(s.data).every(Number.isFinite);Object.assign(a.prefs,old);return {rows,sameEvent,finite,count:s.count,capacity:s.capacity}})()`);
 ok(tag+' x3 is stronger than x2',budget.rows[1].emitted>budget.rows[0].emitted);
 ok(tag+' long-chain burst caps at x5',budget.rows.slice(2).every(r=>r.emitted===budget.rows[2].emitted)&&budget.rows[2].emitted<=800,budget);
 ok(tag+' same-event duplication suppressed',budget.sameEvent===0);
 ok(tag+' finite particle pool within fixed capacity',budget.finite&&budget.count<=budget.capacity);
 const diagnostic=await p.eval('__jewel.diagnostics()');ok(tag+' no runtime or GPU errors',!diagnostic.errors.length&&!diagnostic.nonfiniteActors.length&&!p.logs.some(x=>x.startsWith('EXCEPTION')),diagnostic);
 runs.push({tag,chain,budget,result:{score:state.score,cells:state.cells},diagnostic});await p.kill();p=null;
}}finally{await p?.kill();writeFileSync(out+'/checks.json',JSON.stringify({at:new Date().toISOString(),checks,runs},null,2));}
console.log(`${checks.filter(c=>c.pass).length} passed, ${checks.filter(c=>!c.pass).length} failed`);if(checks.some(c=>!c.pass))process.exitCode=1;
