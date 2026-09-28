/* Tront patch: Resonance FX (injected by tools/polish.py before SKY_GL_FS).
   A Tetris Effect style layer on top of ChatGPT's renderer. All of it is presentation: it reads match
   events and never touches board state, so co-op peers just see their own copy.
   - flow: 0..1.5, climbs with every clear and cascade, bleeds off slowly when the board is idle.
   - pulse: a hit on each clear, decays in about a second.
   - tint: the colour of the last cleared gem, eased.
   - swirl: phase of the background mote field; it spins faster while flow is up.
   Uniform slots nothing else reads: uForward.w = swirl, uAA.z = flow, uAA.w = pulse,
   uLife.w = tint packed as r*65536 + g*256 + b (exact in fp32).
   New particle kinds: 9 field mote (orbits forever), 10 velocity streak, 11 curling ember,
   12 ring with its own expansion speed (vel.x). */
// Journey stages (patch 8). Derived from the shared score, so co-op partners are always on the same stage.
// Stage k starts at 5000*k*(k+1)/2 points (5K, 15K, 30K, 50K...): every stage is a little longer than the last.
// tint = sky grade as a multiplier * 128 (128 = unchanged), packed into uUp.w. After stage 6 it loops 2..6.
const FX_STAGES=[{name:'DAWN SHALLOWS',tint:[128,128,128],bpm:84,prog:0},{name:'TIDEPOOL',tint:[76,168,196],bpm:92,prog:1},
 {name:'EMBER REEF',tint:[210,112,78],bpm:104,prog:2},{name:'AURORA DEEP',tint:[150,88,214],bpm:116,prog:3},
 {name:'STARFALL',tint:[70,96,204],bpm:96,prog:1},{name:'PRISM HEART',tint:[214,94,178],bpm:128,prog:2}];
const FX_STAGE_GL=`vec3 fxStage(vec3 c,vec2 uv){float p=uUp.w;if(p<1.0)return c;float r=floor(p/65536.0);float g=floor((p-r*65536.0)/256.0);float b=p-r*65536.0-g*256.0;vec3 m=vec3(r,g,b)/128.0;return c*m+max(m-1.0,vec3(0.0))*(0.05+0.09*exp(-abs(uv.y-0.44)*5.0));}`;
const FX_STAGE_WG=`fn fxStage(c:vec3f,uv:vec2f)->vec3f{let p=U.up.w;if(p<1.0){return c;}let r=floor(p/65536.0);let g=floor((p-r*65536.0)/256.0);let b=p-r*65536.0-g*256.0;let m=vec3f(r,g,b)/128.0;return c*m+max(m-1.0,vec3f(0.0))*(0.05+0.09*exp(-abs(uv.y-0.44)*5.0));}`;
const FX_FIELD=7000;
const FX_MILESTONES=[5000,10000,25000,50000,100000,250000,500000,1000000];
const FX_TINT_GL=`vec3 fxTint(float p){float r=floor(p/65536.0);float g=floor((p-r*65536.0)/256.0);float b=p-r*65536.0-g*256.0;return vec3(r,g,b)/255.0;}`;
const FX_TINT_WG=`fn fxTint(p:f32)->vec3f{let r=floor(p/65536.0);let g=floor((p-r*65536.0)/256.0);let b=p-r*65536.0-g*256.0;return vec3f(r,g,b)/255.0;}`;
const FX_LASER_GL=`vec3 fxLaser(vec2 uv,float aspect){float lz=min(uRight.w,1.5);if(lz<0.002)return vec3(0.0);float t=uParams.x;vec3 acc=vec3(0.0);vec2 P=uv*vec2(aspect,1.0);
 for(int i=0;i<12;i++){float fi=float(i);float side=i<6?-1.0:1.0;float k=mod(fi,6.0);vec2 o=vec2(0.5+side*(0.36+0.025*k),0.40)*vec2(aspect,1.0);
  float ang=1.5708+side*(-0.10-0.16*k)+sin(t*(0.9+0.21*k)+fi*1.7)*0.42;vec2 d=vec2(cos(ang),sin(ang));vec2 q=P-o;float al=dot(q,d);if(al<0.0)continue;
  float pe=abs(q.x*d.y-q.y*d.x);float w=0.0022+al*0.0035;float core=exp(-pe*pe/(w*w*0.3));float glow=exp(-pe*pe/(w*w*12.0))*0.45;
  vec3 col=0.55+0.45*cos(6.2831*(fi*0.137+t*0.18+vec3(0.0,0.33,0.67)));acc+=col*(core*1.4+glow)*exp(-al*0.55)*(0.75+0.25*sin(t*9.0+fi));}
 float haze=exp(-abs(uv.y-0.42)*9.0)*0.12;return (acc+vec3(haze))*lz;}`;
