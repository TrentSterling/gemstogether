// Isolated private host/peer, with actual keyboard moves and blocked peer start.
import {launch,until,sleep} from './cdp.mjs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {mkdirSync,writeFileSync} from 'node:fs';
const target=process.argv[2]||'index.html',label=process.argv[3]||'local',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href,out='tools/out/result-keyboard';mkdirSync(out,{recursive:true});let A,B;const checks=[],transitions=[];
const ok=(name,pass)=>{checks.push({name,pass:!!pass});console.log(`${pass?'PASS':'FAIL'} ${name}`);};
const press=async(p,key)=>{await p.call('Input.dispatchKeyEvent',{type:'keyDown',key,code:key===' '?'Space':key});await p.call('Input.dispatchKeyEvent',{type:'keyUp',key,code:key===' '?'Space':key});};
const boot=async(p,hash)=>{await p.goto(base+hash);await until(()=>p.eval('window.__jewel?.ready&&__jewel.state().phase==="idle"'),{timeout:60000});};
try{
 A=await launch({port:9891,width:1280,height:800});B=await launch({port:9892,width:390,height:844});await boot(A,'#solo=1');await A.eval('__jewel.app.openPanel("coop");__jewel.app.ui.activate("coop-host")');const code=await until(()=>A.eval('__jewel.net().code'));await boot(B,'#room='+code);
 await until(async()=>await A.eval('__jewel.net().connected')&&await B.eval('__jewel.net().connected&&__jewel.app.coop.synced'),{timeout:60000});
 ok('isolated private room',await A.eval('!__jewel.net().publicRoom')&&await B.eval('!__jewel.net().publicRoom'));
 for(const p of[A,B])await p.eval('__jewel.app.closePanel()');
 await A.eval('__jewel.challenge("puzzle",{puzzle:0})');await until(()=>B.eval('__jewel.expedition().run.mode==="puzzle"&&__jewel.state().phase==="idle"'));
 await A.eval('__jewel.app.keyboardCell=1');await press(A,' ');await press(A,'ArrowRight');await press(A,' ');await until(async()=>await A.eval('__jewel.expedition().run.finished')&&await B.eval('__jewel.expedition().run.finished'));await sleep(200);
 for(const[p,name]of[[A,'host'],[B,'peer']]){await press(p,'Tab');ok(name+' first Tab targets Next puzzle',await p.eval('__jewel.app.ui.focus==="exp-next-puzzle"'));}
 const old=await B.eval('__jewel.expedition().run.id'),hash=await B.eval('__jewel.net().hash');await press(B,'Enter');ok('peer cannot advance shared puzzle',await B.eval('__jewel.expedition().run.id')===old&&await B.eval('__jewel.net().hash')===hash);
 ok('rejected peer retains result focus',await B.eval('__jewel.app.ui.focus==="exp-next-puzzle"'));
 await press(B,'Tab');await press(B,' ');ok('peer cannot return room to endless',await B.eval('__jewel.expedition().run.id')===old&&await B.eval('__jewel.app.ui.focus==="exp-endless"'));
 await A.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter'});await until(()=>B.eval('__jewel.expedition().run.puzzle===1&&!__jewel.expedition().run.finished'));await until(()=>A.eval('__jewel.state().phase==="idle"'));await A.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',autoRepeat:true});
 ok('host held replay does not select new-board gem',await A.eval('__jewel.app.selected===-1&&__jewel.app.ui.focus===null'));await A.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter'});
 ok('both clients share next-puzzle board',await A.eval('__jewel.net().hash')===await B.eval('__jewel.net().hash'));
 const snapshot=()=>B.eval('({phase:__jewel.state().phase,gameOver:!!__jewel.app.gameOver,focus:__jewel.app.ui.focus,hits:__jewel.ui().hits.map(h=>h.id),runStartKeys:[...(__jewel.app.runStartKeys||[])],selected:__jewel.app.selected,keyboardCell:__jewel.app.keyboardCell,puzzle:__jewel.expedition().run.puzzle})');
 transitions.push({stage:'shared replay received',state:await snapshot()});
 await until(()=>B.eval('__jewel.state().phase==="idle"'),{label:'peer replay idle'});
 await B.eval('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))');
 await until(()=>B.eval('__jewel.state().phase==="idle"&&!__jewel.app.gameOver&&!__jewel.ui().hits.some(h=>["again","exp-next-puzzle","exp-endless"].includes(h.id))'),{label:'peer new-board input ready'});
 transitions.push({stage:'peer rendered next board',state:await snapshot()});
 await B.eval('__jewel.app.keyboardCell=28');transitions.push({stage:'before peer select',state:await snapshot()});await press(B,' ');
 transitions.push({stage:'before peer arrow',state:await snapshot()});if(transitions.at(-1).state.selected!==28)throw Error('Rendered idle peer failed to select gem');await press(B,'ArrowDown');
 transitions.push({stage:'before peer swap',state:await snapshot()});if(transitions.at(-1).state.keyboardCell!==36)throw Error('Peer arrow did not reach target');await press(B,' ');
 transitions.push({stage:'after peer swap',state:await snapshot()});await until(async()=>await A.eval('__jewel.expedition().run.finished')&&await B.eval('__jewel.expedition().run.finished'),{label:'peer move finishes shared puzzle'});await sleep(200);
 ok('peer keyboard play completes next shared puzzle',await A.eval('__jewel.state().moves===1')&&await A.eval('__jewel.net().hash')===await B.eval('__jewel.net().hash'));
 await press(B,'Tab');ok('new result bypasses stale prior-result focus',await B.eval('__jewel.app.ui.focus==="exp-next-puzzle"'));
 for(const[p,name]of[[A,'host'],[B,'peer']])ok(name+' runtime clean',await p.eval('__jewel.diagnostics().errors.length===0'));
}finally{A?.kill();B?.kill();writeFileSync(`${out}/${label}-private-checks.json`,JSON.stringify(checks,null,2));writeFileSync(`${out}/${label}-private-transitions.json`,JSON.stringify(transitions,null,2));}
console.log(JSON.stringify({passed:checks.filter(c=>c.pass).length,total:checks.length}));if(checks.some(c=>!c.pass))process.exitCode=1;
