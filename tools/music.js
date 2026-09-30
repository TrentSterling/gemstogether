/* Tront patch 7: Resonance music (injected by tools/polish.py right after resonance.js).
   A generative, sample-free soundtrack on the drop's music bus (so the Music volume slider controls it).
   Each stage transposes the player's Gem tones key (natural minor) and layers in with play:
     pad     always, one chord per 2 bars (i VI III VII, then i iv VI VII)
     bass    once the board warms up (flow)
     arp     16ths up in the chord, through a tempo-synced echo, once flow is up
     drums   kick, hats and clap when the board is hot or a chain reaches x4
     lead    a pentatonic phrase while the x5+ sky lasers are on
   Loading your own track (Settings > Sound) silences it; removing the track brings it back.
   The same scheduler renders offline (OfflineAudioContext) for receipts: tools/music-render.mjs. */
// Each of the six stages has its own pair of 8-bar progressions.
const MUSIC_PROGS=[[[[0,3,7],[8,12,15],[3,7,10],[10,14,17]],[[0,3,7],[5,8,12],[8,12,15],[10,14,17]]],
 [[[0,3,7],[10,14,17],[8,12,15],[10,14,17]],[[0,3,7],[7,10,14],[8,12,15],[5,8,12]]],
 [[[0,3,7],[5,8,12],[0,3,7],[10,14,17]],[[8,12,15],[5,8,12],[3,7,10],[10,14,17]]],
 [[[8,12,15],[10,14,17],[0,3,7],[0,3,7]],[[5,8,12],[8,12,15],[10,14,17],[7,10,14]]],
 [[[0,3,7],[3,7,10],[8,12,15],[5,8,12]],[[0,3,7],[8,12,15],[10,14,17],[3,7,10]]],
 [[[0,3,7],[8,12,15],[5,8,12],[7,10,14]],[[3,7,10],[10,14,17],[8,12,15],[0,3,7]]]];
