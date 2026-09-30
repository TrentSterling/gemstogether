// Real WebAudio, GPU UI, model hooks and private co-op. Never joins the live room.
import {launch,sleep,until} from './cdp.mjs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='tools/out/announcer',base=pathToFileURL(resolve('index.html')).href,J='window.__jewel';
mkdirSync(out,{recursive:true});let A,B,pass=0,fail=0;const receipts=[];
const ok=(name,value,detail)=>{value?pass++:fail++;receipts.push({name,pass:!!value,detail});console.log(`${value?'PASS':'FAIL'} ${name}${detail?' / '+JSON.stringify(detail):''}`);};
const idle=p=>until(()=>p.eval(`${J}.app.phase==='idle'`),{timeout:30000,every:60,label:'idle'});
const boot=async(p,query='')=>{await p.goto(base+query+'#solo=1');await until(()=>p.eval(`!!${J}?.ready`),{timeout:60000,label:'boot'});await idle(p);};
const ready=p=>p.eval(`(()=>{const n=${J}.app.announcer;n.stop();n.last=-100;n.recent.clear();})()`);
const spoken=(p,key)=>until(()=>p.eval(`${J}.announcer().history.some(x=>x.key===${JSON.stringify(key)})`),{timeout:18000,every:100,label:key+' actual playback'});
try{
 A=await launch({port:9973});await boot(A);
 ok('voice waits for interaction',await A.eval(`${J}.announcer().stats.played===0&&!${J}.app.audio.started`));
 await A.eval(`${J}.app.audio.start()`);await spoken(A,'welcome');
 ok('first visit welcomes the player',true);
 const decoded=await A.eval(`(async()=>{const a=${J}.app,n=a.announcer,rows=[];for(const [profile,p]of Object.entries(ANNOUNCER_PACK.profiles))for(const [key,c]of Object.entries(p.clips)){const b=await n.decode(profile,key),x=b.getChannelData(0);let energy=0,peak=0;for(const v of x){energy+=v*v;peak=Math.max(peak,Math.abs(v));}rows.push({profile,key,duration:b.duration,expected:c.duration,rms:Math.sqrt(energy/x.length),peak});}return rows;})()`);
 for(const clip of decoded)ok(clip.profile+'/'+clip.key+' embedded MP3 decodes',Math.abs(clip.duration-clip.expected)<.15&&clip.rms>.025&&clip.peak<.98);
 ok('all six lowered profiles contain nineteen lines',decoded.length===114&&await A.eval(`${J}.announcer().profiles.every(p=>p.clips===19)`));
 await ready(A);await A.eval(`${J}.app.ui.activate('announcer-preview-welcome-back')`);await spoken(A,'welcome-back');await sleep(200);
 ok('preview starts a real BufferSource and ducks music',await A.eval(`!!${J}.app.announcer.source&&${J}.app.announcer.source.buffer.duration>1&&${J}.announcer().duck<.4`));
 await A.eval(`${J}.app.announcer.stop()`);await sleep(800);ok('music returns after speech stops',await A.eval(`${J}.announcer().duck>.98`));
 await ready(A);await A.eval(`${J}.app.announcer.request('team');${J}.app.announcer.request('dazzling');${J}.app.announcer.request('supernova',{priority:3})`);
 await until(()=>A.eval(`${J}.announcer().history.at(-1)?.key==='team'`),{label:'team starts'});
 ok('one voice at a time with one priority slot',await A.eval(`${J}.announcer().stats.peak===1&&${J}.announcer().pending==='supernova'`));
 await A.eval(`${J}.app.audio.setMute(true)`);ok('mute cancels speech and pending cues',await A.eval(`!${J}.announcer().speaking&&!${J}.announcer().pending&&!${J}.app.announcer.request('team')`));
 await A.eval(`${J}.app.audio.setMute(false)`);await ready(A);
 const before=await A.eval(`${J}.announcer().stats.played`);await A.eval(`${J}.app.practice=true;${J}.app.announcer.request('supernova');${J}.app.practice=false;${J}.app.auto=true;${J}.app.announcer.request('team');${J}.app.auto=false`);await sleep(200);
 ok('practice and showcase remain quiet',await A.eval(`${J}.announcer().stats.played===${before}`));
 await A.eval(`${J}.app.openPanel('audio')`);await sleep(150);ok('audio settings expose announcer',await A.eval(`${J}.ui().hits.some(h=>h.id==='announcer-open')`));
 await A.eval(`${J}.app.ui.activate('announcer-open')`);await sleep(120);await A.shot(out+'/settings-desktop.png');
 const voiceBefore=await A.eval(`${J}.announcer().profile`);await A.eval(`${J}.app.ui.activate('announcer-voice-cave');${J}.app.ui.activate('announcer-depth-6');document.querySelector('#announcer-volume').value=40;document.querySelector('#announcer-volume').dispatchEvent(new Event('input'))`);
 ok('voice pitch and volume controls save local choices',await A.eval(`${J}.announcer().profile==='cave-6'&&${J}.announcer().volume===40&&JSON.parse(localStorage.getItem('gemstogether-settings-v1')).announcerProfile==='cave-6'`));
 await A.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await sleep(150);await A.shot(out+'/settings-phone.png');
 ok('phone controls stay inside the panel',await A.eval(`(()=>{const a=${J}.app,m=a.ui.panelRect;return a.ui.hits.filter(h=>h.id.startsWith('announcer')).every(h=>h.x>=m.x&&h.x+h.w<=m.x+m.w+1);})()`));
 await A.call('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
 await A.eval(`window.__announcerReloadMarker=true`);await A.call('Page.reload',{ignoreCache:true});await until(()=>A.eval(`!window.__announcerReloadMarker&&!!${J}?.ready`),{timeout:60000,label:'new document'});await idle(A);await A.eval(`${J}.app.audio.start()`);await spoken(A,'welcome-back');ok('return visit uses Welcome back to Gems Together',await A.eval(`${J}.announcer().history.at(-1).text==='Welcome back to Gems Together!'&&${J}.announcer().profile==='cave-6'&&${J}.announcer().volume===40`));
 await ready(A);await A.eval(`${J}.challenge('zen',{seed:43})`);await idle(A);await A.eval(`${J}.swap(11,19)`);await idle(A);await spoken(A,'constellation');ok('real nine-wave cascade speaks its highest tier once',await A.eval(`${J}.announcer().history.filter(h=>h.key==='constellation').length===1`));
 await ready(A);await A.eval(`${J}.app.board.score=75010;${J}.app.displayScore=75010`);await spoken(A,'prism-heart');ok('crossing a stage speaks the new world',true);
 await ready(A);await A.eval(`${J}.app.fx.res={fill:60,mine:30,theirs:30,on:false};${J}.app.fx.resStart()`);await spoken(A,'team');ok('team Resonance starts its shared cue',true);
 await ready(A);await A.eval(`${J}.app.fx.res.count=90;${J}.app.fx.res.until=${J}.app.time;${J}.app.fx.resTick()`);await spoken(A,'supernova');ok('Supernova payout speaks once',true);
 await ready(A);await A.eval(`${J}.app.expedition.calm()`);ok('calm preset disables narration',await A.eval(`!${J}.announcer().enabled&&!${J}.announcer().speaking`));
 await A.eval(`${J}.app.prefs.announcer=true;${J}.app.savePreferences()`);await A.eval(`${J}.app.closePanel()`);
 B=await launch({port:9974});await boot(B);await B.eval(`${J}.app.audio.start()`);
 await A.eval(`${J}.app.ui.activate('coop-host')`);const code=await until(()=>A.eval(`${J}.net().code`),{timeout:30000,label:'private code'});await B.eval(`${J}.app.coop.join(${JSON.stringify(code)})`);
 await until(async()=>await A.eval(`${J}.net().connected`)&&await B.eval(`${J}.net().connected&&${J}.app.coop.synced`),{timeout:60000,every:250,label:'private connection'});
 await A.eval(`${J}.challenge('zen',{seed:1})`);await until(()=>B.eval(`${J}.state().score===0&&${J}.app.phase==='idle'`),{label:'fresh shared board'});
 await B.eval(`${J}.app.announcer.setProfile('founder-2')`);await sleep(1000);ok('host and peer keep their own voices',await A.eval(`${J}.announcer().profile==='cave-6'`)&&await B.eval(`${J}.announcer().profile==='founder-2'`));
 for(const p of [A,B]){await ready(p);await p.eval(`${J}.app.announcer.history=[]`);}
 await A.eval(`(()=>{const a=${J}.app;a.fx.res={fill:57,mine:30,theirs:27,on:false,until:0,count:0};a.coop.fullSync();})()`);await until(()=>B.eval(`${J}.app.fx.res?.fill===57`),{label:'charged mirror'});await A.eval(`${J}.swap(1,2)`);
 await spoken(A,'team');await spoken(B,'team');await idle(A);await idle(B);
 ok('real co-op clear speaks on host and peer',true);
 ok('voice playback preserves shared board hashes',await A.eval(`${J}.net().hash`)===await B.eval(`${J}.net().hash`));
 for(const p of [A,B])ok('no announcer or game runtime errors',await p.eval(`${J}.announcer().stats.errors===0&&${J}.diagnostics().errors.length===0`)&&!p.logs.some(x=>x.startsWith('EXCEPTION')));
}catch(error){fail++;console.error(error.stack);if(A){console.log(A.logs.slice(-5));try{console.log('PLAYBACK STATE',await A.eval(`JSON.stringify({announcer:${J}.announcer(),phase:${J}.app.phase,practice:${J}.app.practice,auto:${J}.app.auto,frozen:${J}.app.frozen,audio:${J}.app.audio.ctx?.state,score:${J}.state().score,moves:${J}.state().moves,highlights:${J}.expedition().highlights})`));}catch{}}}
finally{A?.kill();B?.kill();writeFileSync(out+'/runtime-results.json',JSON.stringify({pass,fail,receipts},null,2));console.log(`${pass} passed, ${fail} failed`);process.exitCode=fail?1:0;}
