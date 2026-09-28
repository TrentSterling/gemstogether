/* Tront patch 7: Resonance music (injected by tools/polish.py right after resonance.js).
   A generative, sample-free soundtrack on the drop's music bus (so the Music volume slider controls it).
   It plays in the player's Gem tones key (natural minor) and layers in with play, Tetris Effect style:
     pad     always, one chord per 2 bars (i VI III VII, then i iv VI VII)
     bass    once the board warms up (flow)
     arp     16ths up in the chord, through a tempo-synced echo, once flow is up
     drums   kick, hats and clap when the board is hot or a chain reaches x4
     lead    a pentatonic phrase while the x5+ sky lasers are on
   Loading your own track (Settings > Sound) silences it; removing the track brings it back.
   The same scheduler renders offline (OfflineAudioContext) for receipts: tools/music-render.mjs. */
// One pair of 8-bar progressions per stage family (patch 8); the pair alternates every 8 bars.
const MUSIC_PROGS=[[[[0,3,7],[8,12,15],[3,7,10],[10,14,17]],[[0,3,7],[5,8,12],[8,12,15],[10,14,17]]],
 [[[0,3,7],[10,14,17],[8,12,15],[10,14,17]],[[0,3,7],[7,10,14],[8,12,15],[5,8,12]]],
 [[[0,3,7],[5,9,12],[0,3,7],[10,14,17]],[[8,12,15],[5,9,12],[3,7,10],[10,14,17]]],
 [[[8,12,15],[10,14,17],[0,3,7],[0,3,7]],[[5,8,12],[8,12,15],[10,14,17],[7,10,14]]]];
