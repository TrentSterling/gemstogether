// Actual WebAudio notes, transfer measurements, GPU comfort controls and private co-op.
import {launch,until,sleep} from './cdp.mjs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
const J='window.__jewel',base=pathToFileURL(resolve('index.html')).href,out='tools/out/harmony';
mkdirSync(out,{recursive:true});let pass=0,fail=0;const receipts=[];
const ok=(name,value,detail)=>{value?pass++:fail++;receipts.push({name,pass:!!value,detail});console.log(`${value?'PASS':'FAIL'} ${name}${detail?' / '+JSON.stringify(detail):''}`);};
const idle=p=>until(()=>p.eval(`${J}.app.phase==='idle'`),{timeout:30000,every:60,label:'idle'});
const boot=async(p,gl=false)=>{await p.goto(base+(gl?'?webgl=1':'')+'#solo=1');await until(()=>p.eval(`!!${J}?.ready`),{timeout:60000,label:'GPU boot'});await idle(p);await p.eval(`${J}.app.expedition.dismissTour()`);};
const start=async p=>{await p.eval(`(async()=>{const a=${J}.app;a.prefs.announcer=false;await a.audio.start();a.announcer.stop();})()`);await until(()=>p.eval(`${J}.app.music.harmony.length&&${J}.app.music.harmony[0].at<${J}.app.audio.ctx.currentTime`));};
const tones=async(p,body)=>p.eval(`(()=>{window.__toneLog=[];window.__toneCapture=true;try{${body}}finally{window.__toneCapture=false;}return window.__toneLog;})()`);
const grid=r=>{const g=60/88/8,phase=((r.when-r.next)%g+g)%g;return Math.min(phase,g-phase)<.003;};
for(const gl of [false,true]){let p;const tag=gl?'WebGL':'WebGPU';try{
 p=await launch({port:10001+(gl?1:0)});await boot(p,gl);await start(p);
 await p.eval(`(()=>{const a=${J}.app,names=new Map();for(const[k,v]of Object.entries(a.audio.buffers))for(const b of [].concat(v))names.set(b,k);const st=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(when=0,...rest){if(window.__toneCapture&&names.has(this.buffer))window.__toneLog.push({kind:names.get(this.buffer),rate:this.playbackRate.value,midi:69+12*Math.log2(this.playbackRate.value),when:Math.max(when,this.context.currentTime),now:this.context.currentTime,next:a.music.next});return st.call(this,when,...rest);};const os=OscillatorNode.prototype.start;OscillatorNode.prototype.start=function(when=0,...rest){if(window.__toneCapture)window.__toneLog.push({type:this.type,hz:this.frequency.value,midi:69+12*Math.log2(this.frequency.value/440),when});return os.call(this,when,...rest);};})()`);
 const catalog=await p.eval(`FX_STAGES.map(s=>({name:s.name,prog:s.prog,key:62+s.keyShift,chords:MUSIC_PROGS[s.prog]}))`);
 ok(tag+' six unique stage keys and progression pairs',new Set(catalog.map(s=>s.key%12)).size===6&&new Set(catalog.map(s=>JSON.stringify(s.chords))).size===6,catalog.map(({name,prog,key})=>({name,prog,key})));
 for(let k=0;k<6;k++){
  if(k){await p.eval(`${J}.app.board.score=${5000*k*(k+1)/2+10}`);await until(()=>p.eval(`${J}.app.fx.visualStage===${k}&&${J}.app.music.harmony.at(-1)?.stage===${k}&&${J}.app.music.harmony.at(-1).at<${J}.app.audio.ctx.currentTime`),{timeout:6500,every:40,label:'stage '+k});}
  const key=catalog[k].key;
  ok(tag+' '+catalog[k].name+' scheduler uses its key',await p.eval(`${J}.app.music.key()===${key}&&${J}.app.music.prog===${k}&&${J}.app.music.bpm===88`));
  const sounds=await tones(p,`const a=${J}.app;a.audio.match(0,1,3,0);a.audio.match(0,5,3,0);a.audio.select(0,0);a.audio.forge(1,0);`),glass=sounds.filter(r=>r.kind==='glass');
  ok(tag+' '+catalog[k].name+' real glass tones follow the stage scale',glass.length===4&&glass.every((r,i)=>Math.abs(r.midi-(key+[0,10,22,12][i]))<.01),glass.map(r=>+r.midi.toFixed(3)));
  // Match x5 adds a root octave; the complete list above also includes the selected tone.
  ok(tag+' '+catalog[k].name+' result tones stay on the beat',sounds.filter(r=>!['tick','whoosh','reject'].includes(r.kind)).every(grid));
  const sting=await tones(p,`${J}.app.fx.sting(6)`),pitched=sting.filter(r=>['sawtooth','triangle'].includes(r.type));
  const minor=[0,2,3,5,7,8,10];
  ok(tag+' '+catalog[k].name+' chord sting stays in natural minor',pitched.length===18&&pitched.every(r=>Math.abs(r.midi-Math.round(r.midi))<.01&&minor.includes(((Math.round(r.midi)-key)%12+12)%12)),pitched.map(r=>+r.midi.toFixed(3)));
  const lead=await tones(p,`${J}.app.fx.fanfare()`),phrase=lead.filter(r=>r.type==='square');
  ok(tag+' '+catalog[k].name+' fanfare shares the stage key',phrase.length===8&&phrase.every((r,i)=>Math.abs(r.midi-key-12-[0,3,7,10,12,15,19,24][i])<.01),phrase.map(r=>+r.midi.toFixed(3)));
  const selections=[];for(const base of [60,62,63,64,65,67,69,70]){const voices=await tones(p,`const a=${J}.app;a.audio.key=${base};a.audio.match(0,9,3,0,true);a.audio.forge(2,0);a.expedition.teamFanfare(true);a.audio.key=62;`),pitched=voices.filter(r=>['glass','prime','forge','prism'].includes(r.kind));selections.push({base,inScale:pitched.length===11&&pitched.every(r=>Math.abs(r.midi-Math.round(r.midi))<.01&&[0,2,3,5,7,8,10].includes(((Math.round(r.midi)-base-(key-62))%12+12)%12)),highest:Math.max(...pitched.map(r=>r.midi))});}
  ok(tag+' '+catalog[k].name+' all eight Gem tones choices retain their pitch',selections.every(r=>r.inScale),selections);
  if(k===0){await until(()=>p.eval(`${J}.app.music.nextDownbeat()-${J}.app.audio.ctx.currentTime>.5`));await p.eval(`${J}.app.board.score=5010`);await until(()=>p.eval(`!!${J}.app.fx.stageTravel`));const transition=await tones(p,`const a=${J}.app;a.audio.play(a.audio.buffers.glass[0],Math.pow(2,(a.audio.key-69)/12),.03,0,a.fx.stageTravel.at-a.audio.ctx.currentTime+.02);`);ok(tag+' a queued result uses the key audible after travel',transition.length===1&&Math.abs(transition[0].midi-67)<.01,transition);}
 }
 const immediate=await tones(p,`${J}.app.audio.swap(0);${J}.app.audio.reject(0);${J}.app.audio.land(0,5);`);
 ok(tag+' swaps and rejection remain immediate and untransposed',immediate.filter(r=>r.kind==='whoosh'||r.kind==='reject').every((r,i)=>Math.abs(r.rate-[1.35,1,.78][i])<.001)&&immediate.find(r=>r.kind==='whoosh').when-immediate.find(r=>r.kind==='whoosh').now<.005);
 ok(tag+' actual landing sound snaps to the music grid',immediate.filter(r=>r.kind==='land').length===1&&immediate.filter(r=>r.kind==='land').every(grid));
 await p.eval(`${J}.challenge('zen',{seed:1,stage:0})`);await until(()=>p.eval(`${J}.app.music.key()===62&&${J}.app.music.harmony.at(-1)?.stage===0&&${J}.app.music.harmony.at(-1).at<${J}.app.audio.ctx.currentTime`),{timeout:700,every:40,label:'new board harmony'});ok(tag+' a new board promptly starts its own harmony',true);await idle(p);
 // Measure a 6 kHz probe before and after the actual music-bus filter.
 await p.eval(`(()=>{const a=${J}.app,c=a.audio.ctx;a.music.bus.gain.cancelScheduledValues(c.currentTime);a.music.bus.gain.value=0;const o=c.createOscillator(),g=c.createGain(),pre=c.createAnalyser(),post=c.createAnalyser();o.frequency.value=6000;g.gain.value=.06;pre.fftSize=post.fftSize=4096;pre.smoothingTimeConstant=post.smoothingTimeConstant=0;o.connect(g);g.connect(a.audio.music);a.audio.music.connect(pre);a.audio.resonanceFilter.connect(post);o.start();window.__probe={o,g,pre,post};window.__probeRead=()=>{const q=window.__probe,bin=Math.round(6000/c.sampleRate*4096),read=n=>{const x=new Float32Array(n.frequencyBinCount);n.getFloatFrequencyData(x);return Math.max(...x.slice(bin-1,bin+2));};return {pre:read(q.pre),post:read(q.post),cutoff:a.audio.resonanceFilter.frequency.value};};})()`);
 await sleep(250);const ordinary=await p.eval(`window.__probeRead()`);
 await p.eval(`(()=>{const a=${J}.app;a.fx.res={fill:a.fx.resCap(),mine:60,theirs:0,count:0,on:false};a.fx.resStart();})()`);await sleep(700);const res=await p.eval(`window.__probeRead()`);
 ok(tag+' real Resonance low-passes music',res.cutoff<2300&&res.post-res.pre<-15&&ordinary.post-ordinary.pre>-1,{ordinary,res});
 await p.eval(`${J}.app.fx.res.count=90`);await sleep(500);const bright=await p.eval('window.__probeRead()');
 ok(tag+' banked clears gently brighten Resonance music',bright.cutoff>4100&&bright.cutoff<4300&&bright.post-res.post>5,bright);
 await p.eval(`${J}.app.fx.res.until=${J}.app.time`);await sleep(950);const restored=await p.eval('window.__probeRead()');
 ok(tag+' payout restores the ordinary music spectrum',restored.cutoff>19000&&restored.post-restored.pre>-1,restored);
 await p.eval(`(async()=>{const a=${J}.app,sr=8000,n=800,bytes=new Uint8Array(44+n*2),v=new DataView(bytes.buffer),w=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i));};w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);await a.audio.loadTrack(new File([bytes],'local-track-test.wav',{type:'audio/wav'}));a.fx.res.on=true;a.fx.res.until=a.time+8;a.fx.res.count=0;})()`);await sleep(650);const loaded=await p.eval('window.__probeRead()');
 ok(tag+' a loaded local track uses the same Resonance filter',loaded.cutoff<2400&&loaded.post-loaded.pre<-15,loaded);
 ok(tag+' loading a track silences the old synth tails',await p.eval(`${J}.app.music.trackMuted&&${J}.app.music.bus.gain.value<.001&&${J}.app.music.next===0`));
 await p.eval(`(()=>{const a=${J}.app;a.prefs.announcer=true;a.announcer.request('welcome-back',{preview:true});})()`);await until(()=>p.eval(`${J}.announcer().speaking`));await sleep(180);
 ok(tag+' narration ducks music while Resonance filtering is active',await p.eval(`${J}.announcer().duck<.4&&${J}.announcer().stats.peak===1&&${J}.app.audio.resonanceFilter.frequency.value<2400`));
 await p.eval(`(()=>{const a=${J}.app;a.announcer.stop();a.prefs.announcer=false;a.audio.clearTrack();a.fx.res.on=false;window.__probe.o.stop();window.__probe.g.disconnect();window.__probe.pre.disconnect();window.__probe.post.disconnect();})()`);
 await sleep(250);ok(tag+' clearing the track restores generative music',await p.eval(`!${J}.app.music.trackMuted&&${J}.app.music.bus.gain.value>1.3&&${J}.app.music.next>0`));
 // Observe real GPU calls, so the comfort toggle is verified at the drawn effect.
 const flash=await p.eval(`(()=>{const a=${J}.app,p=a.ui.ink,box=p.box.bind(p),line=p.line.bind(p),sample=on=>{a.prefs.comboTreatment=on;a.ui.callout(5);let screens=0,lines=0;p.box=(x,y,w,h,...rest)=>{if(x===0&&y===0&&w===a.cssWidth&&h===a.cssHeight)screens++;return box(x,y,w,h,...rest);};p.line=(...args)=>{lines++;return line(...args);};a.ui.drawBurst();p.box=box;p.line=line;return {screens,lines};};a.prefs.motion=true;a.prefs.flash='full';return {defaults:a.prefs.comboTreatment,on:sample(true),off:sample(false)};})()`);
 ok(tag+' big-combo comfort choice preserves speed lines',flash.on.screens===1&&flash.off.screens===0&&flash.on.lines===flash.off.lines&&flash.on.lines>0,flash);
 await p.eval(`${J}.app.prefs.comboTreatment=true;${J}.app.ui.activate('exp-pref-comboTreatment')`);await p.goto(base+(gl?'?webgl=1':'')+'#solo=1');await until(()=>p.eval(`!!${J}?.ready`));await idle(p);
 ok(tag+' combo screen flash preference survives a reload',await p.eval(`${J}.app.prefs.comboTreatment===false`));
 await p.eval(`${J}.app.expedition.dismissTour();${J}.app.prefs.flash='low';${J}.app.prefs.comboTreatment=true;${J}.app.prefs.motion=true;${J}.app.fx.lowFlashAt=-10000;window.__flashEvents=[]`);
 for(let i=0;i<18;i++){await p.eval(`(()=>{const a=${J}.app;a.ui.callout(5);if(a.ui.burst.flash)window.__flashEvents.push(performance.now());})()`);await sleep(80);}
 const flashes=await p.eval('window.__flashEvents'),rate=flashes.reduce((n,t)=>Math.max(n,flashes.filter(v=>v>=t&&v<t+1000).length),0);
 ok(tag+' Low limits repeated large flashes to three per second',rate<=3&&flashes.length>=3,{rate,events:flashes.length});
 for(const mode of ['full','off']){await p.eval(`${J}.app.prefs.flash=${JSON.stringify(mode)};window.__flashEvents=[]`);for(let i=0;i<6;i++)await p.eval(`(()=>{const a=${J}.app;a.ui.callout(5);if(a.ui.burst.flash)window.__flashEvents.push(performance.now());})()`);const n=await p.eval('window.__flashEvents.length');ok(tag+' '+mode+' preserves its expected screen treatment',n===(mode==='full'?6:0),n);}
 await p.eval(`${J}.app.openPanel('comfort');${J}.app.ui.scroll=0`);await sleep(100);await p.shot(out+'/'+tag+'-comfort.png');
 await p.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await sleep(150);await p.eval(`${J}.app.ui.scroll=0;${J}.app.ui.activate('exp-pref-comboTreatment')`);await sleep(80);await p.shot(out+'/'+tag+'-comfort-phone.png');
 const h=await p.eval(`${J}.ui()`);ok(tag+' comfort panel has no horizontal overflow on phone',h.hits.filter(h=>h.id.startsWith('exp-pref')).every(h=>h.x>=0&&h.x+h.w<=391));
 ok(tag+' no runtime or GPU errors',await p.eval(`${J}.diagnostics().errors.length===0`)&&!p.logs.some(x=>x.startsWith('EXCEPTION')));
 if(!gl){
  for(const s of catalog){const r=await p.eval(`(async()=>{const sr=32000,seconds=23,c=new OfflineAudioContext(1,sr*seconds,sr),m=new ResonanceMusic(${J}.app),notes=[],play=m.osc.bind(m),build=m.build.bind(m);m.prog=${s.prog};m.osc=(ty,f,...args)=>{if(!(ty==='sine'&&f===150))notes.push(69+12*Math.log2(f/440));return play(ty,f,...args);};m.build=(ctx,dest)=>{const g=ctx.createGain(),comp=ctx.createDynamicsCompressor();g.gain.value=.4;g.connect(comp);comp.threshold.value=-16;comp.knee.value=16;comp.ratio.value=4;comp.attack.value=.003;comp.release.value=.18;comp.connect(dest);return build(ctx,g);};m.render(c,seconds,()=>({flow:.9,laser:1.2,cascade:5}),${s.key});const b=await c.startRendering(),x=b.getChannelData(0),pcm=new Int16Array(x.length);let peak=0,sum=0;for(let i=0;i<x.length;i++){peak=Math.max(peak,Math.abs(x[i]));sum+=x[i]*x[i];pcm[i]=Math.round(clamp(x[i],-1,1)*32767);}const bytes=new Uint8Array(44+pcm.byteLength),v=new DataView(bytes.buffer),w=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i));};w(0,'RIFF');v.setUint32(4,36+pcm.byteLength,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,pcm.byteLength,true);bytes.set(new Uint8Array(pcm.buffer),44);let str='';for(let i=0;i<bytes.length;i+=32768)str+=String.fromCharCode(...bytes.subarray(i,i+32768));return {wav:btoa(str),peak,rms:Math.sqrt(sum/x.length),notes:notes.length,inScale:notes.every(n=>Math.abs(n-Math.round(n))<.01&&[0,2,3,5,7,8,10].includes(((Math.round(n)-${s.key})%12+12)%12))};})()`);writeFileSync(out+'/stage-'+s.prog+'.wav',Buffer.from(r.wav,'base64'));ok(s.name+' actual eight-bar audio render is in scale and unclipped',r.inScale&&r.notes>200&&r.rms>.02&&r.peak<.98,{peak:r.peak,rms:r.rms,notes:r.notes});}
 }
}catch(error){fail++;console.error(error.stack);}finally{p?.kill();}}
let A,B;try{
 A=await launch({port:10003});B=await launch({port:10004});await boot(A);await boot(B);await start(A);await start(B);
 await A.eval(`${J}.app.ui.activate('coop-host')`);const code=await until(()=>A.eval(`${J}.net().code`));await B.eval(`${J}.app.coop.join(${JSON.stringify(code)})`);await until(async()=>await A.eval(`${J}.net().connected`)&&await B.eval(`${J}.app.coop.synced`),{timeout:60000,label:'private sync'});
 await A.eval(`${J}.challenge('zen',{seed:1})`);await idle(A);await idle(B);
 await A.eval(`(()=>{const a=${J}.app;a.board.score=5010;a.fx.res={fill:69,mine:36,theirs:33,on:false,count:0,until:0};a.coop.fullSync();})()`);await until(()=>B.eval(`${J}.app.fx.res?.fill===69`));
 await B.eval(`${J}.app.audio.key=57;${J}.app.prefs.key=57;${J}.app.prefs.comboTreatment=false;${J}.app.savePreferences()`);
 await A.eval(`${J}.swap(1,2)`);await until(async()=>await A.eval(`${J}.app.fx.res?.on`)&&await B.eval(`${J}.app.fx.res?.on`));await sleep(550);
 ok('private team Resonance filters both real music buses',await A.eval(`${J}.app.audio.resonanceFilter.frequency.value<4400`)&&await B.eval(`${J}.app.audio.resonanceFilter.frequency.value<4400`));
 ok('private players share the host key and keep comfort local',await A.eval(`${J}.app.audio.key===62&&${J}.app.prefs.comboTreatment===true`)&&await B.eval(`${J}.app.audio.key===62&&${J}.app.prefs.comboTreatment===false`));
 await idle(A);await idle(B);ok('shared Resonance and board stay in sync',await A.eval(`${J}.net().hash`)===await B.eval(`${J}.net().hash`)&&await A.eval(`${J}.app.fx.res.count`)===await B.eval(`${J}.app.fx.res.count`));
 for(const p of [A,B])ok('private harmony has no runtime errors',await p.eval(`${J}.diagnostics().errors.length===0`)&&!p.logs.some(x=>x.startsWith('EXCEPTION')));
}catch(error){fail++;console.error(error.stack);}finally{A?.kill();B?.kill();}
writeFileSync(out+'/results.json',JSON.stringify({pass,fail,receipts},null,2));console.log(`${pass} passed, ${fail} failed`);process.exitCode=fail?1:0;