const FX_LASER_WG=`fn fxLaser(uv:vec2f,aspect:f32)->vec3f{let lz=min(U.right.w,1.5);if(lz<0.002){return vec3f(0.0);}let t=U.params.x;var acc=vec3f(0.0);let P=uv*vec2f(aspect,1.0);
 for(var i=0;i<12;i++){let fi=f32(i);let side=select(1.0,-1.0,i<6);let k=fi%6.0;let o=vec2f(0.5+side*(0.36+0.025*k),0.40)*vec2f(aspect,1.0);
  let ang=1.5708+side*(-0.10-0.16*k)+sin(t*(0.9+0.21*k)+fi*1.7)*0.42;let d=vec2f(cos(ang),sin(ang));let q=P-o;let al=dot(q,d);if(al<0.0){continue;}
  let pe=abs(q.x*d.y-q.y*d.x);let w=0.0022+al*0.0035;let core=exp(-pe*pe/(w*w*0.3));let glow=exp(-pe*pe/(w*w*12.0))*0.45;
  let col=0.55+0.45*cos(6.2831*(fi*0.137+t*0.18+vec3f(0.0,0.33,0.67)));acc+=col*(core*1.4+glow)*exp(-al*0.55)*(0.75+0.25*sin(t*9.0+fi));}
 let haze=exp(-abs(uv.y-0.42)*9.0)*0.12;return (acc+vec3f(haze))*lz;}`;
const FX_SKY_GL=`${FX_LASER_GL}vec3 fxSky(vec2 uv,float aspect){float fl=min(uAA.z,1.5);float pu=uAA.w;vec3 tc=fxTint(uLife.w);vec2 q=(uv-vec2(0.5,0.55))*vec2(aspect,1.0);float d=length(q);
 float hz=(uv.y-0.44)*6.5;float aur=exp(-hz*hz)*fl*(0.75+0.25*sin(uv.x*9.0+uForward.w*0.8));float rr=(1.0-min(pu,1.0))*1.35+0.05;float w=(d-rr)*6.0;float wave=exp(-w*w)*pu;
 return tc*(aur*0.045+wave*0.12)+vec3(0.9,0.95,1.0)*wave*0.03+fxLaser(uv,aspect);}`;
const FX_SKY_WG=`${FX_LASER_WG}fn fxSky(uv:vec2f,aspect:f32)->vec3f{let fl=min(U.aa.z,1.5);let pu=U.aa.w;let tc=fxTint(U.life.w);let q=(uv-vec2f(0.5,0.55))*vec2f(aspect,1.0);let d=length(q);
 let hz=(uv.y-0.44)*6.5;let aur=exp(-hz*hz)*fl*(0.75+0.25*sin(uv.x*9.0+U.forward.w*0.8));let rr=(1.0-min(pu,1.0))*1.35+0.05;let w=(d-rr)*6.0;let wave=exp(-w*w)*pu;
 return tc*(aur*0.045+wave*0.12)+vec3f(0.9,0.95,1.0)*wave*0.03+fxLaser(uv,aspect);}`;

