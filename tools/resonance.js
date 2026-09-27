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
const FX_FIELD=7000;
const FX_TINT_GL=`vec3 fxTint(float p){float r=floor(p/65536.0);float g=floor((p-r*65536.0)/256.0);float b=p-r*65536.0-g*256.0;return vec3(r,g,b)/255.0;}`;
const FX_TINT_WG=`fn fxTint(p:f32)->vec3f{let r=floor(p/65536.0);let g=floor((p-r*65536.0)/256.0);let b=p-r*65536.0-g*256.0;return vec3f(r,g,b)/255.0;}`;
const FX_SKY_GL=`vec3 fxSky(vec2 uv,float aspect){float fl=min(uAA.z,1.5);float pu=uAA.w;vec3 tc=fxTint(uLife.w);vec2 q=(uv-vec2(0.5,0.55))*vec2(aspect,1.0);float d=length(q);
 float hz=(uv.y-0.44)*6.5;float aur=exp(-hz*hz)*fl*(0.75+0.25*sin(uv.x*9.0+uForward.w*0.8));float rr=(1.0-min(pu,1.0))*1.35+0.05;float w=(d-rr)*6.0;float wave=exp(-w*w)*pu;
 return tc*(aur*0.045+wave*0.12)+vec3(0.9,0.95,1.0)*wave*0.03;}`;
const FX_SKY_WG=`fn fxSky(uv:vec2f,aspect:f32)->vec3f{let fl=min(U.aa.z,1.5);let pu=U.aa.w;let tc=fxTint(U.life.w);let q=(uv-vec2f(0.5,0.55))*vec2f(aspect,1.0);let d=length(q);
 let hz=(uv.y-0.44)*6.5;let aur=exp(-hz*hz)*fl*(0.75+0.25*sin(uv.x*9.0+U.forward.w*0.8));let rr=(1.0-min(pu,1.0))*1.35+0.05;let w=(d-rr)*6.0;let wave=exp(-w*w)*pu;
 return tc*(aur*0.045+wave*0.12)+vec3f(0.9,0.95,1.0)*wave*0.03;}`;

