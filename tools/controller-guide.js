/* Connection guidance only. Button mapping and shared gameplay remain unchanged. */
const controllerGuideText=id=>/dualsense|dualshock|playstation|054c/i.test(id||'')?
 'Cross select / Hold Cross + direction to swap / Square hint / Triangle point':
 'A select / Hold A + direction to swap / X hint / Y point';
CabinetUI.prototype.controllerGuideLayout=function(w,h,top,right,wide,about,text=this.toastMessage){
 const wrap=(width,font)=>{const lines=[];let line='';for(const word of text.split(' ')){const next=line?line+' '+word:word;if(line&&this.measure(next,font)>width){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;},
  intersects=(r,b)=>b&&r.x<b.x+b.w&&r.x+r.w>b.x&&r.y<b.y+b.h&&r.y+r.h+4>b.y,
  make=(x,y,width,font)=>{const lines=wrap(width-24,font),height=14+lines.length*(font+3);return {x,y,w:width,h:height,font,lineHeight:font+3,lines};};
 if(wide&&h<460){const x=right+16,width=w-x-12,y=Math.max(60,top+this.boardRect.h*.28),r=make(x,y,width,13);if(width>=150&&r.y+r.h+4<h-62&&!intersects(r,about))return r;}
 const titleY=wide?Math.max(5,top-48):Math.max(10,top-93),scoreY=wide?top:Math.max(titleY+47,top-42),width=Math.min(760,w-24),x=(w-width)/2;
 // Prefer free space above the wordmark. On small screens the temporary guide
 // may use the wordmark's space, while score, gems and controls remain clear.
 for(const font of [13,12]){
  const r=make(x,6,width,font);r.y=Math.max(6,titleY-r.h-8);
  if(r.y+r.h+4<=scoreY-3&&!intersects(r,about))return r;
  if(about){r.y=about.y+about.h+4;if(r.y+r.h+4<=scoreY-3&&!intersects(r,about))return r;}
 }
 if(about&&about.x>170){const r=make(12,6,Math.min(width,about.x-24),12);if(r.y+r.h+4<=scoreY-3&&!intersects(r,about))return r;}
 // A short portrait has only the wordmark's rail left. Tighten plaque padding,
 // not the text, to keep four readable lines beside the closed About entry.
 if(about&&about.x>180){const width=about.x-12,lines=wrap(width-12,12),r={x:6,y:1,w:width,h:4+lines.length*15,font:12,lineHeight:15,padding:6,topPadding:2,lines};if(r.y+r.h+4<=scoreY&&!intersects(r,about))return r;}
 // Unusually small viewports retain the full instructions instead of ellipsis.
 return make(x,6,width,12);
};
CabinetUI.prototype.drawControllerGuide=function(w,h,top,right,wide){
 if(this.app.gameOver||this.app.aaCompare||this.app.expedition?.photo)return;
 const host=document.getElementById('trontAbout');if(host?.open)return;
 const b=host?.getBoundingClientRect(),about=b&&b.width&&b.height?{x:b.x,y:b.y,w:b.width,h:b.height}:null,
  r=this.controllerGuideLayout(w,h,top,right,wide,about);
 this.plaque(r.x,r.y,r.w,r.h);for(let i=0;i<r.lines.length;i++)this.text(r.lines[i],r.x+r.w/2,r.y+(r.topPadding??7)+i*r.lineHeight,r.font,UI_ART.highlight,'center',r.w-2*(r.padding??12));
};