class ResonanceFX {
 constructor(app){
  // The drop's stroke font has no '!'; milestones need one (same stroke + dot as its '?').
  if(typeof JEWEL_LETTERS==='object'&&!JEWEL_LETTERS['!'])JEWEL_LETTERS['!']=[.28,[[.14,0,.14,.68],[.14,.97,.14,1]]];
  this.a=app;this.flow=0;this.pulse=0;this.swirl=0;this.bass=0;this.stream=0;this.laser=0;this.stage=undefined;this.stTint=[128,128,128];this.bins=null;this.last=performance.now();
  this.tint=[.45,.82,1];this.target=this.tint.slice();this.stats={matches:0,fireworks:0,fountains:0};
  const q=new Geo();q.quad([-.5,-.5,0],[.5,-.5,0],[.5,.5,0],[-.5,.5,0],[1,1,1],0,[[0,0],[1,0],[1,1],[0,1]]);
  this.field=new ParticlePool(app.renderer,q.data(),FX_FIELD,true);const rng=new SeededRandom(5150);
  for(let i=0;i<FX_FIELD;i++){
   // A six-armed galaxy behind the cabinet, one arm per gem colour, plus a thin haze of strays so the arms
   // read as structure when the swirl spins up. Arms wind inward; spin falls off with radius.
   const arm=i%6,stray=rng.next()<.10,shell=rng.next(),rad=4.8+Math.pow(shell,.8)*17;
   const ang=stray?rng.next()*TAU:arm/6*TAU+rad*.30+(rng.next()-.5)*(.14+shell*.22),z=stray?-3-rng.next()*10:-4.2-shell*2.2-rng.next()*.8;
   const col=mixColor(GEM_COLORS[stray?(rng.next()*6)|0:arm],[.75,.88,1],stray?.55:.18+rng.next()*.2),spin=(.55+rng.next()*.1)*(1.25-shell*.55);
   this.field.emit([rad,ang,z],[spin,.10+rng.next()*.45,0],vmul(col,stray?.26:1.0+rng.next()*.6),(stray?.03:.035)+Math.pow(rng.next(),4)*(stray?.05:.13),-1,1e9,9,rng.next()*100,0);
  }
  this.field.flush();
 }
 get on(){return !!this.a.prefs.particles;}
 // Flashes setting (patch 10): full (default) 1, low .35, off 0. Scales the sky/rim flash, bloom swell and the drop's juice glow.
 get F(){const v=({full:1,low:.35,off:0})[this.a.prefs.flash||'full'];return v===undefined?1:v;}
 get j(){return (this.a.prefs.juice||100)/100;}
 pick(){return mixColor(GEM_COLORS[(Math.random()*6)|0],this.tint,.45);}
 frame(){
  const a=this.a,now=performance.now(),dt=Math.min(.1,Math.max(0,(now-this.last)/1000));this.last=now;
  const au=a.audio;let bass=0;
  if(au?.analyser&&au.ctx?.state==='running'&&!au.muted){if(!this.bins)this.bins=new Uint8Array(au.analyser.frequencyBinCount);au.analyser.getByteFrequencyData(this.bins);let s=0;for(let i=1;i<8;i++)s+=this.bins[i];bass=s/(7*255);}
  this.bass=bass>this.bass?mix(this.bass,bass,.6):this.bass*Math.exp(-dt*5);
  this.flow*=Math.exp(-dt*(a.phase==='idle'?.30:.06));this.pulse*=Math.exp(-dt*2.4);this.laser*=Math.exp(-dt*(a.phase==='idle'?.9:.12));this.stageTick(dt);this.resTick();
  const k=1-Math.exp(-dt*3.2);for(let i=0;i<3;i++)this.tint[i]=mix(this.tint[i],this.target[i],k);
  if(a.prefs.motion&&!a.frozen)this.swirl+=dt*(.05+this.flow*.55+this.bass*.45+this.pulse*.65);
  // Hot board: thin streams of light pour out of the vortex into the crown.
  if(this.on&&this.flow>.28&&!a.frozen&&!document.hidden){this.stream+=dt*(this.flow-.2)*50*this.j;
   while(this.stream>=1){this.stream--;const an=Math.random()*TAU,r=9+Math.random()*7;
    a.world.sparks.emit([Math.cos(an)*r,Math.sin(an)*r*.62,-3-Math.random()*5],[(Math.random()-.5)*.8,4.98,.25],vmul(this.pick(),.75),.05+Math.random()*.07,a.time,1.0+Math.random()*.7,3,Math.random()*100,0);}}
  // Falling gems leave light trails, thicker while flow is up; the selected gem sheds curling motes.
  if(this.on&&!a.frozen&&!document.hidden){const sp=a.world.sparks,t=a.time,p=Math.min(1,(.2+this.flow*.8)*dt*38*this.j);
   for(const act of a.actors.values()){const m=act.move;if(m?.type!=='fall'||t<m.start||Math.random()>p)continue;
    sp.emit([act.pos[0]+(Math.random()-.5)*.35,act.pos[1]+.25,.45],[(Math.random()-.5)*.25,.5+Math.random()*.5,0],vmul(mixColor(GEM_COLORS[act.tile.type],[1,1,1],.2),.6+this.flow*.5),.07+Math.random()*.04,t,.32+Math.random()*.2,10,Math.random()*100,0);}
   const sel=a.selected>=0?a.getActor(a.selected):null;
   if(sel&&a.phase==='idle'){this.orbit=(this.orbit||0)+dt*26;while(this.orbit>=1){this.orbit--;
    sp.emit([sel.pos[0],sel.pos[1]-.3,.75],[.55+Math.random()*.4,.42+Math.random()*.12,4+Math.random()*2],vmul(mixColor(GEM_COLORS[sel.tile.type],[1,.95,.85],.4),1.4),.16+Math.random()*.1,t,.9+Math.random()*.3,11,Math.random()*100,0);}}}
  this.milestones();
  this.field.mesh.count=a.prefs.quality<.9?Math.floor(FX_FIELD*.45):FX_FIELD;
 }
 // Light traces the board frame: two heads race opposite ways, each drawing the edge behind it.
 trace(col,t,speed=1){const sp=this.a.world.sparks,E=3.62,c=[[-E,E],[E,E],[E,-E],[-E,-E]],dur=.16/speed,bright=vmul(mixColor(col,[1,1,1],.35),1.4);
  for(const dir of [1,-1])for(let e=0;e<4;e++){const i0=dir>0?e:(6-e)%4,i1=dir>0?(e+1)%4:(5-e)%4,a0=[c[i0][0],c[i0][1],1.5],a1=[c[i1][0],c[i1][1],1.5],b=t+e*dur;
   sp.emit(a0,a1,vmul(bright,.7),.13,b,dur*2.6,7,e,0);
   for(let k=0;k<7;k++)sp.emit(a0,a1,vmul(bright,2.2-k*.25),.95-k*.11,b+k*.0045,dur,6,e*7+k,0);}
  for(const q of c){sp.emit([q[0],q[1],1.5],[0,0,0],bright,1.1,t+dur*4,.3,8,0,0);sp.emit([q[0],q[1],1.5],[0,0,0],vmul(bright,2),1.6,t+dur*4,.35,1,0,0);}}
 uniforms(u){
  const on=this.on?1:0,calm=(this.a.prefs.motion?1:.45)*this.F,flow=Math.min(1.5,this.flow*this.j+this.bass*.3)*on,pulse=Math.min(1.5,this.pulse*this.j)*on*calm;
  u[43]=this.swirl;u[46]=flow;u[47]=pulse;u[23]=Math.min(1.5,this.laser*this.j)*on*(this.a.prefs.motion?1:.5)*(.35+.65*this.F);u[29]*=.4+.6*this.F;const st=this.stTint.map(v=>clamp(Math.round(v),1,255));u[27]=st[0]*65536+st[1]*256+st[2];
  const c=this.tint.map(v=>clamp(Math.round(v*255),0,255));u[51]=c[0]*65536+c[1]*256+c[2];
  u[32]+=pulse*.02;u[33]+=flow*.06+pulse*.12;
 }
 info(){return {flow:+this.flow.toFixed(3),pulse:+this.pulse.toFixed(3),swirl:+this.swirl.toFixed(3),bass:+this.bass.toFixed(3),field:this.field.mesh.count,sparks:this.a.world.sparks.count,...this.stats};}
 // Called from explode() on the host, solo and co-op mirrors alike.
 match(center,type,cascade,count,mode,mag,removed){
  const a=this.a,special=mode==='prism'||mode==='blast',t=a.time,j=this.j;this.stats.matches++;this.tier(cascade);
  this.flow=Math.min(1.5,this.flow+.13+cascade*.055+count*.012+(special?.28:0));
  this.pulse=Math.min(1.5,this.pulse*.35+.5+cascade*.11+(special?.4:0));
  const gc=GEM_COLORS[type]||GEM_COLORS[5],m=Math.max(gc[0],gc[1],gc[2],1e-4);const n=gc.map(v=>v/m),l=(n[0]+n[1]+n[2])/3;this.target=n.map(v=>clamp(mix(l,v,2.2),.08,1));
  if(!this.on)return;const sp=a.world.sparks,col=gc,bright=mixColor(col,[1,1,1],.28);
  // Shockwaves: a tight one on the board, a wide one out in the world behind it.
  sp.emit([center[0],center[1],.62],[6+cascade*1.3,0,0],vmul(bright,.9),.45,t,.42,12,0,0);
  if(cascade>=2||special)sp.emit([center[0]*.5,center[1]*.5,-3.2],[17+cascade*2.2,0,0],vmul(bright,.3+Math.min(cascade,6)*.05),1,t,1.1,12,0,0);
  // Line sweep: streaks rip along the axis of the matched line, both ways.
  const pts=removed.map(r=>cellXY(r.at));const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
  const horiz=Math.max(...xs)-Math.min(...xs)>=Math.max(...ys)-Math.min(...ys);
  pts.slice(0,28).forEach((p,i)=>{const gcol=GEM_COLORS[removed[i].tile.type]||col;
   for(let k=0;k<Math.round(7*j);k++){const s=(k&1?1:-1)*(3.5+Math.random()*9),jit=(Math.random()-.5)*1.6;
    const v=horiz?[s,jit,Math.random()*1.4]:[jit,s,Math.random()*1.4];
    sp.emit([p[0],p[1],.72],v,vmul(mixColor(gcol,[1,1,1],.2),1.1+Math.random()*.9),.05+Math.random()*.06,t+Math.random()*.03,.45+Math.random()*.5,10,Math.random()*100,0);}
   // Embers curl upward and linger after the flash.
   for(let k=0;k<Math.round(4*j);k++)sp.emit([p[0]+(Math.random()-.5)*.5,p[1]+(Math.random()-.5)*.5,.8],[.5+Math.random()*1.1,.12+Math.random()*.32,3+Math.random()*4],vmul(mixColor(gcol,[1,.95,.8],.35),1.3+Math.random()),.2+Math.random()*.16,t+.05+Math.random()*.25,1.3+Math.random()*1.4,11,Math.random()*100,0);
  });
  if(cascade>=2||special)this.trace(special?mixColor(col,[1,.85,.5],.3):col,t,1+Math.min(cascade,6)*.12);
  if(mode==='blast')this.nova(center,180*j,[GEM_COLORS[4],color('#ffd58f'),col],t);
  if(mode==='prism'||cascade>=5)this.nova(center,Math.min(900,260+cascade*90)*j,GEM_COLORS,t);
  // Fireworks around the cabinet once a cascade gets going.
  if(cascade>=3){const n=Math.min(cascade-2,5);for(let b=0;b<n;b++){const side=(b+cascade)&1?1:-1;
   this.firework([side*(5.4+Math.random()*3.2),-3.2+Math.random()*7.5,-.6+Math.random()*1.1],GEM_COLORS[(type+b+cascade)%6],t+b*.11+Math.random()*.05,1+cascade*.08);}}
 }
 nova(c,n,cols,t){const sp=this.a.world.sparks;for(let i=0;i<n;i++){const an=Math.random()*TAU,s=2.5+Math.random()*9,sw=.55*(Math.random()<.5?1:-1);
   sp.emit([c[0],c[1],.8],[Math.cos(an)*s-Math.sin(an)*s*sw,Math.sin(an)*s+Math.cos(an)*s*sw,Math.random()*3],vmul(mixColor(cols[i%cols.length],[1,1,1],.2),1.2+Math.random()*1.1),.05+Math.random()*.08,t+Math.random()*.06,.55+Math.random()*.8,i%3?1:10,Math.random()*100,-1.2);}}
 firework(p,col,t,power=1){const sp=this.a.world.sparks,j=this.j;this.stats.fireworks++;
  const n=Math.round(95*j*power),bright=mixColor(col,[1,1,1],.3);
  for(let i=0;i<n;i++){const u=Math.random()*2-1,an=Math.random()*TAU,r=Math.sqrt(1-u*u),s=2.6+Math.random()*2.4;
   sp.emit(p,[Math.cos(an)*r*s,Math.sin(an)*r*s,u*s*.6],vmul(i%4?bright:[1,.96,.88],1.2+Math.random()*1.2),.04+Math.random()*.07,t,.8+Math.random()*.9,i%3?1:10,Math.random()*100,-1.8);}
  sp.emit(p,[9,0,0],vmul(bright,.8),.3,t,.5,12,0,0);sp.emit(p,[0,0,0],vmul(bright,1.1),1.6,t,.22,8,0,0);
 }
 finish(cascade){if(cascade<3)return;const a=this.a,t=a.time,j=this.j;this.flow=Math.min(1.5,this.flow+.2);this.pulse=Math.min(1.5,this.pulse+.55);if(!this.on)return;this.stats.fountains++;
  const sp=a.world.sparks;this.fountain(Math.round(Math.min(1100,120*cascade)*j),t);
  if(cascade>=6)for(let k=0;k<6;k++)sp.emit([0,0,-3.4],[13+k*2.4,0,0],vmul(mixColor(GEM_COLORS[k],[1,1,1],.2),.8),1,t+k*.09,1.4,12,0,0);
 }
 fountain(n,t){const sp=this.a.world.sparks;
  for(let i=0;i<n;i++)sp.emit([(Math.random()-.5)*.7,4.95,.45],[(Math.random()-.5)*7.5,3+Math.random()*5.5,Math.random()*2.2+.3],vmul(mixColor(GEM_COLORS[i%6],[1,1,1],.25),1.1+Math.random()*1.1),.045+Math.random()*.075,t+Math.random()*.35,1.3+Math.random()*1.1,i%4?1:10,Math.random()*100,-5.2);
 }
 // Score milestones. Crossing one throws the biggest show in the game.
 // Milestones already behind you when you join or load are skipped; a new board starts the list again.
 milestones(){const a=this.a,s=a.board?.score||0;
  if(this.ms===undefined||s<this.msScore){this.ms=FX_MILESTONES.filter(v=>v<=s).length;}this.msScore=s;
  if(a.practice)return;const next=this.ms<FX_MILESTONES.length?FX_MILESTONES[this.ms]:(Math.floor(s/1e6)+1)*1e6;
  if(s>=next){this.ms++;this.celebrate(next);}}
 celebrate(v){const a=this.a,t=a.time,j=this.j,over=v===10000;this.stats.milestones=(this.stats.milestones||0)+1;
  const label=v>=1e6?(v/1e6)+' MILLION!':(v/1000)+'K!';
  this.flow=1.5;this.pulse=1.5;this.target=over?[1,.42,.08]:[1,.82,.36];this.lastMilestone={v,label,time:t};
  a.toast(label+' '+(a.coop?.connected?'Team score ':'Score ')+Math.floor(a.board.score).toLocaleString('en-US'));
  if(a.ui)a.ui.floats.push({text:label,pos:[0,1.35,1.3],special:true,size:over?50:46,col:over?'#ffb347':UI_ART.highlight,life:2.6,birth:t});
  try{a.audio.resolve(8);a.audio.detonate('prism',6,0);}catch{}
  a.shake=Math.max(a.shake,.55);if(!this.on)return;const sp=a.world.sparks;
  for(let k=0;k<6;k++)sp.emit([0,0,-3.4],[11+k*2.8,0,0],vmul(mixColor(GEM_COLORS[k],[1,1,1],.2),.95),1,t+k*.08,1.6,12,0,0);
  for(let b=0;b<(over?14:10);b++){const side=b&1?1:-1;this.firework([side*(5+Math.random()*3.8),-3.6+Math.random()*8.2,-.8+Math.random()*1.3],GEM_COLORS[b%6],t+b*.1+Math.random()*.05,1.35);}
  this.nova([0,0,0],Math.round(1000*j),over?[[1,.5,.1],[1,.8,.2],[1,.3,.1]]:GEM_COLORS,t);this.fountain(Math.round(1200*j),t+.15);
  this.trace(over?[1,.5,.1]:[1,.8,.35],t,.8);this.trace(over?[1,.8,.2]:[.4,.9,1],t+.45,1.1);}
 swap(pa,pb){if(!this.on)return;const sp=this.a.world.sparks,t=this.a.time,d=[pb[0]-pa[0],pb[1]-pa[1]];
  for(let i=0;i<10;i++){const from=i&1?pa:pb,s=(i&1?1:-1)*(1.5+Math.random()*2.5);sp.emit([from[0],from[1],.75],[d[0]*s+(Math.random()-.5)*.6,d[1]*s+(Math.random()-.5)*.6,.4],vmul([1,.93,.78],.9),.035,t+Math.random()*.08,.28+Math.random()*.15,10,Math.random()*100,0);}}
 // Invalid swap turnaround: both gems pressed into the wrong cell kick dust off their leading edges.
 bump(pa,pb){if(!this.on)return;const sp=this.a.world.sparks,t=this.a.time,j=this.j,dx=pb[0]-pa[0],dy=pb[1]-pa[1],L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L;
  for(const [p,s] of [[pb,1],[pa,-1]]){const e=[p[0]+ux*s*.44,p[1]+uy*s*.44,.62];
   for(let i=0;i<Math.round(22*j);i++){const side=(i&1?1:-1)*(.6+Math.random()*2.2),fw=(Math.random()*.8+.2)*s;sp.emit([e[0]+(Math.random()-.5)*.1,e[1]+(Math.random()-.5)*.1,e[2]],[-uy*side+ux*fw*.7,ux*side+uy*fw*.7,.3+Math.random()*.8],vmul([.9,.92,1],.8+Math.random()*.5),.34+Math.random()*.3,t,.28+Math.random()*.22,1,Math.random()*100,-1.5);}}}
 stageAt(s){let k=0;while(k<60&&5000*(k+1)*(k+2)/2<=s)k++;return k;}
 stageInfo(k=this.stage||0){const s=FX_STAGES[k<6?k:1+((k-6)%5)];return {...s,n:k+1,loop:k>=6,start:k?5000*k*(k+1)/2:0,end:5000*(k+1)*(k+2)/2};}
 stageTick(dt){const a=this.a,k=this.stageAt(a.board?.score||0);
  if(this.stage===undefined||k<this.stage){this.stage=k;this.stTint=this.stageInfo(k).tint.slice();}
  else if(k>this.stage){this.stage=k;if(!a.practice)this.stageShow(k);}
  const tg=this.stageInfo(this.stage).tint,e=1-Math.exp(-dt*.7);for(let i=0;i<3;i++)this.stTint[i]=mix(this.stTint[i],tg[i],e);}
 stageShow(k){const a=this.a,t=a.time,info=this.stageInfo(k);this.stats.stages=(this.stats.stages||0)+1;this.flow=Math.max(this.flow,1.1);this.pulse=1.5;this.laser=Math.max(this.laser,1.2);
  const col=info.tint.map(v=>clamp(v/160,.25,1));this.target=col;a.ui?.stageCallout?.(info);a.rumble?.(1,1,480);
  if(!this.on)return;const sp=a.world.sparks;for(let r=0;r<3;r++)sp.emit([0,0,-2.5-r],[14+r*6,0,0],vmul(col,.6),1,t+r*.18,1.4,12,0,0);
  for(let b=0;b<8;b++){const side=b&1?1:-1;this.firework([side*(5+Math.random()*3.5),-3+Math.random()*7,-.8+Math.random()*1.2],GEM_COLORS[b%6],t+.2+b*.12,1.2);}
  this.trace(col,t,.9);}
 // Resonance (patch 11), Tetris Effect Zone style. Every cleared gem charges one shared meter: in co-op both players'
 // clears count, tallied from the same explode events on every screen, so partners see the same meter. Full = an 8 s
 // concert (lasers, max flow, every clear rings a chord, light chases the frame), ending in a payout show.
 resCap(){return 60+Math.min(this.stage||0,8)*12;}
 resonate(removed,owner){const a=this.a,n=removed?removed.length:0;if(!n||a.practice)return;const R=this.res||(this.res={fill:0,mine:0,theirs:0,on:false,until:0,count:0});
  if(R.on){R.count+=n;this.sting(Math.min(9,3+Math.floor(R.count/10)));this.laser=Math.max(this.laser,1.4);this.pulse=Math.min(1.5,this.pulse+.4);return;}
  R.fill+=n;if(owner==='partner')R.theirs+=n;else R.mine+=n;if(R.fill>=this.resCap())this.resStart();}
 resStart(){const a=this.a,R=this.res,t=a.time;R.on=true;R.start=t;R.until=t+8;R.count=0;R.team=R.theirs>=R.fill*.2&&R.mine>=R.fill*.2;this.stats.resonances=(this.stats.resonances||0)+1;
  this.flow=1.5;this.pulse=1.5;this.laser=1.5;a.ui?.resCallout?.(R.team?'TEAM RESONANCE':'RESONANCE');a.rumble?.(1,1,600);
  if(this.on){const sp=a.world.sparks;for(let r=0;r<4;r++)sp.emit([0,0,-2-r],[16+r*5,0,0],[1,.85,.45],1,t+r*.12,1.5,12,0,0);this.nova([0,0,0],Math.round(900*this.j),GEM_COLORS,t);}}
 resTick(){const a=this.a,s=a.board?.score||0;if(s<(this.resScore||0))this.res=null;this.resScore=s;const R=this.res;if(!R||!R.on)return;const t=a.time;
  this.flow=Math.max(this.flow,1.25);this.laser=Math.max(this.laser,1.15);
  if(this.on&&(!R.lastTrace||t-R.lastTrace>.55)){R.lastTrace=t;this.trace([1,.85,.45],t,1.3);}
  if(t>=R.until){R.on=false;R.fill=0;R.mine=0;R.theirs=0;a.ui?.resPayout?.(R.count,R.team);a.rumble?.(1,.8,500);
   if(this.on){for(let b=0;b<12;b++){const side=b&1?1:-1;this.firework([side*(5+Math.random()*3.8),-3.6+Math.random()*8.2,-.8+Math.random()*1.3],GEM_COLORS[b%6],t+b*.08,1.4);}this.fountain(Math.round(900*this.j),t+.1);}}}
 // Combo ladder (patch 6). Every tier keeps everything below it and ADDS a new kind of response:
 // x3 a centre-stage callout + chord sting, x4 a bigger callout + sub boom, x5+ nightclub lasers in the sky,
 // speed lines and a flash (the callout and burst are drawn by CabinetUI).
 tier(c){if(c<3)return;const a=this.a;this.stats.tiers=(this.stats.tiers||0)+1;
  if(c>=5)this.laser=Math.min(1.5,Math.max(this.laser,.8)+.25+(c-5)*.1);a.ui?.callout?.(c);this.sting(c);}
 sting(c){const au=this.a.audio;if(!au?.ctx||au.muted||au.ctx.state!=='running'||!au.sfx)return;const x=au.ctx,t=x.currentTime+.01+(this.a.music?.snapWait?.(.01)||0),j=Math.min(1.3,this.j);
  const root=196*Math.pow(2,Math.min(c-3,9)*2/12),notes=[1,1.25,1.5,2,2.5,3].slice(0,Math.min(6,c));
  const lp=x.createBiquadFilter();lp.type='lowpass';lp.Q.value=5;lp.frequency.setValueAtTime(700,t);lp.frequency.exponentialRampToValueAtTime(7000,t+.35);const g=x.createGain();g.gain.value=.5*j;lp.connect(g);g.connect(au.sfx);
  notes.forEach((m,i)=>{for(const [type,det,v] of [['sawtooth',-7,.04],['sawtooth',7,.04],['triangle',0,.06]]){const o=x.createOscillator(),e=x.createGain();o.type=type;o.frequency.value=root*m;o.detune.value=det;const s=t+i*.055;
   e.gain.setValueAtTime(0,s);e.gain.linearRampToValueAtTime(v,s+.012);e.gain.exponentialRampToValueAtTime(.0005,s+.55+c*.04);o.connect(e);e.connect(lp);o.start(s);o.stop(s+.7+c*.04);}});
  if(c>=4){const o=x.createOscillator(),e=x.createGain();o.type='sine';o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(38,t+.4);e.gain.setValueAtTime(.32*j,t);e.gain.exponentialRampToValueAtTime(.001,t+.55);o.connect(e);e.connect(au.sfx);o.start(t);o.stop(t+.6);}
  setTimeout(()=>{try{lp.disconnect();g.disconnect();}catch{}},3000);}
 land(to,type,dist){if(!this.on||dist<1.8||Math.random()<.35)return;const sp=this.a.world.sparks,t=this.a.time,c=vmul(GEM_COLORS[type],.7);
  for(let i=0;i<3;i++){const s=(i-1)*1.3+(Math.random()-.5)*.6;sp.emit([to[0]+s*.12,to[1]-.38,.55],[s,.25+Math.random()*.4,.3],c,.035,t,.28,1,Math.random()*100,-2);}}
}
