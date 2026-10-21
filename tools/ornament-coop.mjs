// Isolated private room. Threshold fixture totals precede real shared clears.
import {launch,until,sleep} from './cdp.mjs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {mkdirSync,writeFileSync} from 'node:fs';
const target=process.argv[2]||'index.html',label=process.argv[3]||'local',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href,out='tools/out/ornament';mkdirSync(out,{recursive:true});let A,B;const checks=[],states=[];
const ok=(name,pass)=>{checks.push({name,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
const press=async(p,key)=>{await p.call('Input.dispatchKeyEvent',{type:'keyDown',key,code:key===' '?'Space':key});await p.call('Input.dispatchKeyEvent',{type:'keyUp',key,code:key===' '?'Space':key});};
const snap=p=>p.eval('({phase:__jewel.state().phase,moves:__jewel.state().moves,selected:__jewel.app.selected,keyboardCell:__jewel.app.keyboardCell,focus:__jewel.app.ui.focus,panel:__jewel.app.panelOpen,pending:__jewel.app.coop.pending,gameOver:__jewel.app.gameOver,runStartKeys:[...(__jewel.app.runStartKeys||[])],mode:__jewel.expedition().run.mode,hash:__jewel.net().hash,errors:__jewel.diagnostics().errors})');
const boot=async(p,hash)=>{await p.goto(base+hash);await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});};
try{
 A=await launch({port:9893,width:1280,height:800});B=await launch({port:9894,width:390,height:844});await boot(A,'#solo=1');await A.eval('__jewel.app.openPanel("coop");__jewel.app.ui.activate("coop-host")');const code=await until(()=>A.eval('__jewel.net().code'));await boot(B,'#room='+code);
 await until(async()=>await A.eval('__jewel.net().connected')&&await B.eval('__jewel.net().connected&&__jewel.app.coop.synced'),{timeout:60000});
 ok('isolated private room',await A.eval('!__jewel.net().publicRoom')&&await B.eval('!__jewel.net().publicRoom'));
 for(const p of[A,B])await p.eval('(()=>{const a=__jewel.app,t=a.toast;window.__rewards=[];a.toast=function(...x){if(x[1]==="ornament")__rewards.push(x[0]);return t.apply(this,x);};a.closePanel();})()');
 await A.eval('__jewel.challenge("zen",{seed:1})');await until(()=>B.eval('__jewel.expedition().run.mode==="zen"&&__jewel.state().phase==="idle"'));await until(()=>A.eval('__jewel.state().phase==="idle"'));
 for(const [round,player,hostTotal,peerTotal,hostTier,peerTier]of [[1,A,99,499,1,2],[2,B,1499,4999,3,4]]){
  await A.eval(`__jewel.app.expedition.profile.gems=${hostTotal}`);await B.eval(`__jewel.app.expedition.profile.gems=${peerTotal}`);
  // Return from the existing utility focus to board control using the real key.
  await press(player,'Escape');ok(round+' Escape returns board focus',await player.eval('__jewel.app.ui.focus===null&&!__jewel.app.panelOpen'));
  const pair=await player.eval('__jewel.state().legalMoves[0]');await player.eval(`__jewel.app.keyboardCell=${pair[0]}`);states.push({round,stage:'before-select',pair,state:await snap(player)});await press(player,' ');states.push({round,stage:'after-select',state:await snap(player)});if(await player.eval('__jewel.app.selected')!==pair[0])throw Error('Board selection failed');await press(player,({1:'ArrowRight','-1':'ArrowLeft',8:'ArrowDown','-8':'ArrowUp'})[pair[1]-pair[0]]);states.push({round,stage:'after-arrow',state:await snap(player)});if(await player.eval('__jewel.app.keyboardCell')!==pair[1])throw Error('Board direction failed');await press(player,' ');states.push({round,stage:'after-swap',state:await snap(player)});
  await until(async()=>await A.eval(`__jewel.state().phase==="idle"&&__jewel.state().moves===${round}`)&&await B.eval(`__jewel.state().phase==="idle"&&__jewel.state().moves===${round}`),{timeout:30000,label:'shared clear settled'});
  ok(round+' shared clear agrees',await A.eval('__jewel.net().hash')===await B.eval('__jewel.net().hash'));
  await until(async()=>await A.eval(`__rewards.length===${round}`)&&await B.eval(`__rewards.length===${round}`),{timeout:25000,label:'local reward notices'});
  for(const[p,name,tier]of[[A,'host',hostTier],[B,'peer',peerTier]]){
   ok(round+' '+name+' earns own local tier',await p.eval(`__rewards.at(-1)==="Ornament ${tier} of 6 earned! Find it in Journey."`));
   ok(round+' '+name+' transient notice absent from shared summary and save',await p.eval('!JSON.stringify([__jewel.app.expedition.summary(),__jewel.app.coop.snapshot(),localStorage.getItem("gemstogether-expedition-v1")]).includes("ornamentNotice")'));
   states.push({at:new Date().toISOString(),round,name,state:await p.eval('({gems:__jewel.expedition().profile.gems,moves:__jewel.state().moves,hash:__jewel.net().hash,rewards:__rewards})')});
  }
 }
 await B.eval('for(let k=0;k<5;k++)__jewel.app.expedition.restore(__jewel.app.expedition.summary())');await sleep(600);
 ok('summary heartbeats do not duplicate rewards',await A.eval('__rewards.length===2')&&await B.eval('__rewards.length===2'));
 for(const[p,name]of[[A,'host'],[B,'peer']])ok(name+' clean runtime',await p.eval('__jewel.diagnostics().errors.length===0'));
}catch(error){states.push({stage:'failure',error:String(error),host:A&&await snap(A),peer:B&&await snap(B)});throw error;}finally{A?.kill();B?.kill();writeFileSync(`${out}/${label}-private-checks.json`,JSON.stringify({checks,states},null,2));}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
