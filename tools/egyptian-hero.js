/* Sculpted royal scarab and feathered sun. Merged, deterministic static assets.
   No gameplay, frame clocks, random samples, input, audio or transport access. */
const EGYPT_ROYAL={
 gold:color('#c59b42'),edge:color('#f5d992'),shadow:color('#735021'),
 lapis:color('#123765'),lapisHi:color('#285b91'),turquoise:color('#2baea4'),
 jade:color('#74d7bd'),deep:color('#061c32'),carnelian:color('#a84d2d')
};
const EGYPT_ROYAL_WING_RIM=[[.22,.20,.14],[.48,.353,.15],[.90,.423,.15],[1.39,.402,.14],[1.91,.275,.115],[2.19,.17,.08]];
function egyptianRoyalWingRimAt(x,side=1,front=0){
 x=clamp(x,EGYPT_ROYAL_WING_RIM[0][0],EGYPT_ROYAL_WING_RIM.at(-1)[0]);
 for(let i=1;i<EGYPT_ROYAL_WING_RIM.length;i++){
  const a=EGYPT_ROYAL_WING_RIM[i-1],b=EGYPT_ROYAL_WING_RIM[i];
  if(x<=b[0]){const t=(x-a[0])/(b[0]-a[0]);return [side*x,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t+front];}
 }
}

// Two bevel bands and a raised table give enamel/metal real depth in both renderers.
function egyptRoyalBezel(g,outline,z,depth,col,kind=0){
 let p=outline.map(v=>v.slice());
 let area=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];area+=p[i][0]*q[1]-q[0]*p[i][1];}if(area<0)p.reverse();
 const c=p.reduce((a,v)=>[a[0]+v[0]/p.length,a[1]+v[1]/p.length],[0,0]);
 const inset=(v,s,h)=>[c[0]+(v[0]-c[0])*s,c[1]+(v[1]-c[1])*s,h];
 for(let i=0;i<p.length;i++){
  const a=p[i],b=p[(i+1)%p.length],aa=inset(a,.80,z+depth),bb=inset(b,.80,z+depth);
  g.quad([a[0],a[1],z-.027],[b[0],b[1],z-.027],[b[0],b[1],z],[a[0],a[1],z],vmul(col,.62),kind);
  g.quad([a[0],a[1],z],[b[0],b[1],z],bb,aa,vmul(col,1.12),kind);
  g.tri([c[0],c[1],z+depth+.006],aa,bb,col,kind);
 }
 return g;
}

function egyptRoyalEllipse(g,x,y,rx,ry,z,depth,col,kind=0,steps=20){
 return egyptRoyalBezel(g,Array.from({length:steps},(_,i)=>{const a=i/steps*TAU;return[x+Math.cos(a)*rx,y+Math.sin(a)*ry];}),z,depth,col,kind);
}

function egyptRoyalFeather(g,root,tip,width,z,enamel){
 const dx=tip[0]-root[0],dy=tip[1]-root[1],length=Math.hypot(dx,dy),n=[-dy/length,dx/length];
 const at=(t,w)=>[root[0]+dx*t+n[0]*w,root[1]+dy*t+n[1]*w];
 const outline=[at(0,0),at(.22,-width),at(.76,-width*.66),at(1,0),at(.76,width*.66),at(.22,width)];
 egyptRoyalBezel(g,outline,z,.040,EGYPT_ROYAL.gold,1);
 const inset=outline.map(v=>[root[0]+(v[0]-root[0])*.91+dx*.045,root[1]+(v[1]-root[1])*.91+dy*.045]);
 egyptRoyalBezel(g,inset,z+.047,.022,enamel,0);
 // A raised shaft separates the two enamel vanes; paired incisions are broad facets.
 const p=at(.10,0),q=at(.91,0);
 g.tube([[p[0],p[1],z+.079],[q[0],q[1],z+.075]],.009,EGYPT_ROYAL.edge,1,5);
 for(const t of [.34,.54,.72])for(const side of [-1,1]){
  const a=at(t-.07,side*width*.60),b=at(t+.035,0),c=at(t+.045,side*width*.60);
  egyptRoyalBezel(g,[a,b,c],z+.071,.004,side===1?EGYPT_ROYAL.lapisHi:EGYPT_ROYAL.deep,0);
 }
}

