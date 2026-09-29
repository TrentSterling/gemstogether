// Browser release gate for progression, modes, photos and private co-op.
import {launch,sleep,until} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
const target=process.argv[2]||'index.html',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href;
const J='window.__jewel',out='tools/out/expedition';mkdirSync(out,{recursive:true});
let A,B,pass=0,fail=0;const receipts=[];
const ok=(name,value,detail='')=>{value?pass++:fail++;receipts.push({name,pass:!!value,detail});console.log(`${value?'PASS':'FAIL'} ${name}${detail?'  '+detail:''}`);};
async function boot(page,hash='#solo=1'){
 await page.goto(base+hash);await sleep(250);
 try{await until(()=>page.eval(`!!(${J}?.ready)`),{timeout:25000,label:'GPU boot'});}
 catch(err){console.log('BOOT LOGS',page.logs);console.log('BOOT FAILURE',await page.eval(`document.getElementById('failure-detail')?.textContent+' / '+document.getElementById('load-status')?.textContent`));throw err;}
 await idle(page);return page;
}
const idle=page=>until(()=>page.eval(`${J}.app.phase==='idle'`),{timeout:25000,every:80,label:'settled board'});
const state=page=>page.eval(`${J}.expedition()`);
const start=async(page,mode,options={})=>{await page.eval(`${J}.resume();${J}.challenge(${JSON.stringify(mode)},${JSON.stringify(options)})`);await idle(page);};
const move=async(page,pair)=>{const before=await page.eval(`${J}.state().moves`);if(!pair)pair=await page.eval(`${J}.state().legalMoves[0]`);await page.eval(`${J}.swap(${pair[0]},${pair[1]})`);await until(()=>page.eval(`${J}.state().moves>${before}`),{timeout:8000,every:60,label:'accepted swap'});await idle(page);await sleep(150);};
const click=async(page,i)=>{const q=await page.eval(`${J}.project(${i})`);await page.mouse('mouseMoved',q[0],q[1],'none',0);await page.mouse('mousePressed',q[0],q[1]);await page.mouse('mouseReleased',q[0],q[1]);};
try{
 A=await launch({port:9906});await A.browser('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:resolve(out)});await boot(A);
 ok('clean GPU boot',(await A.eval(`${J}.diagnostics()`)).errors.length===0);
 ok('stage props use real meshes',(await state(A)).props===4);
 ok('first-run tap hint visible',(await state(A)).tutorial);
 await A.shot(out+'/first-run.png');
 let pair=await A.eval(`${J}.state().legalMoves[0]`);await click(A,pair[0]);await sleep(80);await click(A,pair[1]);await idle(A);await sleep(200);
 let e=await state(A);ok('real tap-tap swap scores',await A.eval(`${J}.state().score>0`));ok('tap usage measured',e.profile.input.tap===1);ok('clears grow lifetime treasury',e.profile.gems>=3);ok('hint dismisses after gesture',!e.tutorial);
 await start(A,'zen',{seed:1});await A.eval(`${J}.app.ui.activate('exp-pref-tapOnly')`);pair=await A.eval(`${J}.state().legalMoves[0]`);const qa=await A.eval(`${J}.project(${pair[0]})`),qb=await A.eval(`${J}.project(${pair[1]})`);
 await A.mouse('mousePressed',qa[0],qa[1]);for(let i=1;i<=8;i++)await A.mouse('mouseMoved',qa[0]+(qb[0]-qa[0])*i/8,qa[1]+(qb[1]-qa[1])*i/8);await A.mouse('mouseReleased',qb[0],qb[1]);await sleep(400);
 ok('tap-only setting blocks drag swaps',await A.eval(`${J}.state().moves===0`));await click(A,pair[1]);await idle(A);ok('tap-only still permits neighbour tap',await A.eval(`${J}.state().moves===1`));await A.eval(`${J}.app.ui.activate('exp-pref-tapOnly')`);
 await A.eval(`${J}.app.board.score=75010;${J}.app.displayScore=75010`);await sleep(400);e=await state(A);ok('visiting a stage unlocks its skin',e.profile.visited.includes(5));
 const gems=e.profile.gems;await boot(A);e=await state(A);ok('progression survives reload',e.profile.gems===gems&&e.profile.visited.includes(5));
 await start(A,'zen',{stage:5,seed:1});ok('unlocked starting stage preserves score zero',await A.eval(`${J}.app.fx.stageInfo().name==='PRISM HEART'&&${J}.state().score===0`));
 await A.eval(`${J}.app.expedition.profile.gems=51000;${J}.app.expedition.save()`);await sleep(150);ok('all six ornaments render',(await state(A)).ornaments===6);await A.shot(out+'/prism-treasury.png');
 await start(A,'moves',{seed:1});await A.eval(`${J}.app.board.moves=29`);await move(A);e=await state(A);ok('30-move budget ends after cascade',e.run.finished&&e.run.moves===30);ok('finished run blocks swaps',await A.eval(`!${J}.swap(...${J}.state().legalMoves[0])`));await A.shot(out+'/moves-complete.png');
 await start(A,'timed',{seed:1});await A.eval(`(()=>{const a=${J}.app;a.fx.res={fill:60,mine:60,theirs:0,on:true,until:a.time+8,count:0,team:false};})()`);await move(A,[1,2]);ok('timed Resonance doubles authoritative points',await A.eval(`${J}.app.clearResult.points===300&&${J}.state().score===300`));
 await A.eval(`${J}.app.expedition.run.elapsed=119.95;${J}.advance(.2)`);e=await state(A);ok('two-minute timer ends the run',e.run.finished&&e.run.reason==='TIME COMPLETE');ok('timed score and ghost saved',e.profile.bests.timed?.score===300&&e.profile.bests.timed.samples.length>0);
 await start(A,'timed',{seed:1});await A.eval(`${J}.app.expedition.run.elapsed=120`);ok('best-run ghost returns score',(await state(A)).ghostScore===300);await A.eval(`${J}.resume()`);
 const puzzlePairs=[[1,2],[28,36],[53,61],[11,19]];
 for(let i=0;i<4;i++){await start(A,'puzzle',{puzzle:i});await move(A,puzzlePairs[i]);e=await state(A);ok('puzzle '+(i+1)+' solves through real swap',e.run.finished&&e.run.reason==='PUZZLE COMPLETE');}
 ok('puzzle completion persists',(await state(A)).profile.puzzles.length===4);
 await start(A,'zen',{seed:43});await move(A,[11,19]);e=await state(A);ok('nine-wave chain produces named highlight',e.highlights.some(h=>h.chain>=9&&h.name==='CONSTELLATION'));ok('original combo ladder stays callable after mode changes',await A.eval(`typeof ${J}.app.ui.callout==='function'&&${J}.app.fx.stats.climaxes>0`));ok('chain achievements earned',e.profile.achievements.includes('CHAIN_9'));
 await A.eval(`(()=>{const e=${J}.app.expedition;e.addHighlight({name:'SUPERNOVA',resonance:true,gems:100,chain:0});for(let i=0;i<12;i++)e.addHighlight({name:'CASCADE',chain:1,gems:3,points:150});})()`);ok('highlight reel retains biggest Resonance beside best chain',(await state(A)).highlights.some(h=>h.name==='SUPERNOVA'));
 await A.eval(`${J}.app.openPanel('journey')`);await sleep(200);await A.shot(out+'/journey.png');await A.eval(`${J}.app.ui.activate('exp-tab-moments')`);await sleep(200);await A.shot(out+'/moments.png');await A.eval(`${J}.app.closePanel()`);
 await start(A,'daily');const dailyHash=await A.eval(`${J}.net().hash`);B=await launch({port:9907});await boot(B);await start(B,'daily');ok('daily board uses identical seed across profiles',(await B.eval(`${J}.net().hash`))===dailyHash);
 await A.eval(`${J}.app.board.moves=29`);await move(A);e=await state(A);ok('daily score saved with UTC date',e.run.finished&&e.profile.daily.day===e.run.day&&e.profile.daily.score>0);
 await A.eval(`${J}.app.expedition.calm()`);ok('Jennifer preset keeps endless and comfort',await A.eval(`${J}.expedition().run.mode==='zen'&&${J}.app.prefs.flash==='low'&&${J}.app.prefs.juice===80&&!${J}.app.prefs.muted`));
 await A.eval(`${J}.app.ui.activate('exp-pref-highContrast');${J}.app.ui.activate('exp-pref-largeCursor')`);await idle(A);await sleep(200);await A.shot(out+'/accessibility.png');ok('contrast and cursor settings persist',await A.eval(`JSON.parse(localStorage.getItem('gemstogether-settings-v1')).highContrast&&${J}.app.prefs.largeCursor`));
 await A.eval(`${J}.app.expedition.enterPhoto();${J}.app.ui.activate('exp-photo-right')`);await sleep(200);await A.shot(out+'/photo-mode.png');await A.eval(`${J}.app.ui.activate('exp-photo-save')`);await until(()=>A.eval(`!!${J}.app.expedition.lastPhoto`),{timeout:10000,label:'PNG capture'});const photo=await A.eval(`${J}.app.expedition.lastPhoto`);ok('photo exports a real PNG',photo.size>10000&&photo.width>0);await A.eval(`${J}.app.closePanel()`);
 ok('no errors across solo features',(await A.eval(`${J}.diagnostics()`)).errors.length===0&&!A.logs.some(x=>x.startsWith('EXCEPTION')));
 await start(A,'zen',{seed:1});await A.eval(`${J}.app.openPanel('coop');${J}.app.ui.activate('coop-host')`);const code=await until(()=>A.eval(`${J}.net().code`),{timeout:30000,label:'private room code'});await boot(B,'#room='+code);
 await until(async()=>await A.eval(`${J}.net().connected`)&&await B.eval(`${J}.net().connected&&${J}.app.coop.synced`),{timeout:60000,every:300,label:'private co-op'});await A.eval(`${J}.app.closePanel()`);await B.eval(`${J}.app.closePanel()`);
 ok('both tests remain outside public room',await A.eval(`!${J}.net().publicRoom`)&&await B.eval(`!${J}.net().publicRoom`));
 await start(A,'moves',{seed:1});await until(()=>B.eval(`${J}.expedition().run.mode==='moves'`),{label:'shared mode'});ok('host mode arrives at peer',(await state(B)).run.mode==='moves');ok('peer cannot replace shared challenge',await B.eval(`!${J}.challenge('timed')`));
 await idle(B);await move(A,[1,2]);await idle(B);await move(B);await until(async()=>(await A.eval(`${J}.net().hash`))===(await B.eval(`${J}.net().hash`)),{label:'shared hash'});
 ok('host and peer swaps retain board hash',await A.eval(`${J}.state().moves===2`)&&await B.eval(`${J}.state().moves===2`));
 const ea=await state(A),eb=await state(B);ok('lifetime clears recorded on both players',ea.profile.gems>0&&eb.profile.gems>0);ok('co-op contribution owner mirrors',await A.eval(`${J}.app.turnOwner==='partner'`)&&await B.eval(`${J}.app.turnOwner==='me'`));
 await A.eval(`${J}.app.prefs.juice=100;${J}.app.savePreferences()`);await B.eval(`${J}.app.expedition.calm()`);await sleep(600);ok('peer comfort stays local across host heartbeats',await B.eval(`${J}.app.prefs.juice===80&&${J}.app.prefs.flash==='low'`)&&await A.eval(`${J}.app.prefs.juice===100`));
 await A.eval(`${J}.app.board.moves=29`);await move(A);await until(()=>B.eval(`${J}.expedition().run.finished`),{label:'shared run end'});ok('co-op budget ends on both screens',(await state(A)).run.moves===30&&(await state(B)).run.moves===30);
 await start(A,'daily');await until(()=>B.eval(`${J}.expedition().run.mode==='daily'`),{label:'shared daily'});await idle(B);ok('co-op daily seed and budget match',await A.eval(`${J}.net().hash`)==await B.eval(`${J}.net().hash`)&&(await state(B)).run.limit===30);
 await A.eval(`${J}.app.expedition.shareDaily()`);await until(()=>B.eval(`${J}.expedition().dailyFriends.length>0`),{label:'friend daily result'});ok('daily result shared with connected friend',(await state(B)).dailyFriends[0].score>0);
 const hash=await A.eval(`${J}.net().hash`);await B.eval(`${J}.cheer()`);await sleep(350);ok('cheer reaches partner without changing board',await A.eval(`${J}.app.expedition.announcement?.label==='A LITTLE CHEER'&&${J}.net().hash===${JSON.stringify(hash)}`));
 await B.eval(`${J}.app.expedition.enterPhoto()`);const timeBefore=await B.eval(`${J}.app.time`);await move(A);await until(async()=>(await A.eval(`${J}.net().hash`))===(await B.eval(`${J}.net().hash`)),{label:'photo co-op sync'});ok('photo view keeps receiving shared board',await B.eval(`${J}.app.time>${timeBefore}&&${J}.expedition().photo`));await B.eval(`${J}.app.closePanel()`);
 for(const page of [A,B])ok('no co-op errors',(await page.eval(`${J}.diagnostics()`)).errors.length===0&&!page.logs.some(x=>x.startsWith('EXCEPTION')));
}catch(err){fail++;console.error(err.stack);if(A){console.log('A LOGS',A.logs.slice(-8));try{await A.shot(out+'/failure.png');}catch{}}if(B)console.log('B LOGS',B.logs.slice(-8));}
finally{A?.kill();B?.kill();writeFileSync(out+'/results.json',JSON.stringify({pass,fail,receipts},null,2));console.log(`${pass} passed, ${fail} failed`);process.exitCode=fail?1:0;}
