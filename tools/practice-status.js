// Practice keeps the spectacle, but must not masquerade as a saved run.
// This card only reads existing state; Play retains its existing mode picker.
CabinetUI.prototype.practiceStatusLayout=function(){
 const a=this.app,b=this.boardRect,label=a.auto?'SHOWCASE':'PRACTICE';
 if(!a.practice||!b||a.panelOpen||a.gameOver||a.aaCompare||a.expedition?.photo||document.getElementById('trontAbout')?.open)return null;
 const card=(x,y,w)=>{
  const padding=w<110?4:8,wrap=text=>{const lines=[];let line='';for(const word of text.split(' ')){const next=line?line+' '+word:word;if(line&&this.measure(next,12)>w-padding*2){lines.push(line);line=word;}else line=next;}lines.push(line);return lines;},
   detail=wrap(w<110?'Progress not saved':'No progress saved'),route=wrap('New run: Play'),lines=[label,...detail,...route];
  return {x,y,w,h:38+17*(lines.length-1),font:12,padding,titleFont:this.measure(label,16)<=w-padding*2?16:12,label,lines,routeStart:1+detail.length,strip:false};
 };
 if(this.plaqueAt){const[x,y,w,h]=this.plaqueAt,r=card(x,y+h+12,w),rail=Math.min(a.cssHeight-cabinetFraming(a.cssWidth,a.cssHeight).railReserve,b.y+b.h+28);if(r.y+r.h+4>rail){r.x=a.cssWidth-x-w;r.y=b.y+7;}return r;}
 // A near-square landscape can also run out of space above the control rail.
 const reserve=cabinetFraming(a.cssWidth,a.cssHeight).railReserve;
 if(a.cssWidth>a.cssHeight&&(a.cssHeight<460||b.y+b.h+28>a.cssHeight-reserve))return b.x<134?card(6,b.y+7,b.x-12):card(12,b.y+7,b.x-24);
 const {cx,bw}=this.boardBox(),w=Math.max(bw,Math.min(320,a.cssWidth-24));
 return {x:cx-w/2,y:b.y+b.h+6,w,h:22,font:11,label,lines:[label+' / no progress saved / Play'],strip:true};
};
CabinetUI.prototype.practiceStatus=function(){
 const r=this.practiceStatusLayout();if(!r)return;
 this.ink.box(r.x,r.y,r.w,r.h,'#12343c',5,1);
 if(r.strip)this.text(r.lines[0],r.x+r.w/2,r.y+3,r.font,UI_ART.highlight,'center',r.w-8,.12,true);
 else{this.text(r.lines[0],r.x+r.padding,r.y+7,r.titleFont,UI_ART.highlight,'left',r.w-r.padding*2,.12,true);for(let i=1;i<r.lines.length;i++)this.text(r.lines[i],r.x+r.padding,r.y+32+(i-1)*17,r.font,i>=r.routeStart?UI_ART.aqua:UI_ART.text,'left',r.w-r.padding*2);}
};
const practiceToggleDemo=JewelApp.prototype.toggleDemo;
JewelApp.prototype.toggleDemo=function(...args){
 const before=this.auto,result=practiceToggleDemo.apply(this,args);
 if(this.auto!==before&&this.practice)document.getElementById('accessibility-status').textContent=(this.auto?'Showcase.':'Practice continues.')+' Progress is not saved. Open Play to start a new run.';
 return result;
};
