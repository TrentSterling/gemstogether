/* Authored Egyptian temple cabinet. Static merged geometry only.
   No input, state, randomness, audio, storage or renderer calls. */

function egyptTemplePrism(g,outline,front,back,col,kind=0){
 const p=outline.slice();let area=0;
 for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];area+=p[i][0]*q[1]-q[0]*p[i][1];}
 if(area<0)p.reverse();
 const c=p.reduce((s,v)=>[s[0]+v[0]/p.length,s[1]+v[1]/p.length],[0,0]);
 for(let i=0;i<p.length;i++){
  const a=p[i],b=p[(i+1)%p.length];
  g.tri([c[0],c[1],front],[a[0],a[1],front],[b[0],b[1],front],col,kind);
  g.tri([c[0],c[1],back],[b[0],b[1],back],[a[0],a[1],back],vmul(col,.66),kind);
  g.quad([a[0],a[1],back],[b[0],b[1],back],[b[0],b[1],front],[a[0],a[1],front],vmul(col,.79),kind);
 }
}

function egyptTempleCartouche(g,x,y,z,w,h){
 // Continuous metal surround, a visibly recessed enamel bed, and a raised ankh.
 bevelBox(g,[x,y,z],w,h,.09,EGYPT_ART.gold,1,.025,Math.min(w*.42,.17));
 bevelBox(g,[x,y,z+.052],w-.075,h-.10,.025,EGYPT_ART.ink,0,.008,Math.min(w*.31,.13));
 bevelBox(g,[x,y,z+.071],w-.13,h-.17,.022,EGYPT_ART.lapis,0,.006,Math.min(w*.25,.11));
 const s=Math.min((w-.13)/.65,(h-.20)/1.12);
 egyptAnkh(g,x,y+.10*s,z+.099,s,EGYPT_ART.edge,1);
 if(h>2){
  egyptLotus(g,x,y+h*.31,z+.102,w*.94);
  egyptTempleWingSeal(g,x,y-h*.30,z+.102,w*.72);
  for(const dy of [-h*.15,h*.15])g.box(x,y+dy,z+.096,w*.55,.025,.026,EGYPT_ART.gold,1);
 }
 g.box(x,y-h*.5-.017,z+.025,w*.66,.035,.07,EGYPT_ART.gold,1);
}

function egyptTempleWingSeal(g,x,y,z,s){
 // A sun held by symmetrical tapering feathers; solid enamel rather than light dots.
 const disk=[];for(let i=0;i<16;i++){const a=i/16*TAU;disk.push([x+Math.cos(a)*s*.17,y+Math.sin(a)*s*.17]);}
 egyptRelief(g,disk,z,.065*s,EGYPT_ART.gold,1);
 for(const side of [-1,1])for(let i=0;i<4;i++){
  const a=.14+i*.06,b=.30+i*.15,drop=.05+i*.045;
  const feather=[[x+side*a*s,y+.07*s],[x+side*b*s,y+(.13-drop)*s],
   [x+side*(b+.12)*s,y+(.10-drop)*s],[x+side*(b+.03)*s,y+(-.03-drop)*s],[x+side*a*s,y-.015*s]];
  egyptRelief(g,feather,z-.02,.035*s,i%2?EGYPT_ART.turquoise:EGYPT_ART.lapis,0);
  g.tube([[x+side*a*s,y+.075*s,z+.025],[x+side*(b+.1)*s,y+(.10-drop)*s,z+.025]],.014*s,EGYPT_ART.gold,1,5);
 }
}

function egyptTempleCavetto(g,x,y,z,width,depth){
 // Four physical courses flare outward like a temple cavetto cornice.
 const courses=[[-.20,.74,.13,EGYPT_ART.deep],[-.095,.83,.11,EGYPT_ART.gold],
  [.02,.94,.14,EGYPT_ART.lapis],[.14,1,.10,EGYPT_ART.gold]];
 for(const [dy,scale,h,col] of courses)bevelBox(g,[x,y+dy,z],width*scale,h,depth+(scale-.74)*.5,col,col===EGYPT_ART.gold?1:0,.018,.035);
 for(let i=0;i<9;i++){
  const xx=x+(i-4)*width*.086;
  egyptRelief(g,[[xx-.027,y-.03],[xx+.027,y-.03],[xx+.045,y+.085],[xx,y+.105],[xx-.045,y+.085]],z+depth*.5+.045,.012,i%2?EGYPT_ART.turquoise:EGYPT_ART.edge,1);
 }
}