class ResonanceFX {
 constructor(app){
  this.a=app;this.flow=0;this.pulse=0;this.swirl=0;this.bass=0;this.stream=0;this.bins=null;this.last=performance.now();
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
 get j(){return (this.a.prefs.juice||100)/100;}
 pick(){return mixColor(GEM_COLORS[(Math.random()*6)|0],this.tint,.45);}
 frame(){
  const a=this.a,now=performance.now(),dt=Math.min(.1,Math.max(0,(now-this.last)/1000));this.last=now;
  const au=a.audio;let bass=0;
  if(au?.analyser&&au.ctx?.state==='running'&&!au.muted){if(!this.bins)this.bins=new Uint8Array(au.analyser.frequencyBinCount);au.analyser.getByteFrequencyData(this.bins);let s=0;for(let i=1;i<8;i++)s+=this.bins[i];bass=s/(7*255);}
  this.bass=bass>this.bass?mix(this.bass,bass,.6):this.bass*Math.exp(-dt*5);
  this.flow*=Math.exp(-dt*(a.phase==='idle'?.30:.06));this.pulse*=Math.exp(-dt*2.4);
  const k=1-Math.exp(-dt*3.2);for(let i=0;i<3;i++)this.tint[i]=mix(this.tint[i],this.target[i],k);
  if(a.prefs.motion&&!a.frozen)this.swirl+=dt*(.05+this.flow*.55+this.bass*.45+this.pulse*.65);
  // Hot board: thin streams of light pour out of the vortex into the crown.
  if(this.on&&this.flow>.28&&!a.frozen&&!document.hidden){this.stream+=dt*(this.flow-.2)*50*this.j;
   while(this.stream>=1){this.stream--;const an=Math.random()*TAU,r=9+Math.random()*7;
    a.world.sparks.emit([Math.cos(an)*r,Math.sin(an)*r*.62,-3-Math.random()*5],[(Math.random()-.5)*.8,4.98,.25],vmul(this.pick(),.75),.05+Math.random()*.07,a.time,1.0+Math.random()*.7,3,Math.random()*100,0);}}
  this.field.mesh.count=a.prefs.quality<.9?Math.floor(FX_FIELD*.45):FX_FIELD;
 }
 uniforms(u){
  const on=this.on?1:0,calm=this.a.prefs.motion?1:.45,flow=Math.min(1.5,this.flow*this.j+this.bass*.3)*on,pulse=Math.min(1.5,this.pulse*this.j)*on*calm;
  u[43]=this.swirl;u[46]=flow;u[47]=pulse;
  const c=this.tint.map(v=>clamp(Math.round(v*255),0,255));u[51]=c[0]*65536+c[1]*256+c[2];
  u[32]+=pulse*.02;u[33]+=flow*.06+pulse*.12;
 }
 info(){return {flow:+this.flow.toFixed(3),pulse:+this.pulse.toFixed(3),swirl:+this.swirl.toFixed(3),bass:+this.bass.toFixed(3),field:this.field.mesh.count,sparks:this.a.world.sparks.count,...this.stats};}
 // Called from explode() on the host, solo and co-op mirrors alike.
 match(center,type,cascade,count,mode,mag,removed){
  const a=this.a,special=mode==='prism'||mode==='blast',t=a.time,j=this.j;this.stats.matches++;
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
   for(let k=0;k<Math.round(4*j);k++)sp.emit([p[0]+(Math.random()-.5)*.5,p[1]+(Math.random()-.5)*.5,.8],[.5+Math.random()*1.1,.12+Math.random()*.32,3+Math.random()*4],vmul(mixColor(gcol,[1,.95,.8],.35),1.3+Math.random()),.035+Math.random()*.05,t+.05+Math.random()*.25,1.3+Math.random()*1.4,11,Math.random()*100,0);
  });
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
  const sp=a.world.sparks,n=Math.round(Math.min(1100,120*cascade)*j);
  for(let i=0;i<n;i++)sp.emit([(Math.random()-.5)*.7,4.95,.45],[(Math.random()-.5)*7.5,3+Math.random()*5.5,Math.random()*2.2+.3],vmul(mixColor(GEM_COLORS[i%6],[1,1,1],.25),1.1+Math.random()*1.1),.045+Math.random()*.075,t+Math.random()*.35,1.3+Math.random()*1.1,i%4?1:10,Math.random()*100,-5.2);
  if(cascade>=6)for(let k=0;k<6;k++)sp.emit([0,0,-3.4],[13+k*2.4,0,0],vmul(mixColor(GEM_COLORS[k],[1,1,1],.2),.8),1,t+k*.09,1.4,12,0,0);
 }
 swap(pa,pb){if(!this.on)return;const sp=this.a.world.sparks,t=this.a.time,d=[pb[0]-pa[0],pb[1]-pa[1]];
  for(let i=0;i<10;i++){const from=i&1?pa:pb,s=(i&1?1:-1)*(1.5+Math.random()*2.5);sp.emit([from[0],from[1],.75],[d[0]*s+(Math.random()-.5)*.6,d[1]*s+(Math.random()-.5)*.6,.4],vmul([1,.93,.78],.9),.035,t+Math.random()*.08,.28+Math.random()*.15,10,Math.random()*100,0);}}
 land(to,type,dist){if(!this.on||dist<1.8||Math.random()<.35)return;const sp=this.a.world.sparks,t=this.a.time,c=vmul(GEM_COLORS[type],.7);
  for(let i=0;i<3;i++){const s=(i-1)*1.3+(Math.random()-.5)*.6;sp.emit([to[0]+s*.12,to[1]-.38,.55],[s,.25+Math.random()*.4,.3],c,.035,t,.28,1,Math.random()*100,-2);}}
}
