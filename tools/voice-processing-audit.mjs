// Actual local player / game audio checks. Does not join the public room.
import {launch,sleep,until} from './cdp.mjs';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const round=process.argv[2]||'processing-round7';
const out=resolve('tools/out/voices',round),root=resolve('tools/out/voices'),checks=[];
const plan=JSON.parse(readFileSync(out+'/plan.json','utf8')),catalog=JSON.parse(readFileSync(out+'/catalog.json','utf8'));
const tuning=round==='tuning-round9',expected=plan.presets.length*19;
const probe=plan.auditProbes||(tuning?{space:'crystal-tune',switch:'crystal-low',depth:'hard-tune',voice:'gentle-tune',file:'note-lock'}:{space:'deep-echo',switch:'deep-hall',depth:'down4',voice:'deep-plate',file:'deep-room'});
const favouriteKey=plan.favouriteStorageKey||(tuning?'gems-tuning-round9-favourites':'gems-processing-round7-favourites');
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
function check(name,pass,detail){checks.push({name,pass:!!pass,detail});console.log(`${pass?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);}
const server=createServer((req,res)=>{try{const file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.json':'application/json','.mp3':'audio/mpeg','.wav':'audio/wav'})[extname(file)]||'application/octet-stream');res.end(readFileSync(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(8279,'127.0.0.1',r));
const page=await launch({port:10021,width:1360,height:900});
const game='document.querySelector("#game").contentWindow';
async function click(selector){const point=await page.eval(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2];})()`);await page.mouse('mousePressed',...point);await page.mouse('mouseReleased',...point);}
try{
 for(const [file,expected]of Object.entries(plan.guards))check('production retained '+file,hash(file)===expected);
 check('full pack available',catalog.length===expected&&plan.presets.length===(plan.expectedPresetCount||(tuning?8:20)));
 check('all normalized clips and MP3s retain hashes',catalog.every(c=>hash(out+'/'+c.file)===c.sha256&&hash(out+'/'+c.mp3)===c.mp3Sha256));
 const live=JSON.parse(readFileSync('tools/announcer-pack.json','utf8'));
 check('baseline is the exact live MP3',catalog.filter(c=>c.voice==='dry').every(c=>c.mp3Sha256===live.profiles.silver.clips[c.line].sha256));
 const levels=JSON.parse(readFileSync(out+'/level-results.json','utf8'));
 check('all '+expected+' levels and peaks pass',levels.length===expected&&levels.every(r=>r.pass));
 if(tuning||plan.expectedPitchChecks){const pitch=JSON.parse(readFileSync(out+'/pitch-checks.json','utf8'));check('actual pitch resynthesis checks pass',pitch.length===(plan.expectedPitchChecks||23)&&pitch.every(r=>r.passed));}
 if(plan.sourceGuards)check('all retained input sources unchanged',Object.entries(plan.sourceGuards).every(([file,sum])=>hash(file)===sum));
 await page.goto('http://127.0.0.1:8279/'+round+'/index.html');
 await until(()=>page.eval('window.voiceProcessing?.ready'),{timeout:60000,label:'audition game ready'});
 check('default is game listening',await page.eval('document.querySelector("#mode").value==="game"'));
 check('all rows and call controls',await page.eval(`document.querySelectorAll(".voice").length===${plan.presets.length}&&document.querySelectorAll("[data-clip]").length===${plan.presets.length*4}`));
 check('sandbox is solo',await page.eval(`${game}.processingGame.info().solo&&${game}.__jewel.net().role==='solo'`));
 check('isolated settings namespace',await page.eval(`${game}.localStorage.getItem('gemstogether-${round}-settings-v1')!==null&&${game}.localStorage.getItem('gemstogether-settings-v1')===null`));
 // Decode the actual MP3s used by the sandbox, including every non-button call.
 const decoded=await page.eval(`(async()=>{const g=${game},p=g.processingGame,results=[];for(const preset of p.presets){let count=0,peak=0,durations=[];for(const key of ${JSON.stringify(Object.keys(live.profiles.silver.clips))}){const b=await p.decode(preset.id,key);for(let ch=0;ch<b.numberOfChannels;ch++){const x=b.getChannelData(ch);for(let i=0;i<x.length;i++)peak=Math.max(peak,Math.abs(x[i]));}durations.push(b.duration);count++;}results.push({id:preset.id,count,peak,min:Math.min(...durations),max:Math.max(...durations)});}return results;})()`);
 for(const r of decoded)check('actual decoded pack '+r.id,r.count===19&&r.peak<.98&&r.peak>.05&&r.min>.5&&r.max<8,r);
 await click(`[data-clip="${probe.space}/welcome-back"]`);
 await until(()=>page.eval(`${game}.__jewel.app.announcer.source!==null`),{timeout:10000,label:'processed in-game source'});
 let info=await page.eval(`(()=>{const g=${game},a=g.__jewel.app,n=a.announcer;return {selected:g.processingGame.info().selected,profile:n.info().profile,duration:n.source.buffer.duration,channels:n.source.buffer.numberOfChannels,music:a.audio.music.gain.value,voice:n.voiceGain.gain.value,master:a.audio.master.gain.value,speaking:voiceProcessing.speaking};})()`);
 check('real processed source in the game bus',info.selected===probe.space&&info.profile==='silver'&&info.duration>2&&info.channels===2&&Math.abs(info.music-.28)<.001&&Math.abs(info.voice-.6175)<.005&&Math.abs(info.master-.65)<.001&&info.speaking,info);
 await sleep(130);check('actual music ducking',await page.eval(`${game}.__jewel.app.announcer.ducker.gain.value<.4`));
 await click('#stop');await sleep(750);
 check('stop clears speech and restores music',await page.eval(`${game}.__jewel.app.announcer.source===null&&${game}.__jewel.app.announcer.pending===null&&${game}.__jewel.app.announcer.ducker.gain.value>.98&&!voiceProcessing.speaking`));
 await click(`[data-clip="${probe.switch}/brilliant"]`);
 await until(()=>page.eval(`${game}.__jewel.app.announcer.source!==null`),{timeout:10000,label:'hall source'});
 check('quick switch selects the next treatment',await page.eval(`${game}.processingGame.info().selected==='${probe.switch}'&&${game}.__jewel.app.announcer.activeSources.size===1`));
 await click(`[data-clip="${probe.depth}/resonance"]`);await sleep(150);
 check('mid-call switch retains one voice',await page.eval(`${game}.processingGame.info().selected==='${probe.depth}'&&${game}.__jewel.app.announcer.activeSources.size===1`));
 await click('#stop');
 await page.eval(`document.querySelector('#mode').value='voice';document.querySelector('#mode').dispatchEvent(new Event('change'))`);
 await click(`[data-clip="${probe.voice}/welcome-back"]`);await until(()=>page.eval(`!document.querySelector("#speech").paused&&document.querySelector("#speech").currentSrc.endsWith("${probe.voice}-welcome-back.mp3")`),{timeout:10000,label:'voice-only MP3'});
 await until(()=>page.eval(`${game}.__jewel.app.audio.muted`),{timeout:5000,label:'voice-only cabinet mute'});
 check('voice alone plays and silences the cabinet',await page.eval(`document.querySelector('#speech').currentSrc.endsWith('${probe.voice}-welcome-back.mp3')&&${game}.__jewel.app.audio.muted`));
 await click('#stop');await page.eval(`document.querySelector('#mode').value='game';document.querySelector('#mode').dispatchEvent(new Event('change'))`);
 await click('[data-reference="matched-welcome_back.wav"]');await until(()=>page.eval('!document.querySelector("#speech").paused&&Number.isFinite(document.querySelector("#speech").duration)'),{timeout:10000,label:'reference playback'});
 check('actual original reference plays',await page.eval('document.querySelector("#speech").duration>1&&document.querySelector("#mode").value==="voice"'));
 await click('#stop');
 await click(`[data-id="${probe.voice}"]`);check('favourite saved',await page.eval(`voiceProcessing.favourites.includes("${probe.voice}")&&JSON.parse(localStorage.getItem("${favouriteKey}")).includes("${probe.voice}")`));
 await page.goto('http://127.0.0.1:8279/'+round+'/index.html');await until(()=>page.eval('window.voiceProcessing?.ready'),{timeout:60000,label:'reload'});
 check('favourite survives reload',await page.eval(`voiceProcessing.favourites.includes("${probe.voice}")&&document.querySelector("[data-id=${probe.voice}]").getAttribute("aria-pressed")==="true"`));
 // Queue contains the baseline and saved favourites; Stop must interrupt it.
 await click('#compare');await until(()=>page.eval(`${game}.__jewel.app.announcer.source!==null`),{timeout:10000,label:'comparison source'});
 check('favourite compare starts with dry',await page.eval(`${game}.processingGame.info().selected==='dry'`));await click('#stop');await sleep(800);
 check('stop cancels comparison without another call',await page.eval(`${game}.__jewel.app.announcer.source===null&&!voiceProcessing.speaking`));
 const historyStart=await page.eval(`${game}.__jewel.app.announcer.history.length`);
 await click(`[data-all="${probe.space}"]`);
 await until(()=>page.eval('document.querySelector("#now").textContent.includes("ready for another comparison")'),{timeout:30000,label:'four processed calls and tails'});
 const sequence=await page.eval(`${game}.__jewel.app.announcer.history.slice(${historyStart})`);
 check('All four plays every call in order',sequence.length===4&&sequence.every((r,i)=>r.key===plan.previewKeys[i]),sequence.map(r=>({key:r.key,at:r.at,duration:r.duration})));
 check('comparisons preserve the entire effect tail',sequence.every((r,i)=>!i||r.at-sequence[i-1].at>=sequence[i-1].duration+.3));
 check('four-call comparison finishes without overlapping sources',await page.eval(`${game}.__jewel.app.announcer.stats.peak===1&&${game}.__jewel.app.announcer.source===null&&!voiceProcessing.speaking`));
 await click('#automatic');await sleep(100);
 check('automatic game calls can be enabled',await page.eval(`${game}.processingGame.info().automatic`));
 const played=await page.eval(`(()=>{const g=${game};g.__jewel.app.audio.start();return g.__jewel.app.announcer.request('dawn');})()`);
 await until(()=>page.eval(`${game}.__jewel.app.announcer.source!==null`),{timeout:11000,label:'automatic call after production cooldown'});
 check('non-preview automatic game request uses the selected treatment',played&&await page.eval(`${game}.__jewel.app.announcer.source!==null&&${game}.__jewel.app.announcer.history.at(-1).preview===false`));
 await click('#automatic');await until(()=>page.eval(`!${game}.processingGame.info().automatic&&${game}.__jewel.app.announcer.source===null`),{timeout:5000,label:'automatic off acknowledgement'});check('disabling automatic calls stops the voice',await page.eval(`!${game}.processingGame.info().automatic&&${game}.__jewel.app.announcer.source===null`));
 const before=await page.eval(`${game}.__jewel.state().moves`);
 await page.eval(`(()=>{const j=${game}.__jewel,m=j.state().legalMoves[0];return j.swap(m[0],m[1]);})()`);await sleep(1000);
 check('real game remains playable',await page.eval(`${game}.__jewel.state().moves`)>before);
 await page.shot(out+'/player-desktop.png');
 await page.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(200);
 check('phone controls stay within viewport',await page.eval('document.documentElement.scrollWidth<=innerWidth'));
 await page.shot(out+'/player-phone.png');
 check('no browser exceptions',!page.logs.some(s=>s.startsWith('EXCEPTION')),page.logs.filter(s=>s.startsWith('EXCEPTION')));
 // Also load file:// because that is what opens in the user's Firefox.
 await page.goto(pathToFileURL(out+'/index.html').href);await until(()=>page.eval('window.voiceProcessing?.ready'),{timeout:60000,label:'file cabinet'});
 check('file player boots',await page.eval('voiceProcessing.ready'));
 await click(`[data-clip="${probe.file}/welcome-back"]`);await sleep(250);
 check('file player receives game playback acknowledgement',await page.eval(`voiceProcessing.speaking&&voiceProcessing.selected==="${probe.file}"`));
 await click('#stop');
}catch(error){check('audit completed',false,error.stack);}finally{page.kill();await new Promise(r=>server.close(r));}
const result={passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,checks};writeFileSync(out+'/player-results.json',JSON.stringify(result,null,2));console.log(`${result.passed} passed; ${result.failed} failed`);if(result.failed)process.exitCode=1;