function egyptTemplePylon(g,side){
 const x=side*6.15,z=-3.7;
 // Battered pylon walls, not flat rectangular signs. The side/back faces have depth.
 const shape=[[x-.77,-4.90],[x+.77,-4.90],[x+.52,5.50],[x-.52,5.50]];
 egyptTemplePrism(g,shape,z+.30,z-.72,EGYPT_ART.deep,0);
 const inset=[[x-.60,-4.56],[x+.60,-4.56],[x+.39,5.26],[x-.39,5.26]];
 egyptTemplePrism(g,inset,z+.325,z+.29,EGYPT_ART.lapis,0);
 const outline=shape.map(([a,b])=>[a,b,z+.33]);outline.push(outline[0]);g.tube(outline,.034,EGYPT_ART.gold,1,6);
 // Quiet inset mortar courses let large ceremonial relief carry the attention.
 for(const yy of [-3.2,-1.55,.10,1.75,3.4,4.9]){
  const half=.52+((5.50-yy)/10.40)*.25;
  g.box(x,yy,z+.335,half*1.74,.025,.018,EGYPT_ART.ink,0);
 }
 egyptTempleCartouche(g,x,.16,z+.36,.68,5.30);
 egyptTempleWingSeal(g,x,4.38,z+.40,.88);
 egyptLotus(g,x,-3.58,z+.40,.95);
 // Lotus cups create a wide cap silhouette and a materially readable capital.
 for(const dx of [-.43,0,.43]){
  const xx=x+dx;
  egyptRelief(g,[[xx-.16,5.39],[xx+.16,5.39],[xx+.25,5.86],[xx,6.08],[xx-.25,5.86]],z+.22,.09,dx===0?EGYPT_ART.turquoise:EGYPT_ART.gold,1);
  egyptRelief(g,[[xx-.10,5.50],[xx+.10,5.50],[xx+.16,5.81],[xx,5.93],[xx-.16,5.81]],z+.33,.035,EGYPT_ART.lapis,0);
 }
 egyptTempleCavetto(g,x,6.07,z+.05,2.10,1.18);
 bevelBox(g,[x,-4.78,z-.04],1.69,.30,1.25,EGYPT_ART.gold,1,.045,.06);
 bevelBox(g,[x,-5.01,z-.10],1.92,.18,1.43,EGYPT_ART.deep,0,.035,.04);
 // Stepped turquoise-and-gold plinth, deliberately below and behind the controls.
 bevelBox(g,[x,-4.56,z+.01],1.47,.14,1.11,EGYPT_ART.turquoise,0,.02,.035);
}

function egyptTempleGateway(g){
 // A low-contrast monumental rear portal anchors the cabinet in an actual temple.
 // Every vertex here is behind z=-6.4; it adds no foreground board/HUD occluder.
 const stone=vmul(EGYPT_ART.deep,.74),blue=vmul(EGYPT_ART.lapis,.78),gold=vmul(EGYPT_ART.gold,.78),z=-7.25;
 for(const side of [-1,1]){
  const x=side*8.50;
  egyptTemplePrism(g,[[x-.91,-5.55],[x+.91,-5.55],[x+.69,5.55],[x-.69,5.55]],z+.42,z-.62,stone,0);
  for(const dx of [-.42,0,.42])bevelBox(g,[x+dx,.05,z+.43],.22,10.28,.09,blue,0,.025,.05);
  bevelBox(g,[x,5.15,z+.01],2.09,.50,1.20,gold,1,.035,.05);
  bevelBox(g,[x,-5.43,z],2.22,.31,1.30,blue,0,.04,.05);
  for(const yy of [-3.75,0,3.75]){
   const seal=new Geo();egyptTempleWingSeal(seal,0,0,0,1.05);
   g.append(seal,trs([x,yy,z+.53],[0,0,0],[1,1,.7]));
  }
 }
 bevelBox(g,[0,5.82,z],18.86,.74,1.32,stone,0,.065,.10);
 bevelBox(g,[0,6.23,z+.02],19.28,.19,1.48,gold,1,.035,.045);
 bevelBox(g,[0,5.45,z+.27],18.23,.12,.72,blue,0,.018,.03);
 // Alternating broad enamel feathers form a frieze rather than tiny texture noise.
 for(let i=-8;i<=8;i++){
  const x=i*.98;
  egyptRelief(g,[[x-.24,5.57],[x+.24,5.57],[x+.31,5.91],[x,6.06],[x-.31,5.91]],z+.69,.025,i%2?blue:gold,i%2?0:1);
  egyptRelief(g,[[x-.11,5.68],[x+.11,5.68],[x+.14,5.90],[x,5.98],[x-.14,5.90]],z+.73,.016,vmul(EGYPT_ART.turquoise,.65),0);
 }
}