const MUSIC_PENTA=[0,3,5,7,10,12,15,17];
class ResonanceMusic {
 constructor(app){this.a=app;this.bpm=84;this.step=0;this.next=0;this.ctx=null;this.lv=[0,0,0,0,0];this.stats={notes:0};}
 hz(m){return 440*Math.pow(2,(m-69)/12);}
 // Layer targets from the game state: pad, bass, arp, drums, lead.
 targets(s){if(s.res)return [1,1,1,1,1];if(this.a.gameOver)return [.7,0,0,0,0];const f=s.flow,c=s.cascade;return [.9,clamp((f-.10)*3,0,1),clamp((f-.32)*2.4,0,1),Math.max(clamp((f-.62)*2.2,0,1),c>=4?1:0),s.laser>.3?1:0];}
 state(){const fx=this.a.fx;return {flow:fx?fx.flow:0,laser:fx?fx.laser:0,cascade:this.a.phase==='idle'?0:this.a.cascade,res:!!(fx&&fx.res&&fx.res.on)};}
 build(ctx,dest){
  this.ctx=ctx;this.bus=ctx.createGain();this.bus.gain.value=1.4;this.bus.connect(dest);
  const d=this.delay=ctx.createDelay(1.5),fb=ctx.createGain(),lp=ctx.createBiquadFilter();d.delayTime.value=60/this.bpm*.75;fb.gain.value=.38;lp.type='lowpass';lp.frequency.value=2600;
  this.echo=ctx.createGain();this.echo.gain.value=1;this.echo.connect(d);d.connect(lp);lp.connect(fb);fb.connect(d);lp.connect(this.bus);
  const n=ctx.sampleRate,buf=ctx.createBuffer(1,n,ctx.sampleRate),x=buf.getChannelData(0);let s=12345;for(let i=0;i<n;i++){s=(s*1103515245+12345)>>>0;x[i]=s/2147483648-1;}this.noise=buf;
 }
 env(g,t,a,peak,hold,rel){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);if(hold>0)g.gain.setValueAtTime(peak,t+a+hold);g.gain.exponentialRampToValueAtTime(.0001,t+a+hold+rel);}
 osc(type,f,t,dur,peak,a,rel,out,det=0){const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=f;o.detune.value=det;this.env(g,t,a,peak,Math.max(0,dur-a),rel);o.connect(g);g.connect(out);o.start(t);o.stop(t+dur+rel+.05);this.stats.notes++;return o;}
 hit(t,fq,type,q,peak,rel,out){const c=this.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noise;f.type=type;f.frequency.value=fq;f.Q.value=q;this.env(g,t,.002,peak,0,rel);s.connect(f);f.connect(g);g.connect(out);s.start(t,Math.random()*.5);s.stop(t+rel+.05);}
 // One 16th step at time t with layer levels lv.
 play(i,t,lv,key,flow){
  const c=this.ctx,sp=60/this.bpm/4,bar=Math.floor(i/16),beat=i%16,prog=MUSIC_PROGS[this.prog||0][Math.floor(bar/8)%2],chord=prog[Math.floor(bar/2)%4],root=key-12;
  if(lv[0]>.02&&beat===0&&bar%2===0){const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=500+Math.min(flow,1.2)*1600;lp.Q.value=.7;lp.connect(this.bus);const len=sp*32;
   for(const n of chord)for(const det of [-9,9]){this.osc('sawtooth',this.hz(root+n),t,len,.022*lv[0],1.1,1.6,lp,det);}this.osc('triangle',this.hz(root+chord[0]-12),t,len,.05*lv[0],1.1,1.6,lp);}
  if(lv[1]>.02&&(beat===0||beat===8||(flow>.8&&(beat===6||beat===14)))){const o=this.osc('triangle',this.hz(root-12+chord[0]),t,sp*3,.2*lv[1],.008,.25,this.bus);o.frequency.setValueAtTime(this.hz(root-12+chord[0]),t);}
  if(lv[2]>.02){const seq=[0,1,2,1,0,1,2,3],tones=[chord[0],chord[1],chord[2],chord[0]+12],m=root+12+tones[seq[(i>>(flow>.9?0:1))%8]%tones.length];if(flow>.9||beat%2===0){this.osc('triangle',this.hz(m),t,sp*.7,.05*lv[2],.004,.22,this.echo);this.osc('sine',this.hz(m+12),t,sp*.5,.02*lv[2],.004,.15,this.bus);}}
  if(lv[3]>.02){const four=lv[3]>.8;if(beat===0||beat===8||(four&&(beat===4||beat===12))){const o=this.osc('sine',150,t,.02,.55*lv[3],.002,.32,this.bus);o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.3);}
   if(beat%4===2)this.hit(t,8000,'highpass',.7,.10*lv[3],.05,this.bus);if(four&&beat%2===1)this.hit(t,9500,'highpass',.7,.04*lv[3],.03,this.bus);if(beat===4||beat===12)this.hit(t,1500,'bandpass',.9,.22*lv[3],.16,this.bus);}
  if(lv[4]>.02&&beat%2===0){const ph=[0,2,4,5,7,5,4,2,3,4,6,7,5,4,2,1],k=ph[(i>>1)%16],m=key+12+MUSIC_PENTA[k%MUSIC_PENTA.length];if((i>>1)%4!==3){const o=this.osc('square',this.hz(m),t,sp*1.6,.028*lv[4],.01,.3,this.echo);const v=c.createOscillator(),vg=c.createGain();v.frequency.value=5.5;vg.gain.value=9;v.connect(vg);vg.connect(o.detune);v.start(t);v.stop(t+sp*2+.4);}}
 }
 // Beat snap (patch 12): result sounds wait for the next 1/32 of the music grid (always < 90 ms at 84 BPM, less when
 // faster), so clears land in time with the soundtrack. Swaps, clicks and the reject buzz are never delayed.
 snapWait(d=0){const c=this.ctx,au=this.a.audio;if(!c||!au||au.ctx!==c||!this.next||au.loadedTrack||au.muted)return 0;const g=60/this.bpm/8,now=c.currentTime+d;return ((this.next-now)%g+g)%g;}
 hookSnap(au){if(au.snapHooked)return;au.snapHooked=true;const B=au.buffers||{},set=new Set();for(const [k,v] of Object.entries(B))if(!['tick','whoosh','reject','land'].includes(k))for(const b of [].concat(v))set.add(b);
  const play=au.play.bind(au);au.play=(buffer,rate,volume,pan,delay=0)=>play(buffer,rate,volume,pan,delay+(set.has(buffer)?this.snapWait(delay):0));}
 // Realtime: called every frame; keeps ~0.15 s scheduled ahead (1.2 s while the tab is hidden).
 tick(){const au=this.a.audio;const live=au?.ctx&&au.ctx.state==='running'&&!au.muted&&!au.loadedTrack&&au.music;
  if(!live){if(this.ctx&&au?.ctx===this.ctx)this.next=0;return;}
  if(this.ctx!==au.ctx)this.build(au.ctx,au.music);this.hookSnap(au);const now=this.ctx.currentTime;if(this.next<now)this.next=now+.05;
  const info=this.a.fx?.stageInfo?.();if(info){this.prog=info.prog;if(info.bpm!==this.bpm){this.bpm=info.bpm;this.delay.delayTime.setTargetAtTime(60/this.bpm*.75,now,.1);}}
  const tg=this.targets(this.state()),ahead=document.hidden?1.2:.15;
  while(this.next<now+ahead){for(let k=0;k<5;k++)this.lv[k]=mix(this.lv[k],tg[k],k===3?.35:.08);this.play(this.step,this.next,this.lv,au.key||62,this.a.fx?.flow||0);this.next+=60/this.bpm/4;this.step++;}}
 // Offline: schedule [0, seconds) from a state curve fn(t) -> {flow, laser, cascade}.
 render(ctx,seconds,fn,key=62){this.build(ctx,ctx.destination);this.step=0;const sp=60/this.bpm/4;for(let t=0;t<seconds;t+=sp){const s=fn(t),tg=this.targets(s);for(let k=0;k<5;k++)this.lv[k]=mix(this.lv[k],tg[k],k===3?.35:.08);this.play(this.step++,t,this.lv,key,s.flow);}}
}
