// Reserve room for challenge information and full-height phone controls.
// Start from the legacy framing, recover spare rail spacing, then zoom only
// enough to clear the remaining deficit. Camera, HUD and picking share this.
let cabinetFramingCache=null;
function cabinetFraming(w,h){
 if(cabinetFramingCache?.w===w&&cabinetFramingCache.h===h)return cabinetFramingCache;
 const tan=Math.tan(21*PI/180),aspect=w/h,base=Math.max(14.7,4.75/(tan*aspect)),projection=perspective(42*PI/180,aspect,.1,150),
  view=d=>matMul(projection,lookAt([0,.62,d],[0,0,0],[0,1,0])),stable=view(base),
  left=project([-3.98,4.02,.15],stable,w,h)[0],wide=left>180&&!(h>=320&&h<360&&w>=540);
 let distance=wide?base:Math.max(base,4.23*h/(2*tan*Math.max(72,h*.5-106))),railPitch=50,railReserve=w>=600?57:105,railGap=28;
 if(w<600&&h>=w){
  const bottomAt=d=>project([3.98,-4.1,.15],view(d),w,h)[1],bottom=bottomAt(distance),
   deficit=Math.max(0,bottom+28-(h-105)),compression=Math.min(1,deficit/9);
  railPitch-=6*compression;railReserve-=13*compression;railGap+=4*compression;
  const target=h-railReserve-railGap;
  // A window shorter than all the chrome cannot fit a finite board. Preserve
  // its legacy framing rather than searching beyond the projection's limit.
  if(target>h*.5+1&&bottom>target){
   let lo=distance,hi=distance*2;
   for(let i=0;i<8&&bottomAt(hi)>target;i++)hi*=2;
   for(let i=0;i<20;i++){const mid=(lo+hi)/2;if(bottomAt(mid)>target)lo=mid;else hi=mid;}
   // Leave room inside the 150-unit far plane for the board and its effects.
   // Extremely short windows retain their legacy camera instead of clipping.
   if(hi<140)distance=hi;
  }
 }
 return cabinetFramingCache=Object.freeze({w,h,distance,wide,railPitch,railReserve,railGap});
}
