// Selection guidance is local presentation, never a change to a swap or save.
CabinetUI.prototype.specialGemTip=function(){
 const a=this.app,i=a.selected,cell=Number.isInteger(i)&&i>=0&&i<64?a.board.cells[i]:null;
 if(!cell||![1,2].includes(cell.special))return null;
 return {cell,text:cell.special===2?'Prism: swap with a neighbour to clear its colour.':'Blast gem: match it to clear a 3 x 3 area.'};
};
CabinetUI.prototype.specialGuideLayout=function(){
 const a=this.app,e=a.expedition,n=a.coop,q=this.specialGemTip(),b=this.boardRect,aboutHost=document.getElementById('trontAbout');
 if(!q||!b||a.phase!=='idle'||a.auto||a.frozen||a.panelOpen||a.gameOver||a.aaCompare||e?.photo||e?.run.finished||n?.spectator||n?.pending||n?.electing||(n?.role==='peer'&&!n.synced)||aboutHost?.open||this.toastUntil+260>performance.now())return null;
 const ann=e?.announcement,age=ann?a.time-ann.at:-1;
 if(ann&&age>=0&&age<ann.duration)return null;
 // The side cascade plaque outlasts its central callout. Read its lifetime
 // directly; comboEase also updates animation state and is not a predicate.
 if(a.comboEnd&&this.lastCascade>1&&a.time<a.comboEnd+.3)return null;
 if([['co',1.2],['rc',1.6],['rp',2.4],['sc',2.6]].some(([key,duration])=>{const v=this[key],t=v?a.time-v.birth:-1;return v&&t>=0&&t<=duration;}))return null;
 const box=aboutHost?.getBoundingClientRect(),about=box?.width&&box?.height?{x:box.x,y:box.y,w:box.width,h:box.height}:null,
  overlaps=(x,y)=>x.x<y.x+y.w+3&&x.x+x.w+3>y.x&&x.y<y.y+y.h+3&&x.y+x.h+3>y.y,
  score=this.plaqueAt?{x:this.plaqueAt[0],y:this.plaqueAt[1],w:this.plaqueAt[2],h:this.plaqueAt[3]}:{x:0,y:Math.max(Math.max(10,b.y-93)+47,b.y-42),w:a.cssWidth,h:34},
  obstacles=[b,score,about,...this.hits.filter(h=>h.kind==='button')].filter(Boolean),
  fits=r=>r.x>=0&&r.y>=0&&r.x+r.w<=a.cssWidth&&r.y+r.h<=a.cssHeight&&!obstacles.some(x=>overlaps(r,x))&&r.lines.every(t=>this.measure(t,r.font)<=r.w-2*(r.padding??12));
 let r=this.controllerGuideLayout(a.cssWidth,a.cssHeight,b.y,b.x+b.w,this.wide,about,q.text);
 // This short rule also fits beside About on the narrowest portrait screens.
 if(!fits(r)&&about&&about.x>132){const width=about.x-12,lines=[];let line='';for(const word of q.text.split(' ')){const next=line?line+' '+word:word;if(line&&this.measure(next,12)>width-12){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);r={x:6,y:1,w:width,h:4+lines.length*15,font:12,lineHeight:15,padding:6,topPadding:2,lines};}
 // Extremely small windows may have no spare space. Never cover gameplay.
 if(!fits(r))return null;
 return {...r,text:q.text,cell:q.cell};
};
CabinetUI.prototype.drawSpecialGuide=function(){
 const selection=this.specialGemTip()?.cell??null;
 if(this.specialGuideSelection!==selection){this.specialGuideSelection=selection;this.specialGuideAnnounced=null;}
 const r=this.specialGuideLayout();if(!r)return;
 this.plaque(r.x,r.y,r.w,r.h);for(let i=0;i<r.lines.length;i++)this.text(r.lines[i],r.x+r.w/2,r.y+(r.topPadding??7)+i*r.lineHeight,r.font,UI_ART.aqua,'center',r.w-2*(r.padding??12));
 // A later status message owns the live region until a different selection.
 if(this.specialGuideAnnounced!==r.cell){this.specialGuideAnnounced=r.cell;document.getElementById('accessibility-status').textContent=r.text;}
};
const specialGuideDrawHUD=CabinetUI.prototype.drawHUD;
CabinetUI.prototype.drawHUD=function(){specialGuideDrawHUD.call(this);this.drawSpecialGuide();};
