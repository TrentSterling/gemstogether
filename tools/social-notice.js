// Read-only placement for idle social notices. Effects and announcement clocks stay shared as before.
CabinetUI.prototype.socialNoticeLayout=function(){
 const a=this.app,e=a.expedition,ann=e?.announcement,b=this.boardRect,age=ann?a.time-ann.at:-1;
 if(!b||!ann||age<0||age>=ann.duration||a.phase!=='idle'||a.panelOpen||a.gameOver||a.aaCompare||e.photo||e.run.finished||document.getElementById('trontAbout')?.open)return null;
 if(['controller','ornament'].includes(this.toastKind)&&this.toastUntil+260>performance.now())return null;
 const host=document.getElementById('trontAbout'),box=host?.getBoundingClientRect(),about=box?.width?{x:box.x,y:box.y,w:box.width,h:box.height}:null,
  overlaps=(r,q)=>r.x<q.x+q.w+2&&r.x+r.w+2>q.x&&r.y<q.y+q.h+2&&r.y+r.h+2>q.y,
  score=this.plaqueAt?{x:this.plaqueAt[0],y:this.plaqueAt[1],w:this.plaqueAt[2],h:this.plaqueAt[3]+100}:{x:0,y:Math.max(Math.max(10,b.y-93)+47,b.y-42),w:a.cssWidth,h:34},
  stage=this.celebrationLayout()?.stage,
  compact=this.wide&&a.cssHeight<460,
  toastText=this.fitLine(this.toastMessage||'',compact?Math.max(80,a.cssWidth-b.x-b.w-56):a.cssWidth-58,13),
  toastWidth=Math.min(a.cssWidth-22,this.measure(toastText,13)+32),
  toast=this.toastUntil+260>performance.now()?{x:compact?a.cssWidth-toastWidth-12:(a.cssWidth-toastWidth)/2,y:compact?Math.max(60,b.y+b.h*.28):this.wide?a.cssHeight-43:Math.max(6,b.y-136),w:toastWidth,h:48}:null,
  // Short landscape budgets may mirror into this side of the cabinet.
  budget=e.run.mode!=='zen'&&!a.practice?{x:b.x+b.w+12,y:b.y,w:a.cssWidth-b.x-b.w-12,h:80}:null,
  sideChain=a.comboEnd&&this.lastCascade>1&&a.time<a.comboEnd+.3?{x:b.x+b.w+12,y:b.y+b.h*.31,w:a.cssWidth-b.x-b.w-12,h:136}:null,
  obstacles=[b,score,about,stage,toast,budget,sideChain,...this.hits.filter(q=>q.kind==='button')].filter(Boolean),
  make=(x,y,w,font)=>({x,y,w,h:font+10,font,label:ann.label}),
  fits=r=>r.w>=100&&r.x>=4&&r.y>=4&&r.x+r.w<=a.cssWidth-4&&r.y+r.h<=a.cssHeight-4&&this.measure(ann.label,r.font)<=r.w-16&&!obstacles.some(q=>overlaps(r,q));
 // A broad side margin retains a large plaque clear of the side cascade meter.
 const right=b.x+b.w+22,width=Math.min(310,a.cssWidth-right-12);
 for(const y of[b.y+10,b.y+b.h-50])for(const font of[24,20,16]){
  const r=make(right,y,width,font);
  if(fits(r))return r;
 }
 // In Endless, the gap above the controls has no challenge budget to cover.
 // First-run guidance's hit rectangle remains an obstacle.
 if(e.run.mode==='zen'&&!a.practice){
  const w=Math.min(340,a.cssWidth-24,b.w+100),x=(a.cssWidth-w)/2;
  for(const font of[18,16,14,12]){const r=make(x,b.y+b.h+3,w,font);if(fits(r))return r;}
 }
 // Compact challenge layouts can use spare upper space, leaving the wordmark,
 // score and all budget information intact. If no space fits, only text yields.
 const titleY=this.wide?Math.max(5,b.y-48):Math.max(10,b.y-93);
 for(const font of[20,16,12]){
  const w=Math.min(340,a.cssWidth-24),r=make((a.cssWidth-w)/2,Math.max(6,titleY-font-22),w,font);
  if(r.y+r.h+4<titleY&&fits(r))return r;
 }
 return null;
};
CabinetUI.prototype.drawSocialNotice=function(ann,age){
 const a=this.app,p=this.ink;
 if(a.phase!=='idle'){
  const {cx,cy,bw}=this.boardBox();
  this.text(ann.label,cx,cy-bw*.28,Math.min(36,bw*.08)*(1+.3*Math.exp(-age*12)),ann.col,'center',bw*1.1,.15,true);
  return;
 }
 const r=this.socialNoticeLayout();if(!r)return;
 p.box(r.x,r.y,r.w,r.h,'#071418',5,.94);p.box(r.x,r.y,3,r.h,ann.col,1,1);
 this.text(ann.label,r.x+r.w/2,r.y+5,r.font,ann.col,'center',r.w-16,.15,true);
};
