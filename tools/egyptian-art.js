/* Egyptian cabinet and earned visual payoffs. Geometry and local presentation only.
   No random numbers, input, audio, score, save or transport writes. */
const EGYPT_ART={gold:color('#d2a64b'),edge:color('#f3d895'),lapis:color('#183d76'),deep:color('#0b203d'),turquoise:color('#35b9b1'),ink:color('#061625')};

function egyptRelief(g,outline,z,depth,col,kind=1){
 const p=outline.slice();let area=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];area+=p[i][0]*q[1]-q[0]*p[i][1];}if(area<0)p.reverse();
 const center=p.reduce((a,v)=>[a[0]+v[0]/p.length,a[1]+v[1]/p.length],[0,0]);
 for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];g.tri([center[0],center[1],z+depth],[a[0],a[1],z],[b[0],b[1],z],col,kind);g.quad([a[0],a[1],z-depth],[b[0],b[1],z-depth],[b[0],b[1],z],[a[0],a[1],z],col,kind);}return g;
}
function egyptAnkh(g,x,y,z,s,col,kind=1){
 const loop=[];for(let i=0;i<=20;i++){const a=i/20*TAU;loop.push([x+Math.cos(a)*s*.20,y+s*.20+Math.sin(a)*s*.27,z]);}
 g.tube(loop,s*.043,col,kind,5);g.tube([[x,y-s*.08,z],[x,y-s*.62,z]],s*.044,col,kind,5);g.tube([[x-s*.28,y-s*.14,z],[x+s*.28,y-s*.14,z]],s*.044,col,kind,5);
}
function egyptLotus(g,x,y,z,s){
 for(let i=-2;i<=2;i++){const spread=i*.23,top=.30-Math.abs(i)*.065;egyptRelief(g,[[x,y-s*.20],[x+s*(spread-.09),y+s*(top-.10)],[x+s*spread,y+s*top],[x+s*(spread+.09),y+s*(top-.10)]],z,.018,Math.abs(i)===1?EGYPT_ART.turquoise:EGYPT_ART.gold);}
 g.tube([[x-s*.43,y-s*.19,z+.025],[x,y-s*.27,z+.035],[x+s*.43,y-s*.19,z+.025]],s*.025,EGYPT_ART.edge,1,5);
}
function egyptScarab(g,x,y,z,s){
 const shell=[[-.25,-.12],[-.20,-.35],[0,-.45],[.20,-.35],[.25,-.12],[.19,.20],[0,.28],[-.19,.20]].map(([a,b])=>[x+a*s,y+b*s]);
 egyptRelief(g,shell,z,.12*s,EGYPT_ART.gold);
 const inset=shell.map(([a,b])=>[x+(a-x)*.76,y+(b-y)*.80]);egyptRelief(g,inset,z+.045*s,.13*s,EGYPT_ART.turquoise,7);
 g.tube([[x,y-.32*s,z+.19*s],[x,y+.17*s,z+.19*s]],.018*s,EGYPT_ART.edge,1,5);
 for(const side of [-1,1])for(let i=0;i<3;i++)g.tube([[x+side*.18*s,y+(.08-i*.14)*s,z+.07*s],[x+side*.32*s,y+(.17-i*.19)*s,z+.05*s],[x+side*.39*s,y+(.20-i*.20)*s,z+.02*s]],.025*s,EGYPT_ART.gold,1,5);
 g.append(tintGeo(gemGeometry(1,7),EGYPT_ART.lapis),trs([x,y+.30*s,z+.10*s],[0,0,0],[.24*s,.22*s,.20*s]));
 g.tube([[x-.11*s,y+.39*s,z],[x-.18*s,y+.43*s,z],[x,y+.46*s,z],[x+.18*s,y+.43*s,z],[x+.11*s,y+.39*s,z]],.020*s,EGYPT_ART.edge,1,5);
}
function buildEgyptianCrown(){const g=new Geo();egyptScarab(g,0,0,.03,.78);return g;}
let egyptianCrownCache=null;
function egyptianCrownPlacement(w=1280,h=800,obstacle=null){
 const obstacleKey=obstacle?[obstacle.left,obstacle.top,obstacle.right,obstacle.bottom].join(','):'';
 if(egyptianCrownCache?.w===w&&egyptianCrownCache.h===h&&egyptianCrownCache.obstacleKey===obstacleKey)return egyptianCrownCache;
 const f=cabinetFraming(w,h);let x=0,y=4.98,z=.05,scale=1,mount='crown',haloScale=0;
 if(!f.wide){
  const vp=matMul(perspective(42*PI/180,w/h,.1,150),lookAt([0,.62,f.distance],[0,0,0])),screenY=y=>project([0,y,.05],vp,w,h)[1];
  const titleY=Math.max(10,project([-3.98,4.02,.15],vp,w,h)[1]-93),ppu=screenY(4.98)-screenY(5.98);
  const topSafe=12+h*.025,bottomSafe=titleY-12,fittedScale=Math.min(1,(bottomSafe-topSafe)/(1.4*ppu));
  if(fittedScale*1.4*ppu>=32){
   scale=fittedScale;const target=titleY>120?Math.max(topSafe+1.4*ppu*scale*.5,titleY-78):topSafe+1.4*ppu*scale*.5;let lo=0,hi=24;
   for(let i=0;i<32;i++){const mid=(lo+hi)*.5;if(screenY(mid)>target)lo=mid;else hi=mid;}y=(lo+hi)*.5;mount='sky';
   haloScale=Math.min(.14*scale,(target-topSafe)/(ppu*7*1.14),(bottomSafe-target)/(ppu*7*1.14));
   // The shared About control moves to the top-right in short views. Keep its measured lane clear.
   const halfWidth=2.35*scale*ppu,halfHeight=.70*scale*ppu;
   if(obstacle&&target-halfHeight<obstacle.bottom+12&&target+halfHeight>obstacle.top-12&&w*.5+halfWidth>obstacle.left-12){
    const targetX=obstacle.left-16-halfWidth;
    if(targetX-halfWidth>=12)x=(targetX-w*.5)/(project([1,y,z],vp,w,h)[0]-w*.5);
    else{x=0;y=4.98;z=.05;scale=1;mount='crown';haloScale=0;}
   }
  }
 }
 const projection=perspective(42*PI/180,w/h,.1,150),stable=matMul(projection,lookAt([0,.62,f.distance],[0,0,0]));
 const ppu=project([0,4.98,z],stable,w,h)[1]-project([0,5.98,z],stable,w,h)[1];
 if(f.wide){
  // Fit the sculpted body AND expanded feather union above the unchanged title.
  const top=project([-3.98,4.02,.15],stable,w,h)[1],titleTop=Math.max(5,top-(h<460?34:43)-5),bottom=titleTop-5;
  scale=Math.min(1,Math.max(.12,(bottom-8)/(1.4*ppu)));
  const target=(8+bottom)*.5;let lo=0,hi=24;
  for(let i=0;i<32;i++){const mid=(lo+hi)*.5;if(project([0,mid,z],stable,w,h)[1]>target)lo=mid;else hi=mid;}y=(lo+hi)*.5;
 }
 if(obstacle){
  // Apply measured About avoidance to every mount, including the compact fallback.
  // Bounds include the existing maximum punch/shake camera envelope, not just quiet view.
  const cameras=[];
  for(const punch of [0,1.2])for(const sx of [-.0221,.0221])for(const sy of [-.0187,.0187])for(const roll of [-.0017,.0017])cameras.push(matMul(projection,lookAt([sx,.62+sy,f.distance*(1-.045*punch)],[0,0,0],[roll,1,0])));
  const halfWing=f.wide?3.8:2.37;
  const envelope=()=>{const b={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};for(const vp of cameras)for(const dx of [-halfWing,halfWing])for(const dy of [-.72,.72])for(const dz of [-.25,.27]){const q=project([x+dx*scale,y+dy*scale,z+dz*scale],vp,w,h);b.left=Math.min(b.left,q[0]);b.right=Math.max(b.right,q[0]);b.top=Math.min(b.top,q[1]);b.bottom=Math.max(b.bottom,q[1]);}return b;};
  for(let i=0;i<3;i++){
   const b=envelope();if(b.right<=obstacle.left-12||b.left>=obstacle.right+12||b.bottom<=obstacle.top-12||b.top>=obstacle.bottom+12)break;
   const shift=obstacle.left-14-b.right;
   if(b.left+shift>=10)x+=shift/(ppu*1.05);
   else scale*=Math.max(.5,(obstacle.left-24)/Math.max(1,b.right-b.left));
  }
 }
 const screenY=1-2*project([x,y,z],stable,w,h)[1]/h;
 return egyptianCrownCache={w,h,x,y,z,scale,mount,haloScale,obstacleKey,screenY};
}
function egyptianCrownFramePose(base,a){
 // The wide crest occupies the narrow sky above the stable title. Keep its centre
 // in that lane during camera punch/shake, without shrinking it or moving the camera.
 if(!cabinetFraming(base.w,base.h).wide||!a.vp||(!a.punch&&!(a.prefs.motion&&a.shake)))return base;
 const m=a.vp,n=base.screenY,d=m[5]-n*m[7];
 if(Math.abs(d)<1e-8)return base;
 const y=(n*(m[3]*base.x+m[11]*base.z+m[15])-(m[1]*base.x+m[9]*base.z+m[13]))/d;
 return Number.isFinite(y)?{...base,y}:base;
}
function buildEgyptianWings(){
 const g=new Geo();
 for(const side of [-1,1]){
  // Tapered feather fans, each with a raised gold edge and a recessed enamel vane.
  for(let i=0;i<9;i++){
   const rootX=.18+i*.045,tipX=.64+i*.19,tipY=.20-i*.047;
   const p=[[side*rootX,.08-i*.022],[side*(tipX-.17),tipY-.13],[side*tipX,tipY],[side*(tipX-.04),tipY+.09],[side*(rootX+.05),.19-i*.018]];
   egyptRelief(g,p,0,.055,EGYPT_ART.gold);
   const c=p.reduce((a,v)=>[a[0]+v[0]/p.length,a[1]+v[1]/p.length],[0,0]);
   egyptRelief(g,p.map(v=>[c[0]+(v[0]-c[0])*.76,c[1]+(v[1]-c[1])*.62]),.06,.012,i%3===0?EGYPT_ART.lapis:EGYPT_ART.turquoise,0);
  }
  g.tube([[side*.18,.16,.03],[side*.75,.30,.03],[side*1.45,.27,.03],[side*2.20,.01,.03]],.036,EGYPT_ART.edge,1,6);
 }
 return g;
}
function buildEgyptianCabinet(g){
 // A real carved channel supports the earned light chase, outside the gem aperture.
 const channel=[[-4.22,-4.12,.395],[-4.22,4.22,.195],[4.22,4.22,.195],[4.22,-4.12,.395],[-4.22,-4.12,.395]];
 g.tube(channel,.046,EGYPT_ART.gold,1,6);
 g.tube(channel.map(([x,y,z])=>[x,y,z+.032]),.032,EGYPT_ART.deep,0,5);
 // Narrow relief strips remain outside the original 8x8 gem aperture.
 for(const side of [-1,1]){
  const x=side*4.43;
  bevelBox(g,[x,0,.04],.36,7.55,.26,EGYPT_ART.lapis,0,.035,.045);
  for(const dx of [-.14,.14])g.tube([[x+dx,-3.77,.20],[x+dx,3.77,.20]],.013,EGYPT_ART.edge,1,5);
  for(let row=-3;row<=3;row++){
   const y=row*1.04;
   if(row%2===0)egyptAnkh(g,x,y+.04,.21,.30,EGYPT_ART.gold);
   else egyptLotus(g,x,y,.22,.32);
   g.box(x,y-.40,.20,.20,.035,.025,EGYPT_ART.turquoise,0);
  }
  // Inlaid lotus corner caps make the motif readable even when the wider scenery crops.
  for(const y of [-4.05,4.05])egyptLotus(g,side*3.48,y,.20,.52);
  // Stepped lapis obelisks in the existing courtyard, behind the cabinet and HUD.
  const ox=side*6.15,oz=-3.7;
  bevelBox(g,[ox,-1.05,oz],.80,7.65,.72,EGYPT_ART.deep,0,.06,.07);
  bevelBox(g,[ox,-4.82,oz],1.14,.36,1.02,EGYPT_ART.gold,1,.05,.08);
  egyptRelief(g,[[ox-.38,2.77],[ox+.38,2.77],[ox,3.56]],oz+.37,.13,EGYPT_ART.gold);
  for(let row=0;row<5;row++){
   const y=-3.9+row*1.35;
   if(row%2)egyptLotus(g,ox,y,oz+.40,.60);else egyptAnkh(g,ox,y+.10,oz+.40,.52,EGYPT_ART.turquoise,0);
  }
  g.tube([[ox-.29,-4.55,oz+.40],[ox-.29,2.70,oz+.40]],.015,EGYPT_ART.gold,1,5);
  g.tube([[ox+.29,-4.55,oz+.40],[ox+.29,2.70,oz+.40]],.015,EGYPT_ART.gold,1,5);
  for(const x of [side*1.15,side*2.18,side*3.18])egyptLotus(g,x,-4.45,.34,.56);
 }
 // Turquoise-and-gold collar under the title, with outward solar feathers.
 for(const side of [-1,1])for(let i=0;i<7;i++){
  const x=side*(2.65+i*.16);egyptRelief(g,[[x-.055,4.20],[x+.055,4.20],[x+.08,4.42],[x,4.49],[x-.08,4.42]],.13,.025,i%2?EGYPT_ART.gold:EGYPT_ART.turquoise,1);
 }
}
function buildEgyptianSun(){
 const g=new Geo();
 for(let i=0;i<16;i++){
  const a=i/16*TAU,at=(r,d=0)=>[Math.cos(a+d)*r,Math.sin(a+d)*r];
  egyptRelief(g,[at(4.62,-.025),at(6.5,-.011),at(7.0),at(6.5,.011),at(4.62,.025)],0,.015,[1,.72,.27],8);
  egyptRelief(g,[at(4.74,-.008),at(6.80),at(4.74,.008)],.025,.008,[1,.94,.67],8);
 }
 g.ring([0,0,0],4.72,.025,[.25,.78,.75],8,'z',96);
 g.ring([0,0,0],5.02,.015,[1,.79,.35],8,'z',96);
 return g;
}
function egyptianRod(from,to){const x=vnorm(vsub(to,from)),y=vnorm([-x[1],x[0],0]),z=vcross(x,y),length=Math.hypot(...vsub(to,from));return new Float32Array([...vmul(x,length),0,...y,0,...z,0,...from,1]);}
class EgyptianFeedback {
 constructor(app){
  this.a=app;this.reset();const r=app.renderer;
  this.wings=r.createMesh(buildEgyptianRoyalWings().data(),1);
  const staff=new Geo();bevelBox(staff,[0,.5,0],.16,1,.14,EGYPT_ART.gold,1,.02,.025);staff.tube([[0,.05,.08],[0,.95,.08]],.022,EGYPT_ART.turquoise,0,5);this.staff=r.createMesh(staff.data(),1);
  const edge=new Geo();edge.tube([[0,0,0],[1,0,0]],.025,[1,1,1],8,5);this.edges=r.createMesh(edge.data(),24);
  this.seals=r.createMesh(buildEgyptianSolarSeal().data(),2);
  this.sun=r.createMesh(buildEgyptianSolarFan().data(),4);
  this.shutters=r.createMesh(buildEgyptianSolarShutter().data(),8);
 }
 reset(){this.events=[];this.accepted=0;this.lastAt=-100;this.lastTier=0;this.lastFrame={energy:0,tier:0,edges:0,seals:0,sun:0,shutters:0,stage:'idle',eventAge:null};}
 match(cascade,time,flash){
  const p=this.a.prefs;if(!flash||!p.motion||!p.particles||p.comboTreatment===false||p.flash==='off'||!(+p.juice>0))return;
  if(!Number.isFinite(+cascade)||!Number.isFinite(time))return;
  const tier=clamp(Math.floor(cascade),1,9);if(time-this.lastAt<.30&&tier<=this.lastTier)return;
  this.lastAt=time;this.lastTier=tier;this.events.push({time,tier});if(this.events.length>3)this.events.shift();this.accepted++;
 }
 build(){
  const a=this.a,p=a.prefs,r=a.renderer,t=a.time,edges=[],seals=[],sun=[],shutters=[];
  this.events=this.events.filter(e=>t>=e.time&&t-e.time<2.1);
  const allowed=p.motion&&p.particles&&p.comboTreatment!==false&&p.flash!=='off'&&+p.juice>0&&!a.panelOpen&&!a.gameOver&&!a.aaCompare&&!a.expedition?.run?.finished&&!a.expedition?.photo;
  if(!allowed)this.events=[];
  const comfort=p.flash==='low'?.35:1,juice=clamp((+p.juice||0)/100,0,1.5);
  let energy=0,tier=0,lead=0,unfold=0,resolve=0,eventAge=null,dominance=-1;
  // Keep each accepted event's tier, age and envelope together. A new x1 cannot
  // borrow the tier of a fading x7 and relight its high-tier sculpture.
  if(allowed)for(const e of this.events){const age=t-e.time,q=egyptianSolarEnvelope(age),env=q.charge*q.resolve,weight=env*(1+e.tier*.08);
   if(weight>dominance){dominance=weight;energy=env;tier=e.tier;lead=q.charge;unfold=q.unfold;resolve=q.resolve;eventAge=age;}}
  energy*=comfort*juice;
  const sculpture=unfold*resolve*clamp(comfort*juice),stage=energy<=.0001?'idle':eventAge<.28?'charge':eventAge<1.12?'unfold':'resolve';
  // Geometry opens once on an earned hit. No oscillation, strobe or new particle emission.
  const open=clamp(energy)*Math.min(tier/3,1),scale=.90+open*.16,poseKey=a.cssWidth+'x'+a.cssHeight;
  if(this.poseKey!==poseKey||!this.aboutMeasured){const obstacle=a.cssHeight<=640&&typeof document!=='undefined'?document.querySelector('#trontAbout > summary')?.getBoundingClientRect():null;this.basePose=egyptianCrownPlacement(a.cssWidth,a.cssHeight,obstacle?.width?obstacle:null);this.poseKey=poseKey;this.aboutMeasured=a.cssHeight>640||typeof document==='undefined'||!!obstacle?.width;}
  this.pose=egyptianCrownFramePose(this.basePose,a);
  // Wide cabinets have a shallow sky slot: spread the feathers horizontally
  // without flattening the scarab body or changing the full phone silhouette.
  const pose=this.pose,wingSpread=cabinetFraming(pose.w,pose.h).wide?1.6:1;
  const wingMatrix=trs([pose.x,pose.y,pose.z-.005],[0,0,0],[scale*pose.scale*wingSpread,(1.23+open*.10)*pose.scale,.9*pose.scale]);
  r.upload(this.wings,new Float32Array(packedInstance(wingMatrix,[1,1,1],0,-1)),1);
  const staff=[];if(pose.mount==='sky'||Math.abs(pose.x)>.001||Math.abs(pose.y-4.98)>.001){const v=[pose.x,pose.y-4.66-.35*pose.scale,pose.z+.24],up=vnorm(v),side=vnorm([up[1],-up[0],0]),normal=vcross(side,up);staff.push(...packedInstance(new Float32Array([...vmul(side,pose.scale),0,...v,0,...normal,0,0,4.66,-.18,1]),[1,1,1],0,-1));}
  r.upload(this.staff,new Float32Array(staff),staff.length/24);
  if(energy>.0001){
   const route=[[-4.22,-4.12,.447],[-4.22,4.22,.247],[4.22,4.22,.247],[4.22,-4.12,.447]],col=[1,.76,.34];
   for(let side=0;side<4;side++)for(let k=0;k<3;k++){
    const from=route[side],to=route[(side+1)%4],v=vsub(to,from),s=clamp(lead*1.25-k*.12),q=vadd(from,vmul(v,s)),length=Math.min(.55,Math.hypot(...v)*s);
    if(length>.001)edges.push(...packedInstance(egyptianRod(vadd(q,vmul(vnorm(v),-length)),q),vmul(col,energy*(1-k*.26)),.85,8));
   }
   if(tier>=3)for(const side of [-1,1]){const size=.30*clamp(energy);seals.push(...packedInstance(trs([side*4.43,.03,.37],[0,0,0],[size,size,size]),[1,1,1],energy*.28,-1));}
   // Hinged enamel solar shutters open outwards, never across the playable aperture.
   if(tier>=4)for(const side of [-1,1])for(let row=0;row<4;row++){
    const angle=(side<0?PI:0)+side*((row-1.5)*.13+.34*(1-unfold));
    const size=sculpture*(tier>=5?1.0:.72);
    if(size>.001)shutters.push(...packedInstance(trs([side*4.72,-3+row*2,-1.30],[0,0,angle],[size,size,size]),[1,1,1],energy*.22,-1));
   }
   // x4 charges physical feathers; compact layouts use their visible carved rail inlays.
   if(tier>=4)for(const side of [-1,1])for(let i=0;i<6;i++){
    let matrix;
    if(pose.mount==='sky'){
     const spine=x=>egyptianRoyalWingRimAt(x,side,.055),x=.35+i*.29;
     matrix=egyptianRod(transform(wingMatrix,spine(x)),transform(wingMatrix,spine(x+.14*lead)));
    }else if(!cabinetFraming(pose.w,pose.h).wide)matrix=trs([side*4.43-.08,(i-3)*1.04-.40,.24],[0,0,0],[.16*lead,1,1]);
    else matrix=trs([side*(2.65+i*.16),4.22,.17],[0,0,PI/2],[.20*lead,1,1]);
    edges.push(...packedInstance(matrix,vmul([.35,1,.91],energy*lead),.85,8));
   }
   if(tier>=5){
    // A broad physical sun unfolds from behind the cabinet, then folds back into it.
    const grow=.56+.49*sculpture;
    sun.push(...packedInstance(trs([0,0,-2.00],[0,0,-PI/48*unfold],[grow,grow,1]),[1,1,1],energy*.34,-1));
    if(pose.mount==='sky'&&pose.haloScale>0){const size=pose.haloScale*sculpture;sun.push(...packedInstance(trs([pose.x,pose.y,pose.z-.45],[0,0,0],[size,size,1]),[1,1,1],energy*.30,-1));}
    // Encore reveals a second staggered enamel rank, a new silhouette rather than more particles.
    if(tier>=7){const outer=.56+.60*sculpture;
     sun.push(...packedInstance(trs([0,0,-2.23],[0,0,PI/24*unfold],[outer,outer,1]),[.62,.94,1],energy*.25,-1));
     if(pose.mount==='sky'&&pose.haloScale>0){const size=pose.haloScale*1.1*sculpture;sun.push(...packedInstance(trs([pose.x,pose.y,pose.z-.49],[0,0,PI/24*unfold],[size,size,1]),[.62,.94,1],energy*.22,-1));}
    }
   }
  }
  r.upload(this.edges,new Float32Array(edges),edges.length/24);r.upload(this.seals,new Float32Array(seals),seals.length/24);r.upload(this.sun,new Float32Array(sun),sun.length/24);r.upload(this.shutters,new Float32Array(shutters),shutters.length/24);
  this.lastFrame={energy,tier,edges:edges.length/24,seals:seals.length/24,sun:sun.length/24,shutters:shutters.length/24,stage,eventAge};
  return [this.wings,this.staff,this.edges,this.seals,this.sun,this.shutters];
 }
 info(){return {accepted:this.accepted,queued:this.events.length,...this.lastFrame};}
}
