/* Royal solar assemblies: fixed meshes animated by accepted-match presentation only. */
function buildEgyptianSolarSeal(){
 const g=new Geo(),rim=[];
 for(let i=0;i<16;i++){const a=i/16*TAU;rim.push([Math.cos(a)*.62,Math.sin(a)*.76]);}
 egyptRelief(g,rim,-.05,.065,EGYPT_ART.gold);
 egyptRelief(g,rim.map(([x,y])=>[x*.84,y*.86]),.025,.035,EGYPT_ART.deep,0);
 egyptRelief(g,rim.map(([x,y])=>[x*.69,y*.73]),.063,.022,EGYPT_ART.lapis,0);
 egyptAnkh(g,0,.08,.13,.86,EGYPT_ART.edge,1);
 for(const side of [-1,1])for(let i=0;i<4;i++){
  const y=-.45+i*.27,x=side*(.49-Math.abs(y)*.12);
  egyptRelief(g,[[x-.04,y],[x,y+.07],[x+.04,y],[x,y-.07]],.10,.025,EGYPT_ART.turquoise,0);
 }
 return g;
}
function buildEgyptianSolarShutter(){
 const g=new Geo();
 const p=[[0,-.10],[.54,-.20],[1.35,-.08],[1.68,.12],[1.02,.34],[.34,.29],[0,.10]];
 egyptRelief(g,p,0,.10,EGYPT_ART.gold);
 egyptRelief(g,p.map(([x,y])=>[.05+x*.91,y*.70+.025]),.10,.035,EGYPT_ART.lapis,0);
 egyptRelief(g,[[.24,.06],[1.42,.12],[.93,.23],[.34,.20]],.15,.027,EGYPT_ART.turquoise,0);
 g.tube([[.12,.04,.19],[.82,.08,.22],[1.51,.13,.14]],.022,EGYPT_ART.edge,1,5);
 for(let i=0;i<5;i++){const x=.32+i*.18;g.tube([[x,-.09,.14],[x+.16,.10,.21],[x+.13,.24,.14]],.012,EGYPT_ART.gold,1,4);}
 return g;
}
function buildEgyptianSolarFan(){
 const g=new Geo();
 // Broad, layered cloisonne feathers replace wire-only radial rays. The centre stays open.
 for(let i=0;i<24;i++){
  const a=i/24*TAU,point=(r,d)=>[Math.cos(a+d)*r,Math.sin(a+d)*r];
  const p=[point(4.64,-.045),point(5.78,-.075),point(6.72,-.035),point(7.02,0),point(6.70,.035),point(5.76,.075),point(4.64,.045)];
  egyptRelief(g,p,0,.10,EGYPT_ART.gold);
  const q=[point(4.89,-.027),point(5.78,-.052),point(6.68,-.022),point(6.86,0),point(6.68,.022),point(5.78,.052),point(4.89,.027)];
  egyptRelief(g,q,.105,.035,i%3===0?EGYPT_ART.turquoise:EGYPT_ART.lapis,0);
  const spine=[point(4.80,0),point(6.82,0)].map(([x,y])=>[x,y,.16]);g.tube(spine,.019,EGYPT_ART.edge,1,5);
  // Transverse gold ties make each ray a physical assembly, readable at medium size.
  for(const radius of [5.18,5.57])g.tube([point(radius,-.045),point(radius,.045)].map(([x,y])=>[x,y,.15]),.016,EGYPT_ART.gold,1,4);
 }
 g.ring([0,0,.07],4.69,.075,EGYPT_ART.gold,1,'z',96);
 g.ring([0,0,.13],4.82,.025,EGYPT_ART.turquoise,0,'z',96);
 return g;
}
function egyptianSolarEnvelope(age){
 // One charge, opening and return. No periodic modulation or repeated flashes.
 const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
 return {charge:ease(age/.28),unfold:ease((age-.12)/.48),resolve:1-ease((age-1.12)/.98)};
}
