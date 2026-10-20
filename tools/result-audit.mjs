// Result comparisons use existing local saves; they must never enter shared snapshots.
// node tools/result-audit.mjs [file|url] [label=after]
// Optional RESULT_SNAPSHOT points to a self-play receipt for matched captures.
import {launch,until} from './cdp.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';
const target=process.argv[2]||'index.html',label=process.argv[3]||'after',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href;
const snapshot=process.env.RESULT_SNAPSHOT?JSON.parse(readFileSync(process.env.RESULT_SNAPSHOT,'utf8')):null;
const out='tools/out/results';mkdirSync(out,{recursive:true});const checks=[];
let view;const ok=(name,pass,detail)=>{checks.push({view,name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${view} ${name}`);};
for(const [n,v]of [{name:'desktop',width:1280,height:900},{name:'phone',width:390,height:844,mobile:true,deviceScaleFactor:2},{name:'webgl',width:1280,height:900,webgl:true},...[[844,390],[667,375],[640,360],[568,320]].map(([width,height])=>({name:'landscape-'+height,width,height,mobile:true,deviceScaleFactor:2,webgl:true}))].entries()){
 view=v.name;const p=await launch({port:9710+n,...v});
 try{
  await p.goto(base+(v.webgl?'?webgl':'')+'#solo=1');await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});
  await p.eval(`(()=>{const ui=__jewel.app.ui,draw=ui.drawGameOver;ui.drawGameOver=function(){const text=this.text;window.__resultText=[];this.text=function(...args){window.__resultText.push(args);return text.apply(this,args);};try{return draw.call(this);}finally{this.text=text;}};})()`);
  if(snapshot){await p.eval(`(()=>{const a=__jewel.app,e=a.expedition;e.profile=${JSON.stringify(snapshot.expedition.profile)};delete e.profile.bests.moves;e.committed=null;a.coop.restore(${JSON.stringify(snapshot.snapshot)},true);a.ui.mouse.inside=false;__jewel.advance(0);})()`);}
  else{await p.eval('__jewel.challenge("moves",{seed:1});__jewel.advance(2);__jewel.app.board.moves=29;__jewel.swap(1,2);__jewel.advance(4)');}
  await p.shot(`${out}/${label}-${view}.png`);
  ok('completed result renders',await p.eval('__jewel.expedition().run.finished'));
  if(label==='before')continue;
  ok('first record visible',await p.eval('window.__resultText.some(t=>t[0]==="FIRST SCORE SAVED")'));
  ok('buttons inside viewport',await p.eval('__jewel.ui().hits.filter(h=>["again","exp-endless"].includes(h.id)).length===2&&__jewel.ui().hits.filter(h=>["again","exp-endless"].includes(h.id)).every(h=>h.y>=0&&h.y+h.h<=innerHeight&&h.h>=38)'));
  ok('record text above buttons',await p.eval('(()=>{const texts=window.__resultText,button=__jewel.ui().hits.find(h=>h.id==="again"),title=texts.find(t=>t[0]==="FIRST SCORE SAVED"),detail=texts.find(t=>/^30-move best:/.test(t[0]));return title&&detail&&title[2]>0&&title[2]+title[3]<detail[2]&&detail[2]+detail[3]<button.y;})()'));
  ok('score, summary and highlight do not overlap badge',await p.eval('(()=>{const texts=window.__resultText,title=texts.find(t=>t[0]==="FIRST SCORE SAVED"),top=texts.filter(t=>/moves \\/|CASCADE|^[0-9,]+$/.test(t[0]));return top.length>=2&&top.every(t=>t[2]+t[3]<title[2]-6)&&top.every((t,i)=>!i||top[i-1][2]+top[i-1][3]<t[2]);})()'));
  await p.eval('__jewel.app.prefs.motion=false;__jewel.app.prefs.flash="off";__jewel.advance(.2)');
  ok('reduced motion retains record',await p.eval('window.__resultText.some(t=>t[0]==="FIRST SCORE SAVED")'));
  // The actual existing replay control must retain the mode and clear the local comparison.
  const b=await p.eval('__jewel.ui().hits.find(h=>h.id==="again")');
  if(v.mobile){await p.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.w/2,y:b.y+b.h/2}]});await p.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await p.mouse('mousePressed',b.x+b.w/2,b.y+b.h/2);await p.mouse('mouseReleased',b.x+b.w/2,b.y+b.h/2);}
  await p.eval('__jewel.advance(2)');ok('real replay preserves mode and resets comparison',await p.eval('__jewel.expedition().run.mode==="moves"&&!__jewel.expedition().run.finished&&__jewel.app.expedition.resultComparison()===null&&__jewel.state().moves===0'));
  if(n===0){
   const cases=[['moves',null,300,'FIRST SCORE SAVED'],['moves',100,300,'NEW PERSONAL BEST'],['moves',300,300,'PERSONAL BEST TIED'],['moves',500,300,'200 TO YOUR BEST'],['timed',0,300,'NEW PERSONAL BEST'],['timed',500,300,'200 TO YOUR BEST'],['daily',null,300,'FIRST DAILY SCORE'],['daily',100,300,'NEW DAILY BEST'],['daily',300,300,'DAILY BEST TIED'],['daily',500,300,'200 TO DAILY BEST']];
   for(const [mode,previous,score,title]of cases){
    const got=await p.eval(`(()=>{const a=__jewel.app,e=a.expedition;e.start(${JSON.stringify(mode)},{seed:1});__jewel.advance(2);e.profile.bests[${JSON.stringify(mode)}]=${JSON.stringify(previous===null?undefined:{score:previous,samples:[[0,0],[120,previous]]})};if(${JSON.stringify(mode)}==='daily')e.profile.daily=${previous===null?'null':`{day:e.run.day,score:${previous},moves:30}`};a.board.score=${score};e.finish('RUN COMPLETE');__jewel.advance(0);return {comparison:e.resultComparison(),saved:JSON.parse(localStorage.getItem('gemstogether-expedition-v1')),snapshot:e.summary()};})()`);
    ok(`${mode} prior ${previous}: correct comparison`,got.comparison.title===title,got.comparison);
    ok(`${mode} prior ${previous}: saved best preserved`,got.saved.bests[mode].score===Math.max(score,previous??0));
    ok(`${mode} result stays outside run snapshot`,!Object.hasOwn(got.snapshot,'resultRecord')&&!Object.hasOwn(got.snapshot,'comparison'));
    const stable=await p.eval('(()=>{const e=__jewel.app.expedition,b=JSON.stringify(e.resultComparison()),s=JSON.stringify(e.profile);e.commitResult();e.restore(e.summary());return b===JSON.stringify(e.resultComparison())&&s===JSON.stringify(e.profile);})()');ok('duplicate completion/restore is stable',stable);
   }
   await p.eval('(()=>{const a=__jewel.app,e=a.expedition;e.start("daily");__jewel.advance(2);e.profile.daily={day:"2000-01-01",score:999999,moves:30};a.board.score=300;e.finish("DAILY COMPLETE");__jewel.advance(0);})()');
   ok('daily ignores a different day',await p.eval('__jewel.app.expedition.resultComparison().title==="FIRST DAILY SCORE"&&__jewel.expedition().profile.daily.score===300'));
   await p.eval('(()=>{const e=__jewel.app.expedition;e.run.day="2000-01-01";})()');
   ok('old daily run does not claim today',await p.eval('!JSON.stringify(__jewel.app.expedition.resultComparison()).toLowerCase().includes("today")'));
   // spectator is a getter; override only this isolated test instance, then restore it.
   await p.eval('Object.defineProperty(__jewel.app.coop,"spectator",{configurable:true,get:()=>true});__jewel.advance(0)');ok('spectator has no personal comparison',await p.eval('__jewel.app.expedition.resultComparison()===null'));await p.eval('delete __jewel.app.coop.spectator');
   await p.eval('__jewel.challenge("puzzle",{puzzle:0});__jewel.advance(2);__jewel.swap(1,2);__jewel.advance(4)');ok('puzzle keeps its existing result without record badge',await p.eval('__jewel.expedition().run.reason==="PUZZLE COMPLETE"&&__jewel.app.expedition.resultComparison()===null&&__jewel.ui().hits.some(h=>h.id==="exp-next-puzzle")'));
  }
  ok('runtime clean',await p.eval('__jewel.diagnostics().errors.length===0&&__jewel.diagnostics().nonfiniteActors.length===0'));
  ok('requested backend',await p.eval(`__jewel.diagnostics().backend===${JSON.stringify(v.webgl?'WebGL 2':'WebGPU')}`));
 }finally{p.kill();}
}
writeFileSync(`${out}/${label}-checks.json`,JSON.stringify(checks,null,2));console.log(JSON.stringify({passed:checks.filter(x=>x.pass).length,total:checks.length}));if(checks.some(x=>!x.pass))process.exitCode=1;