function buildEgyptianRoyalWings(){
 const g=new Geo();
 // The flight feathers form a scalloped fan; the upper coverts overlap in relief.
 const tips=[[.55,-.38],[.76,-.41],[.99,-.39],[1.23,-.34],[1.48,-.26],[1.71,-.16],[1.92,-.045],[2.09,.055],[2.22,.15]];
 for(const side of [-1,1]){
  const mirror=p=>[p[0]*side,p[1]];
  const under=[[.14,.11],[.49,.30],[.91,.36],[1.45,.36],[1.94,.26],[2.20,.15],[1.97,-.08],[1.47,-.30],[.75,-.43],[.31,-.20]];
  egyptRoyalBezel(g,under.map(mirror),-.105,.025,EGYPT_ROYAL.deep,0);
  for(let i=0;i<tips.length;i++){
   const root=[.18+i*.105,.10+i*.021];
   egyptRoyalFeather(g,mirror(root),mirror(tips[i]),i<5?.085:.061,-.045+i*.003,i%3===0?EGYPT_ROYAL.lapis:EGYPT_ROYAL.turquoise);
  }
  // Raised lapis shoulder is a single authored assembly, bordered by heavy gold.
  const shoulder=[[.17,.15],[.42,.34],[.88,.425],[1.39,.405],[1.94,.275],[2.19,.17],[1.62,.255],[.91,.285],[.40,.20]];
  egyptRoyalBezel(g,shoulder.map(mirror),.055,.045,EGYPT_ROYAL.gold,1);
  const inlay=[[.28,.195],[.46,.304],[.89,.378],[1.38,.365],[1.80,.272],[1.39,.305],[.90,.326],[.45,.247]];
  egyptRoyalBezel(g,inlay.map(mirror),.107,.022,EGYPT_ROYAL.lapis,0);
  // Compact coverts create a second tier and a readable alternating enamel rhythm.
  for(let i=0;i<7;i++){
   const x=.38+i*.205,y=.245+.085*Math.sin(i/6*PI),root=[x,y],tip=[x+.22,y-.18+.065*i/6];
   egyptRoyalFeather(g,mirror(root),mirror(tip),.043,.116,i%2?EGYPT_ROYAL.turquoise:EGYPT_ROYAL.lapisHi);
  }
  const rim=EGYPT_ROYAL_WING_RIM.map(p=>[p[0]*side,p[1],p[2]]);
  g.tube(rim,.018,EGYPT_ROYAL.edge,1,6);
  // Gold-and-carnelian shoulder clasp roots the feather fan in the beetle's body.
  egyptRoyalBezel(g,[[.16,.20],[.30,.27],[.43,.18],[.34,.07],[.20,.07]].map(mirror),.145,.040,EGYPT_ROYAL.gold,1);
  egyptRoyalBezel(g,[[.225,.19],[.30,.225],[.36,.18],[.31,.125],[.24,.12]].map(mirror),.191,.020,EGYPT_ROYAL.carnelian,0);
 }
 return g;
}

function buildEgyptianRoyalCrown(){
 const g=new Geo(),c=EGYPT_ROYAL;
 // A solid sun held aloft by the forelegs, with a darker core and physical bezel.
 egyptRoyalEllipse(g,0,.282,.196,.196,-.085,.032,c.shadow,1,24);
 egyptRoyalEllipse(g,0,.282,.179,.179,-.045,.040,c.gold,1,24);
 egyptRoyalEllipse(g,0,.282,.134,.134,.005,.018,c.carnelian,0,20);
 g.ring([0,.282,.032],.145,.010,c.edge,1,'z',32);
 for(let i=0;i<12;i++){
  const a=i/12*TAU,p=(r,d)=>[Math.cos(a+d)*r,.282+Math.sin(a+d)*r];
  egyptRoyalBezel(g,[p(.15,-.045),p(.187,0),p(.15,.045)],-.001,.018,c.edge,1);
 }
 // Broad lobed torso: sculpted gold carapace, split turquoise elytra and lapis collar.
 const body=[[-.235,.030],[-.245,-.11],[-.195,-.285],[-.080,-.385],[.080,-.385],[.195,-.285],[.245,-.11],[.235,.030],[.14,.135],[-.14,.135]];
 egyptRoyalBezel(g,body,-.020,.102,c.gold,1);
 for(const side of [-1,1]){
  const shell=[[.018,.060],[.130,.080],[.207,.010],[.205,-.135],[.157,-.266],[.066,-.337],[.018,-.325]].map(([x,y])=>[x*side,y]);
  egyptRoyalBezel(g,shell,.094,.085,side===1?c.turquoise:c.jade,0);
  // Short relief ribs follow the domed shell, not a field of separate dots.
  for(let row=0;row<3;row++){
   const y=-.05-row*.085;
   g.tube([[side*.035,y-.025,.193],[side*.12,y,.185],[side*(.18-row*.018),y+.035,.162]],.0075,c.lapis,0,5);
  }
  // Three deliberately jointed legs make the insect recognisable at phone scale.
  const legs=[[[.18,.035,.06],[.30,.17,.06],[.30,.34,.06],[.22,.43,.01]],
              [[.22,-.10,.04],[.365,-.065,.035],[.405,-.13,.025]],
              [[.17,-.25,.025],[.31,-.30,.015],[.34,-.41,.005]]];
  for(const points of legs){
   g.tube(points.map(([x,y,z])=>[side*x,y,z]),.020,c.gold,1,6);
   const knee=points[1];egyptRoyalEllipse(g,side*knee[0],knee[1],.032,.027,knee[2]+.008,.018,c.edge,1,8);
  }
 }
 g.tube([[0,-.34,.195],[0,-.08,.205],[0,.065,.189]],.012,c.edge,1,6);
 egyptRoyalBezel(g,[[-.145,.07],[.145,.07],[.17,.15],[.115,.205],[-.115,.205],[-.17,.15]],.115,.062,c.lapis,0);
 g.tube([[-.145,.085,.178],[0,.105,.194],[.145,.085,.178]],.011,c.edge,1,6);
 egyptRoyalBezel(g,[[-.092,.175],[.092,.175],[.105,.237],[.055,.276],[-.055,.276],[-.105,.237]],.146,.055,c.gold,1);
 // A lapis eye band and central turquoise ridge separate head from the sun disk.
 egyptRoyalBezel(g,[[-.08,.202],[.08,.202],[.075,.226],[-.075,.226]],.206,.009,c.deep,0);
 egyptRoyalBezel(g,[[0,.185],[.024,.227],[0,.258],[-.024,.227]],.215,.018,c.turquoise,0);
 egyptRoyalBezel(g,[[-.061,-.366],[.061,-.366],[.042,-.424],[0,-.465],[-.042,-.424]],.032,.046,c.gold,1);
 egyptRoyalBezel(g,[[-.025,-.386],[.025,-.386],[0,-.439]],.085,.024,c.lapis,0);
 return g;
}
