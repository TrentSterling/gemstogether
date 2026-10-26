window.auditSocial=()=>{
 const a=__jewel.app,u=a.ui,e=a.expedition,b=u.boardRect,ann=e.announcement,
  intersects=(r,q)=>r&&q&&r.x<q.x+q.w&&r.x+r.w>q.x&&r.y<q.y+q.h&&r.y+r.h>q.y;
 const texts=[],fn=u.text,boxes=[],box=u.ink.box,plaque=u.plaque;
 u.text=function(t,x,y,font,...args){texts.push({t,x,y,font,w:this.measure(t,font)});return fn.call(this,t,x,y,font,...args)};
 u.ink.box=function(x,y,w,h,col,...args){if(['#12343c','#123b42','#08232e'].includes(col))boxes.push({x,y,w,h});return box.call(this,x,y,w,h,col,...args)};
 u.plaque=function(x,y,w,h,...args){boxes.push({x,y,w,h});return plaque.call(this,x,y,w,h,...args)};
 try{a.draw()}finally{u.text=fn;u.ink.box=box;u.plaque=plaque}
 const r=u.socialNoticeLayout(),hits=u.hits.filter(h=>h.kind==='button'),ab=document.getElementById('trontAbout').getBoundingClientRect();
 return{r,mode:e.run.mode,phase:a.phase,board:b,boxes,texts,drawn:texts.some(t=>t.t===ann?.label),safe:!r||(!intersects(r,b)&&!hits.some(h=>intersects(r,h))&&!boxes.some(q=>intersects(r,q))&&!intersects(r,{x:ab.x,y:ab.y,w:ab.width,h:ab.height})&&r.x>=0&&r.y>=0&&r.x+r.w<=a.cssWidth&&r.y+r.h<=a.cssHeight&&u.measure(r.label,r.font)<=r.w-16)};
};
window.runSocialCases=()=>{
 const a=__jewel.app,u=a.ui,e=a.expedition,rows=[];
 const saved=JSON.stringify({board:a.board.cells,score:a.board.score,moves:a.board.moves,run:e.run,profile:e.profile,storage:{...localStorage}}),mode=e.run.mode,tour=e.tourVisible,ann=e.announcement;
 u.toastUntil=-1000;e.tourVisible=false;
 for(const m of ['zen','moves','daily','timed','puzzle'])for(const label of['A LITTLE CHEER','HIGH FIVE','PARTNER x5','CONSTELLATION']){
  e.run.mode=m;e.announce(label,'#8ff7ff',1.8);e.announcement.at=a.time-.25;
  rows.push(auditSocial());
  u.toastMessage='Saved snapshot loaded';u.toastKind='';u.toastUntil=performance.now()+2000;rows.push({...auditSocial(),withToast:true});u.toastUntil=-1000;
 }
 e.run.mode=mode;e.tourVisible=tour;e.announcement=ann;
 return {rows,pure:saved===JSON.stringify({board:a.board.cells,score:a.board.score,moves:a.board.moves,run:e.run,profile:e.profile,storage:{...localStorage}})};
};
