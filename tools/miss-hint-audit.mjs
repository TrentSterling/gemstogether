import {launch,until} from './cdp.mjs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {mkdirSync,writeFileSync} from 'node:fs';
const target=process.argv[2]||'index.html',label=process.argv[3]||'after',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href,out='tools/out/miss-hint';mkdirSync(out,{recursive:true});
const checks=[],events=[];let p;const ok=(name,pass)=>{checks.push({name,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
const invalid=`(()=>{const b=__jewel.app.board;for(let i=0;i<64;i++)for(const j of[i+1,i+8])if(j<64&&b.adjacent(i,j)&&!b.validSwap(i,j))return [i,j];})()`;
const tap=async(x,y,mobile)=>{if(mobile){await p.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await p.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await p.mouse('mousePressed',x,y);await p.mouse('mouseReleased',x,y);}};
const input=async(pair,mobile)=>{for(const i of pair)await tap(...await p.eval(`__jewel.project(${i})`),mobile);};
try{
 for(const[n,[w,h,gl]]of [[390,844,true],[1280,800,false],[320,480,true]].entries()){
  const mobile=w<900;p=await launch({port:9834+n,width:w,height:h,mobile});await p.goto(base+(gl?'?webgl':'')+'#solo=1');await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});
  await p.eval('(()=>{let clock=performance.now();performance.now=()=>clock;window.__step=s=>{clock+=s*1000;__jewel.advance(s);};__jewel.challenge("zen",{seed:1});__step(2);})()');
  for(let n=0;n<3;n++){await input(await p.eval('__jewel.state().legalMoves[0]'),mobile);await p.eval('__step(4)');}
  ok(w+' real normal swaps score and save',await p.eval('__jewel.state().score===450&&__jewel.state().moves===3&&__jewel.app.expedition.profile.gems===9'));
  const before=await p.eval('JSON.stringify({profile:{...__jewel.app.expedition.profile,input:undefined},score:__jewel.state().score,moves:__jewel.state().moves,board:__jewel.app.board.cells})');
  for(let n=0;n<3;n++){
   await input(await p.eval(invalid),mobile);ok(w+' no hint during reject '+n,await p.eval('__jewel.app.hintCells.length===0'));await p.eval('__step(2)');
   ok(w+' hint threshold '+n,await p.eval(`__jewel.app.hintCells.length===${n===2?2:0}`));
  }
  ok(w+' hints preserve score moves saves and cells',before===await p.eval('JSON.stringify({profile:{...__jewel.app.expedition.profile,input:undefined},score:__jewel.state().score,moves:__jewel.state().moves,board:__jewel.app.board.cells})'));
  ok(w+' actionable accessible hint',await p.eval('(()=>{const a=__jewel.app;return a.hintCells.length===2&&a.board.validSwap(...a.hintCells)&&document.getElementById("accessibility-status").textContent==="Try swapping the highlighted pair.";})()'));
  await p.eval('__step(0)');await p.shot(out+'/'+label+'-'+w+'-third-reject.png');events.push({at:new Date().toISOString(),viewport:[w,h],state:await p.eval('__jewel.state()'),diagnostics:await p.eval('__jewel.diagnostics()')});
  await input(await p.eval('__jewel.app.hintCells'),mobile);await p.eval('__step(4)');ok(w+' follow displayed hint through actual input',await p.eval('__jewel.state().moves===4&&__jewel.state().score>450&&!__jewel.app.missHint'));
  // Genuine failed swaps in every mode must retain each mode's existing budget.
  for(const mode of ['moves','zen','timed','daily','puzzle']){
   await p.eval(`__jewel.challenge('${mode}',{seed:1});__step(2)`);const moves=await p.eval('__jewel.state().moves');
   for(let n=0;n<3;n++)await p.eval(`__jewel.swap(...${invalid});__step(.7)`);
   ok(w+' '+mode+' hint and move budget',await p.eval(`__jewel.app.hintCells.length===2&&__jewel.state().moves===${moves}`));
  }
  // A valid move, a manual hint and a new board each break an incomplete streak.
  for(const reset of ['valid','manual','new-board']){
   await p.eval(`__jewel.challenge('zen',{seed:1});__step(2);for(let n=0;n<2;n++){__jewel.swap(...${invalid});__step(.7);}`);
   if(reset==='valid')await p.eval('__jewel.swap(...__jewel.state().legalMoves[0]);__step(4)');
   if(reset==='manual')await p.eval('__jewel.app.hint();__jewel.app.hintCells=[]');
   if(reset==='new-board')await p.eval('__jewel.challenge("zen",{seed:1});__step(2)');
   await p.eval(`__jewel.swap(...${invalid});__step(.7)`);ok(w+' '+reset+' clears streak',await p.eval('__jewel.app.hintCells.length===0&&__jewel.app.missHint?.count===1'));
  }
  ok(w+' runtime clean',await p.eval('__jewel.diagnostics().errors.length===0'));
  p.kill();p=null;
 }
}finally{p?.kill();writeFileSync(out+'/'+label+'-checks.json',JSON.stringify(checks,null,2));writeFileSync(out+'/'+label+'-events.json',JSON.stringify(events,null,2));}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
