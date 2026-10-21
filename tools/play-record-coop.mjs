// Distinct local targets on a shared private board, with real host/peer input.
import {launch,until,sleep} from './cdp.mjs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
const target=process.argv[2]||'index.html',label=process.argv[3]||'local',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href,out='tools/out/play-record';mkdirSync(out,{recursive:true});let A,B,stage='boot';const checks=[],events=[];
const ok=(name,pass)=>{checks.push({name,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
const boot=async(p,hash)=>{await p.call('Page.addScriptToEvaluateOnNewDocument',{source:readFileSync(new URL('./connection-observer.js',import.meta.url),'utf8')});await p.goto(base+hash);await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});};
const press=async(p,key,code=key)=>{await p.call('Input.dispatchKeyEvent',{type:'keyDown',key,code});await p.call('Input.dispatchKeyEvent',{type:'keyUp',key,code});};
const click=async(p,id,mobile=false)=>{await until(()=>p.eval(`__jewel.ui().hits.some(h=>h.id===${JSON.stringify(id)})`),{timeout:3000,label:id+' rendered'});const h=await p.eval(`__jewel.ui().hits.find(h=>h.id===${JSON.stringify(id)})`),x=h.x+h.w/2,y=h.y+h.h/2;if(mobile){await p.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await p.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else{await p.mouse('mousePressed',x,y);await p.mouse('mouseReleased',x,y);}};
try{
 A=await launch({port:9891,width:1280,height:800});B=await launch({port:9892,width:390,height:844,mobile:true});await boot(A,'#solo=1');await click(A,'coop-open');await click(A,'coop-host');const code=await until(()=>A.eval('__jewel.net().code'));await boot(B,'#room='+code);
 stage='initial private connection';await until(async()=>await A.eval('__jewel.net().connected')&&await B.eval('__jewel.net().connected&&__jewel.app.coop.synced'),{timeout:60000});ok('isolated private room',await A.eval('!__jewel.net().publicRoom')&&await B.eval('!__jewel.net().publicRoom'));
 stage='local menu targets';
 for(const[p,score,name,mobile]of[[A,1800,'host',false],[B,900,'peer',true]]){
  await press(p,'Escape');await until(()=>p.eval('!__jewel.app.panelOpen'));await p.eval(`(()=>{const e=__jewel.app.expedition;e.profile.bests.timed={score:${score},samples:[]};e.profile.bests.moves={score:${score+100},samples:[]};e.profile.daily={day:new Date().toISOString().slice(0,10),score:${score+200},moves:30};})()`);
  await click(p,'play',mobile);await until(()=>p.eval('__jewel.app.panelOpen&&__jewel.app.ui.tab==="play"&&__jewel.ui().hits.some(h=>h.id==="exp-mode-timed")'),{timeout:3000,label:'Play targets rendered'});
  ok(name+' shows its own visible timed best',await p.eval(`__jewel.ui().hits.find(h=>h.id==='exp-mode-timed')?.label==='Two minutes. Your best: '+(${score}).toLocaleString('en-US')`));
  ok(name+' daily target belongs to local profile',await p.eval(`__jewel.app.expedition.playRecord('daily')===${JSON.stringify("Today's best: "+(score+200).toLocaleString('en-US'))}`));
  await p.shot(`${out}/${label}-${name}-private.png`);
 }
 const old=await B.eval('__jewel.expedition().run.id');await click(B,'exp-mode-timed',true);await sleep(150);ok('peer cannot start a challenge from the record choice',await B.eval('__jewel.expedition().run.id')===old&&await B.eval('__jewel.app.panelOpen'));
 await click(A,'exp-mode-timed');await until(()=>B.eval('__jewel.expedition().run.mode==="timed"'));
 ok('host choice starts the shared timed run',await A.eval('__jewel.expedition().run.id')===await B.eval('__jewel.expedition().run.id'));
 ok('shared snapshot keeps different personal targets',await A.eval('__jewel.app.expedition.playRecord("timed")==="Your best: 1,800"')&&await B.eval('__jewel.app.expedition.playRecord("timed")==="Your best: 900"'));
 stage='actual peer touch move';await press(B,'Escape');await until(()=>B.eval('!__jewel.app.panelOpen&&__jewel.state().phase==="idle"'));
 await B.eval('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(true))))');const pair=await B.eval('__jewel.state().legalMoves[0]');
 const inputState=()=>B.eval('({phase:__jewel.state().phase,panel:__jewel.app.panelOpen,focus:__jewel.app.ui.focus,selected:__jewel.app.selected,pending:__jewel.net().pending,moves:__jewel.state().moves})');
 events.push({stage:'before actual touch pair',pair,state:await inputState()});
 for(const [i,cell]of pair.entries()){
  const[x,y]=await B.eval(`__jewel.project(${cell})`);await B.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await B.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const state=await inputState();events.push({stage:'after actual touch '+i,state});if(i===0&&state.selected!==cell)throw Error('First touch did not select the intended gem');
 }
 await until(async()=>await A.eval('__jewel.state().phase==="idle"&&__jewel.state().moves===1')&&await B.eval('__jewel.state().phase==="idle"&&__jewel.state().moves===1'));
 ok('actual peer input scores on both clients',await A.eval('__jewel.state().score>0')&&await A.eval('__jewel.net().hash')===await B.eval('__jewel.net().hash'));
 for(const[p,name]of[[A,'host'],[B,'peer']])ok(name+' runtime clean',await p.eval('__jewel.diagnostics().errors.length===0')&&!p.logs.some(s=>s.startsWith('EXCEPTION')));
}catch(error){
 const snapshot=async p=>{try{return p&&await p.eval('({net:__jewel.net(),phase:__jewel.state().phase,focus:__jewel.app.ui.focus,tab:__jewel.app.ui.tab,hits:__jewel.ui().hits,selected:__jewel.app.selected,keyboardCell:__jewel.app.keyboardCell,panelOpen:__jewel.app.panelOpen,loading:__jewel.app.coop.loading,synced:__jewel.app.coop.synced,probe:__connectionProbe.summary(),events:__connectionProbe.events,errors:__jewel.diagnostics().errors})');}catch(e){return {unavailable:String(e)};}};
 events.push({stage,at:new Date().toISOString(),error:String(error),host:await snapshot(A),peer:await snapshot(B),hostLogs:A?.logs,peerLogs:B?.logs});throw error;
}finally{A?.kill();B?.kill();writeFileSync(`${out}/${label}-private-checks.json`,JSON.stringify(checks,null,2));writeFileSync(`${out}/${label}-private-events.json`,JSON.stringify(events,null,2));}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
