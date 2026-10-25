// Titles share measured space. The world keeps the spectacle; idle gems stay clear.
CabinetUI.prototype.celebrationLayout=function(){
 const a=this.app,b=this.boardRect,e=a.expedition,t=a.time;
 if(!b||a.panelOpen||a.gameOver||a.aaCompare||e?.photo||e?.run.finished||document.getElementById('trontAbout')?.open)return null;
 const alive=(o,L)=>o&&t>=o.birth&&t-o.birth<=L;
 // Resonance has its own short headline. Never pile another title onto it.
 if(alive(this.rc,1.6)||alive(this.rp,2.4))return null;
 const co=alive(this.co,1.2)&&a.phase!=='idle'?this.co:null,sc=alive(this.sc,2.6)?this.sc:null;
 if(!co&&!sc)return null;
 const w=Math.min(b.w*.9,a.cssWidth-24),x=b.x+(b.w-w)/2;
 let combo=null,stage=null;
 if(co){
  const age=t-co.birth,slam=a.prefs.motion?1+1.5*Math.exp(-age*15):1,
   raw=b.w*(.19+.045*Math.min(Math.max(0,co.c-3),6)),number='x'+co.c,
   size=Math.min(raw*slam,b.h*(sc?.31:.43),w/Math.max(1,this.measure(number,1))),
   font=Math.min(raw*.3*Math.max(1,slam*.9),w/Math.max(1,this.measure(co.name,1))),
   h=size+font+10,y=b.y+(sc?b.h*.06:(b.h-h)*.5);
  combo={x,y,w,h,size,font,number,name:co.name,age,c:co.c};
 }
 if(sc&&!(a.phase==='idle'&&['controller','ornament'].includes(this.toastKind)&&this.toastUntil+260>performance.now())){
  const age=t-sc.birth,h=Math.min(104,b.h*.23),font=Math.min(b.w*.09,(w-20)/Math.max(1,this.measure(sc.name,1)),h*.39);
  stage={x,y:b.y+b.h*.68,w,h,font,age,info:sc,docked:false};
  if(a.phase==='idle'){
   // Only use spare margins. On very small windows the permanent stage HUD
   // carries the name once play resumes; a transient title never covers input.
   const right=b.x+b.w+22,top=this.wide?b.y+b.h*.31+136:8,
    available=this.wide?{x:right,y:top,w:a.cssWidth-right-12,h:b.y+b.h-top}:{x:12,y:8,w:a.cssWidth-24,h:b.y-154};
   const sh=64,sw=Math.min(300,available.w),sx=this.wide?available.x:(a.cssWidth-sw)/2,
    rect={x:sx,y:available.y,w:sw,h:sh},host=document.getElementById('trontAbout'),ab=host?.getBoundingClientRect(),
    obstacles=[...this.hits.filter(q=>q.kind==='button'),...(ab?.width?[{x:ab.x,y:ab.y,w:ab.width,h:ab.height}]:[])],
    overlap=q=>rect.x<q.x+q.w+4&&rect.x+rect.w+4>q.x&&rect.y<q.y+q.h+4&&rect.y+rect.h+4>q.y;
   stage=sw>=150&&available.h>=sh&&!obstacles.some(overlap)?{...stage,...rect,font:Math.min(25,(sw-20)/Math.max(1,this.measure(sc.name,1))),docked:true}:null;
  }
 }
 return combo||stage?{combo,stage}:null;
};
CabinetUI.prototype.drawCallout=function(){
 const a=this.app;if(this.co&&a.time-this.co.birth>1.2)this.co=null;
 const q=this.celebrationLayout()?.combo;if(!q)return;const p=this.ink,
  col=q.c>=9?(a.prefs.motion?gemHex(((a.time*10)|0)%6):TIER_COLS[3]):TIER_COLS[Math.min(q.c,9)];
 p.opacity=Math.min(1,q.age*18)*clamp((1.2-q.age)/.32,0,1);
 this.text(q.number,q.x+q.w/2,q.y,q.size,col,'center',q.w,.2,true);
 this.text(q.name,q.x+q.w/2,q.y+q.size+10,q.font,'#ffffff','center',q.w,.16,true);p.opacity=1;
};
CabinetUI.prototype.drawStageTitle=function(){
 const a=this.app;if(this.sc&&a.time-this.sc.birth>2.6)this.sc=null;
 const q=this.celebrationLayout()?.stage;if(!q)return;const p=this.ink,col=stageHex(q.info),label='STAGE '+q.info.n+(q.info.loop?'  ENCORE':'');
 p.opacity=Math.min(1,q.age/.12)*clamp((2.6-q.age)/.4,0,1);
 p.box(q.x,q.y,q.w,q.h,'#071418',8,.88);p.box(q.x,q.y,q.w,3,col,1,1);p.box(q.x,q.y+q.h-3,q.w,3,col,1,1);
 this.text(label,q.x+q.w/2,q.y+7,Math.min(16,q.h*.22),'#8ff7ff','center',q.w-20,.12,true);
 this.text(q.info.name,q.x+q.w/2,q.y+q.h*.44,q.font,'#ffffff','center',q.w-20,.18,true);p.opacity=1;
};
