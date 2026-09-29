// Private co-op and an isolated instance of the public/spectator/handoff path.
// Never joins the live PUBLIC_ROOM.id. The harness sets a random room first.
import {launch,sleep,until} from './cdp.mjs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
const target=process.argv[2]||'index.html',base=/^https?:/.test(target)?target:pathToFileURL(resolve(target)).href,J='window.__jewel';
const out='tools/out/expedition';mkdirSync(out,{recursive:true});let A,B,pass=0,fail=0;const receipts=[];
const ok=(name,v,detail='')=>{v?pass++:fail++;receipts.push({name,pass:!!v,detail});console.log(`${v?'PASS':'FAIL'} ${name}${detail?'  '+detail:''}`);};
const idle=p=>until(()=>p.eval(`${J}.app.phase==='idle'`),{timeout:25000,every:40,label:'idle'});
const hash=p=>p.eval(`${J}.net().hash`);
const synced=()=>until(async()=>await hash(A)===await hash(B)&&await B.eval(`${J}.app.coop.synced&&${J}.app.phase==='idle'`),{timeout:30000,every:60,label:'matching boards'});
const move=async(p,pair)=>{const n=await p.eval(`${J}.state().moves`);pair=pair||await p.eval(`${J}.state().legalMoves[0]`);await p.eval(`${J}.swap(${pair[0]},${pair[1]})`);await until(()=>p.eval(`${J}.state().moves>${n}`),{timeout:8000,every:40,label:'swap'});await idle(A);await synced();};
try{
 A=await launch({port:9930});B=await launch({port:9931});
 for(const p of [A,B]){await p.goto(base+'#solo=1');await until(()=>p.eval(`!!${J}?.ready`),{timeout:60000,label:'GPU boot'});await idle(p);await p.eval(`${J}.app.audio.start()`);}
 await A.eval(`${J}.app.ui.activate('coop-host')`);const code=await until(()=>A.eval(`${J}.net().code`),{timeout:30000,label:'private code'});await B.eval(`${J}.app.coop.join(${JSON.stringify(code)})`);
 await until(async()=>await A.eval(`${J}.net().connected`)&&await B.eval(`${J}.net().connected&&${J}.app.coop.synced`),{timeout:60000,every:300,label:'private connection'});await synced();
 await A.eval(`${J}.challenge('timed',{seed:1})`);await until(()=>B.eval(`${J}.expedition().run.mode==='timed'`),{label:'timed mode'});await idle(A);await synced();
 await A.eval(`(()=>{const a=${J}.app;a.fx.res={fill:60,mine:30,theirs:30,on:true,until:a.time+8,count:0,team:true};a.coop.fullSync();})()`);await until(()=>B.eval(`!!${J}.app.fx.res?.on`),{label:'resonance checkpoint'});await move(A,[1,2]);
 ok('timed Resonance scores double on host and peer',await A.eval(`${J}.state().score===300`)&&await B.eval(`${J}.state().score===300`));
 await A.eval(`${J}.challenge('moves',{seed:1})`);await idle(A);await synced();
 await move(A,[1,2]);const owner=await A.eval(`${J}.app.coop.selfId`);
 // Give both boards the same previous clear timestamp. The subsequent clear is
 // a real peer swap, so the temporal window and identity run through the protocol.
 for(const p of [A,B])await p.eval(`${J}.app.expedition.lastClear.set(${JSON.stringify(owner)},${J}.app.time);${J}.app.expedition.lastHighFive=-100`);
 await move(B);ok('two-player clear window triggers high five on both',await A.eval(`${J}.expedition().profile.achievements.includes('HIGH_FIVE')`)&&await B.eval(`${J}.expedition().profile.achievements.includes('HIGH_FIVE')`));
 await A.eval(`${J}.challenge('zen',{seed:1})`);await idle(A);await synced();
 for(const p of [A,B])await p.eval(`(()=>{const e=${J}.app.expedition,fn=e.teamFanfare.bind(e);e.teamNotes=0;e.teamFanfare=(res)=>{if(res)e.teamNotes++;return fn(res)};})()`);
 await A.eval(`(()=>{const a=${J}.app;a.fx.res={fill:57,mine:30,theirs:27,on:false,until:0,count:0,team:false};a.coop.fullSync();})()`);await until(()=>B.eval(`${J}.app.fx.res?.fill===57`),{label:'charged team meter'});await move(A,[1,2]);
 ok('team Resonance starts on both screens',await A.eval(`${J}.app.fx.res?.on&&${J}.app.fx.res?.team`)&&await B.eval(`${J}.app.fx.res?.on&&${J}.app.fx.res?.team`));
 ok('team-specific fanfare plays on both',await A.eval(`${J}.app.expedition.teamNotes===1`)&&await B.eval(`${J}.app.expedition.teamNotes===1`));
 // Now exercise the actual public room implementation in a separate random room,
 // with one active seat so browser B is a genuine spectator.
 await B.eval(`${J}.app.coop.leave()`);await A.eval(`${J}.app.coop.leave()`);const room='gems-qa-'+randomUUID();
 for(const p of [A,B])await p.eval(`${J}.app.coop.testPublicRoom=${JSON.stringify(room)};${J}.app.coop.testPublicLimit=1`);
 await A.eval(`${J}.app.coop.joinPublic()`);await until(()=>A.eval(`${J}.app.coop.hosting`),{timeout:30000,label:'isolated public host'});
 await B.eval(`${J}.app.coop.joinPublic()`);await until(()=>B.eval(`${J}.app.coop.synced&&${J}.app.coop.spectator`),{timeout:60000,every:300,label:'spectator admission'});await synced();
 ok('public harness uses random isolated room',await A.eval(`${J}.app.coop.testPublicRoom===${JSON.stringify(room)}`)&&room!=='gemstogether-public-v1');
 ok('real public roster admits one spectator',await A.eval(`${J}.net().players===1&&${J}.net().spectators===1`)&&await B.eval(`${J}.app.coop.spectator`));
 const gems=await B.eval(`${J}.expedition().profile.gems`),fireworks=await B.eval(`${J}.app.fx.stats.fireworks`);
 await A.eval(`${J}.challenge('zen',{seed:43})`);await idle(A);await synced();await move(A,[11,19]);
 ok('spectator receives the full nine-wave spectacle',await B.eval(`${J}.state().maxCascade>=9&&${J}.app.fx.stats.fireworks>${fireworks}`));
 ok('watching does not farm lifetime gems',await B.eval(`${J}.expedition().profile.gems===${gems}`));
 ok('spectator cannot swap',await B.eval(`!${J}.swap(...${J}.state().legalMoves[0])`));
 const before=await hash(A);await B.eval(`${J}.app.expedition.cheer()`);await sleep(400);ok('spectator cheer reaches host without a board change',await A.eval(`${J}.app.expedition.announcement?.label==='A LITTLE CHEER'`)&&before===await hash(A));await B.shot(out+'/spectator.png');
 await A.eval(`${J}.challenge('moves',{seed:1})`);await idle(A);await synced();await move(A,[1,2]);const run=await A.eval(`${J}.expedition().run.id`),saved=await hash(A);
 await A.eval(`${J}.app.coop.leave()`);await until(()=>B.eval(`${J}.app.coop.hosting&&!${J}.app.coop.electing`),{timeout:30000,every:150,label:'public host handoff'});
 ok('host handoff retains board and challenge',await hash(B)===saved&&await B.eval(`${J}.expedition().run.id===${JSON.stringify(run)}&&${J}.expedition().run.mode==='moves'`));
 ok('spectator takes the vacated active seat',await B.eval(`${J}.net().slot===1&&!${J}.app.coop.spectator`));await B.eval(`${J}.swap(...${J}.state().legalMoves[0])`);await idle(B);
 ok('promoted host can keep playing',await B.eval(`${J}.state().moves===2`));
 for(const p of [A,B])ok('no network feature errors',(await p.eval(`${J}.diagnostics()`)).errors.length===0&&!p.logs.some(x=>x.startsWith('EXCEPTION')));
}catch(err){fail++;console.error(err.stack);if(A)console.log('A LOGS',A.logs.slice(-8));if(B)console.log('B LOGS',B.logs.slice(-8));}
finally{A?.kill();B?.kill();writeFileSync(out+'/network-results.json',JSON.stringify({pass,fail,receipts},null,2));console.log(`${pass} passed, ${fail} failed`);process.exitCode=fail?1:0;}