function buildEgyptianTempleArchitecture(g){
 for(const side of [-1,1])egyptTemplePylon(g,side);
 egyptTempleGateway(g);
 return g;
}

function buildEgyptianTempleCabinet(g){
 // The original earned light-chase has its own exposed channel, unchanged in place.
 const channel=[[-4.22,-4.12,.395],[-4.22,4.22,.195],[4.22,4.22,.195],[4.22,-4.12,.395],[-4.22,-4.12,.395]];
 g.tube(channel,.046,EGYPT_ART.gold,1,6);
 g.tube(channel.map(([x,y,z])=>[x,y,z+.032]),.032,EGYPT_ART.deep,0,5);
 for(const side of [-1,1]){
  const x=side*4.43;
  // A built-up narrow pilaster: backer, enamel spine, gold arrises and raised panels.
  bevelBox(g,[x,0,.025],.36,7.59,.29,EGYPT_ART.gold,1,.028,.045);
  bevelBox(g,[x,0,.185],.285,7.50,.045,EGYPT_ART.deep,0,.009,.025);
  bevelBox(g,[x,0,.218],.22,7.43,.024,EGYPT_ART.lapis,0,.006,.018);
  for(const dx of [-.145,.145])g.tube([[x+dx,-3.77,.235],[x+dx,3.77,.235]],.014,EGYPT_ART.edge,1,5);
  for(let row=-2;row<=2;row++){
   const y=row*1.43;
   egyptTempleCartouche(g,x,y,.245,.255,.99);
   // Clasp plates join the panels to the rail and catch a distinct metal highlight.
   for(const dy of [-.62,.62]){
    bevelBox(g,[x,y+dy,.24],.34,.10,.075,EGYPT_ART.gold,1,.012,.02);
    egyptRelief(g,[[x-.095,y+dy],[x,y+dy-.035],[x+.095,y+dy],[x,y+dy+.035]],.29,.022,EGYPT_ART.turquoise,0);
   }
  }
  for(const yy of [-3.69,3.69])egyptLotus(g,x,yy,.265,.29);
  // Corner lotus fittings are entirely outside the board's existing aperture.
  for(const yy of [-4.15,4.15]){
   bevelBox(g,[side*3.48,yy,.18],.67,.245,.10,EGYPT_ART.deep,0,.018,.04);
   egyptLotus(g,side*3.48,yy,.26,.48);
  }
 }
 // Deep lower cornice with broad fan-shaped enamel inlays; no controls extend here.
 bevelBox(g,[0,-4.405,.10],8.11,.31,.36,EGYPT_ART.deep,0,.025,.045);
 for(const yy of [-4.54,-4.26])g.tube([[-4.04,yy,.30],[4.04,yy,.30]],.018,EGYPT_ART.gold,1,6);
 for(let i=-5;i<=5;i++){
  const x=i*.72;
  egyptRelief(g,[[x-.30,-4.50],[x+.30,-4.50],[x+.22,-4.33],[x,-4.285],[x-.22,-4.33]],.305,.036,i%2?EGYPT_ART.lapis:EGYPT_ART.turquoise,0);
  g.tube([[x-.28,-4.49,.35],[x,-4.30,.35],[x+.28,-4.49,.35]],.012,EGYPT_ART.gold,1,5);
  g.box(x,-4.40,.358,.025,.13,.025,EGYPT_ART.edge,1);
 }
 // The title-side collar stays below y=4.50 and behind the exposed chase.
 bevelBox(g,[0,4.325,-.075],8.08,.23,.22,EGYPT_ART.deep,0,.018,.035);
 for(const side of [-1,1])for(let i=0;i<7;i++){
  const x=side*(2.65+i*.16);
  egyptRelief(g,[[x-.055,4.20],[x+.055,4.20],[x+.08,4.42],[x,4.49],[x-.08,4.42]],.13,.025,i%2?EGYPT_ART.gold:EGYPT_ART.turquoise,1);
 }
 buildEgyptianTempleArchitecture(g);
 return g;
}