const MUSIC_PENTA=[0,3,5,7,10,12,15,17];
class ResonanceMusic {
 constructor(app){this.a=app;this.bpm=88;this.step=0;this.next=0;this.ctx=null;this.lv=[0,0,0,0,0];this.stats={notes:0};this.harmony=[];this.pads=[];this.trackMuted=false;}
 // Keep every pitched result in the harmony that will be audible at its scheduled start.
 stageShift(at=this.a.audio.ctx?.currentTime||0){const au=this.a.audio,fx=this.a.fx;if(this.ctx===au.ctx&&!au.muted&&!au.loadedTrack&&au.musicVolume>0){const travel=fx?.stageTravel;if(travel?.at!=null&&travel.at<=at+.001)return fx.stageInfo(travel.k).keyShift||0;for(let i=this.harmony.length-1;i>=0;i--)if(this.harmony[i].at<=at+.001)return this.harmony[i].shift;}return fx?.stageInfo?.(fx.visualStage??fx.stage)?.keyShift||0;}
 key(at){return (this.a.audio.key||62)+this.stageShift(at);}
 reset(){const t=this.a.audio.ctx?.currentTime||0;for(const o of this.pads)if(o.ends>t){o.voiceGain.gain.cancelScheduledValues(t);o.voiceGain.gain.setTargetAtTime(0,t,.09);o.stop(Math.min(o.ends,t+.5));}this.pads=[];this.harmony=[];this.musicStage=undefined;this.stageStartBar=0;this.step=0;this.next=this.ctx?t+.16:0;this.beats=[];this.hold=null;this.lv=[0,0,0,0,0];this.exhaleUntil=0;this.trackMuted=!!this.a.audio.loadedTrack;if(this.bus){this.bus.gain.cancelScheduledValues(t);this.bus.gain.setTargetAtTime(this.trackMuted?0:1.4,t,.035);}}
 routeMusic(){const au=this.a.audio,c=au.ctx;if(!c||!au.music||!au.compressor)return;if(this.filterCtx===c)return;this.filterCtx=c;const f=au.resonanceFilter=c.createBiquadFilter();f.type='lowpass';f.frequency.value=20000;f.Q.value=.6;au.music.disconnect(au.compressor);au.music.connect(f);f.connect(au.compressor);this.filterTarget=20000;}
 filterResonance(){this.routeMusic();const au=this.a.audio,c=au.ctx,f=au.resonanceFilter;if(!c||!f)return;const r=this.a.fx?.res,target=r?.on?2200+2000*clamp((r.count||0)/90,0,1):20000;if(target===this.filterTarget)return;this.filterTarget=target;f.frequency.cancelScheduledValues(c.currentTime);f.frequency.setTargetAtTime(target,c.currentTime,r?.on ? .09 : .15);}
 hz(m){return 440*Math.pow(2,(m-69)/12);}
 // Layer targets from the game state: pad, bass, arp, drums, lead.
 targets(s){if(s.res)return [1,1,1,1,1];if(this.a.gameOver)return [.7,0,0,0,0];const f=s.flow,c=s.cascade,p=s.phase||0;return [.9,Math.max(p>=1?.65:0,clamp((f-.10)*3,0,1)),Math.max(p>=2?.65:0,clamp((f-.32)*2.4,0,1)),Math.max(clamp((f-.62)*2.2,0,1),c>=4?1:0),s.laser>.3?1:0];}
 state(){const fx=this.a.fx;return {flow:fx?fx.flow:0,laser:fx?fx.laser:0,cascade:this.a.phase==='idle'?0:this.a.cascade,res:!!(fx&&fx.res&&fx.res.on),phase:this.a.practice?0:this.phase||0};}
 build(ctx,dest){
  this.ctx=ctx;this.bus=ctx.createGain();this.bus.gain.value=1.4;this.bus.connect(dest);
  const d=this.delay=ctx.createDelay(1.5),fb=ctx.createGain(),lp=ctx.createBiquadFilter();d.delayTime.value=60/this.bpm*.75;fb.gain.value=.38;lp.type='lowpass';lp.frequency.value=2600;
  this.echo=ctx.createGain();this.echo.gain.value=1;this.echo.connect(d);d.connect(lp);lp.connect(fb);fb.connect(d);lp.connect(this.bus);
  const n=ctx.sampleRate,buf=ctx.createBuffer(1,n,ctx.sampleRate),x=buf.getChannelData(0);let s=12345;for(let i=0;i<n;i++){s=(s*1103515245+12345)>>>0;x[i]=s/2147483648-1;}this.noise=buf;
 }
 env(g,t,a,peak,hold,rel){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);if(hold>0)g.gain.setValueAtTime(peak,t+a+hold);g.gain.exponentialRampToValueAtTime(.0001,t+a+hold+rel);}
 osc(type,f,t,dur,peak,a,rel,out,det=0){const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=f;o.detune.value=det;this.env(g,t,a,peak,Math.max(0,dur-a),rel);o.connect(g);g.connect(out);o.voiceGain=g;o.ends=t+dur+rel+.05;o.onended=()=>{o.disconnect();g.disconnect();};o.start(t);o.stop(o.ends);this.stats.notes++;return o;}
 hit(t,fq,type,q,peak,rel,out){const c=this.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noise;f.type=type;f.frequency.value=fq;f.Q.value=q;this.env(g,t,.002,peak,0,rel);s.connect(f);f.connect(g);g.connect(out);s.start(t,Math.random()*.5);s.stop(t+rel+.05);}
 // One 16th step at time t with layer levels lv.
 play(i,t,lv,key,flow){
  const c=this.ctx,sp=60/this.bpm/4,bar=Math.floor(i/16)-(this.stageStartBar||0),beat=i%16,prog=MUSIC_PROGS[this.prog||0][Math.floor(bar/8)%2],chord=prog[Math.floor(bar/2)%4],root=key-12;
  if(lv[0]>.02&&beat===0&&bar%2===0){const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=500+Math.min(flow,1.2)*1600;lp.Q.value=.7;lp.connect(this.bus);const len=sp*32;
   for(const n of chord)for(const det of [-9,9]){this.pads.push(this.osc('sawtooth',this.hz(root+n),t,len,.022*lv[0],1.1,1.6,lp,det));}this.pads.push(this.osc('triangle',this.hz(root+chord[0]-12),t,len,.05*lv[0],1.1,1.6,lp));}
  if(lv[1]>.02&&(beat===0||beat===8||(flow>.8&&(beat===6||beat===14)))){const o=this.osc('triangle',this.hz(root-12+chord[0]),t,sp*3,.2*lv[1],.008,.25,this.bus);o.frequency.setValueAtTime(this.hz(root-12+chord[0]),t);}
  if(lv[2]>.02){const seq=[0,1,2,1,0,1,2,3],tones=[chord[0],chord[1],chord[2],chord[0]+12],m=root+12+tones[seq[(i>>1)%8]%tones.length];if(beat%2===0){if(flow>.9)this.osc('sine',this.hz(m+24),t,sp*.9,.018*lv[2],.004,.3,this.echo);this.osc('triangle',this.hz(m),t,sp*.7,.05*lv[2],.004,.22,this.echo);this.osc('sine',this.hz(m+12),t,sp*.5,.02*lv[2],.004,.15,this.bus);}}
  if(lv[3]>.02){const four=lv[3]>.8;if(beat===0||beat===8||(four&&(beat===4||beat===12))){const o=this.osc('sine',150,t,.02,.55*lv[3],.002,.32,this.bus);o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.3);}
   if(beat%4===2)this.hit(t,8000,'highpass',.7,.10*lv[3],.05,this.bus);if(four&&beat%4===0)this.hit(t,9500,'highpass',.7,.05*lv[3],.03,this.bus);if(beat===4||beat===12)this.hit(t,1500,'bandpass',.9,.22*lv[3],.16,this.bus);}
  if(lv[4]>.02&&beat%2===0){const ph=[0,2,4,5,7,5,4,2,3,4,6,7,5,4,2,1],k=ph[(i>>1)%16],m=key+12+MUSIC_PENTA[k%MUSIC_PENTA.length];if((i>>1)%4!==3){const o=this.osc('square',this.hz(m),t,sp*1.6,.028*lv[4],.01,.3,this.echo);const v=c.createOscillator(),vg=c.createGain();v.frequency.value=5.5;vg.gain.value=9;v.connect(vg);vg.connect(o.detune);v.start(t);v.stop(t+sp*2+.4);}}
 }
 // Patch 18 (Andre: 'it should probably not drop back to base layer so quickly once a higher layer is reached').
 // Earned layers LATCH: once a layer passes half level it holds (bass 4 bars, arp 3, drums/lead 2), rises fast and
 // fades over about 3 bars, so the song steps down drums, then arp, then bass instead of collapsing. The exhale after a x5 is a 2-bar dip that returns to the held layers.
 latch(tg,t,ex){const bar=60/this.bpm*4,h=this.hold||(this.hold=[0,0,0,0,0]),dip=[1,.2,0,0,0];
  for(let k=0;k<5;k++){if(tg[k]>.5)h[k]=Math.max(h[k],t+bar*[8,4,3,2,2][k]);if(ex)h[k]=Math.max(h[k],t+bar*2);
   const want=ex?dip[k]:t<h[k]?Math.max(tg[k],1):tg[k];this.lv[k]=mix(this.lv[k],want,want>this.lv[k]?(k===3?.35:.1):.05);}}
 // Patch 15: the x5 duck (a quarter-second hole, then the fanfare lands) and the exhale after a big chain.
 duck(){if(!this.ctx||!this.bus)return;const g=this.bus.gain,t=this.ctx.currentTime;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(.18,t+.05);g.setValueAtTime(.18,t+.25);g.linearRampToValueAtTime(1.6,t+.29);g.setTargetAtTime(1.4,t+.6,.4);}
 exhale(){if(this.ctx)this.exhaleUntil=this.ctx.currentTime+60/this.bpm*8;}
 // Result and landing sounds wait less than 86 ms for the next 1/32 at 88 BPM.
 // Swap whooshes, interface ticks and the reject buzz remain immediate.
 snapWait(d=0){const c=this.ctx,au=this.a.audio;if(!c||!au||au.ctx!==c||!this.next||au.loadedTrack||au.muted)return 0;const g=60/this.bpm/8,now=c.currentTime+d;return ((this.next-now)%g+g)%g;}
 // Use an unscheduled bar so the new progression and scenery can enter together.
 nextDownbeat(){const au=this.a.audio,c=this.ctx;if(!c||au.ctx!==c||c.state!=='running'||au.muted||au.loadedTrack||!au.musicVolume||!this.next||this.next<c.currentTime-.1)return null;return this.next+(16-this.step%16)%16*60/this.bpm/4;}
 hookSnap(au){if(au.snapHooked)return;au.snapHooked=true;const B=au.buffers||{},set=new Set(),pitched=new Set();for(const [k,v] of Object.entries(B)){for(const b of [].concat(v)){if(!['tick','whoosh','reject'].includes(k))set.add(b);if(['glass','prime','forge','prism'].includes(k))pitched.add(b);}}
  const play=au.play.bind(au);au.play=(buffer,rate=1,volume,pan,delay=0)=>{const wait=delay+(set.has(buffer)?this.snapWait(delay):0),shift=pitched.has(buffer)?this.stageShift(au.ctx.currentTime+wait):0;return play(buffer,rate*Math.pow(2,shift/12),volume,pan,wait);};}
 scheduleHarmony(fx,t){const info=fx?.stageInfo?.();if(!info)return;if(this.musicStage!==fx.stage){this.musicStage=fx.stage;this.stageStartBar=Math.floor(this.step/16);for(const o of this.pads)if(o.ends>t){o.voiceGain.gain.cancelScheduledValues(t);o.voiceGain.gain.setTargetAtTime(0,t,.09);o.stop(Math.min(o.ends,t+.5));}this.pads=[];this.harmony.push({at:t,stage:fx.stage,shift:info.keyShift||0,prog:info.prog});if(this.harmony.length>8)this.harmony.shift();}else this.pads=this.pads.filter(o=>o.ends>t);this.prog=info.prog;this.phase=fx?.stagePhase?.()||0;}
 // Realtime: called every frame; keeps ~0.15 s scheduled ahead (1.2 s while the tab is hidden).
 tick(){const au=this.a.audio;this.filterResonance();if(this.bus&&this.ctx===au.ctx&&this.trackMuted!==!!au.loadedTrack)this.reset();const live=au?.ctx&&au.ctx.state==='running'&&!au.muted&&!au.loadedTrack&&au.music;
  if(!live){if(this.ctx&&au?.ctx===this.ctx)this.next=0;return;}
  if(this.ctx!==au.ctx)this.build(au.ctx,au.music);this.hookSnap(au);const now=this.ctx.currentTime;if(this.next<now)this.next=now+.05;
  const ex=this.exhaleUntil>now,ahead=document.hidden?1.2:.15;
  while(this.next<now+ahead){if(this.step%16===0)this.scheduleHarmony(this.a.fx,this.next);this.latch(this.targets(this.state()),this.next,ex);if(this.step%4===0){(this.beats=this.beats||[]).push({t:this.next,down:this.step%16===0});if(this.beats.length>32)this.beats.shift();}this.play(this.step,this.next,this.lv,this.key(this.next),this.a.fx?.flow||0);this.next+=60/this.bpm/4;this.step++;}}
 // Offline: schedule [0, seconds) from a state curve fn(t) -> {flow, laser, cascade}.
 render(ctx,seconds,fn,key=62){this.build(ctx,ctx.destination);this.step=0;this.hold=null;this.lvLog=[];const sp=60/this.bpm/4;for(let t=0;t<seconds;t+=sp){const s=fn(t),tg=this.targets(s);this.latch(tg,t,!!s.exhale);if(this.step%4===0)this.lvLog.push([+t.toFixed(2),...this.lv.map(v=>+v.toFixed(3)),+s.flow.toFixed(3)]);this.play(this.step++,t,this.lv,key,s.flow);}}
}
