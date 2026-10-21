// Teach the input the player is using; swapping and tutorial dismissal stay original.
CabinetUI.prototype.firstRunFooterText=function(){return this.app.lastInputDevice==='keyboard'?'Arrows move / Space or Enter selects / select a neighbour to swap':'Tap a gem, then its neighbour';};
CabinetUI.prototype.keyboardTutorialLayout=function(){
 const a=this.app,b=this.boardRect;if(!b)return null;
 const overlap=(r,q)=>r.x<q.x+q.w+2&&r.x+r.w+2>q.x&&r.y<q.y+q.h+2&&r.y+r.h+2>q.y,
  box=document.getElementById('trontAbout')?.getBoundingClientRect?.(),about=box?.width?{x:box.x,y:box.y,w:box.width,h:box.height}:null,
  obstacles=[b,about,...this.hits.filter(h=>h.id!=='exp-dismiss')].filter(Boolean),
  fits=r=>r.w>0&&r.x>=0&&r.y>=0&&r.x+r.w<=a.cssWidth&&r.y+r.h<=a.cssHeight&&!obstacles.some(q=>overlap(r,q))&&r.lines.every(t=>this.measure(t,r.font)<=r.w-2*r.padding),
  card=(x,y,w,font,button)=>{const padding=button?8:4,lineHeight=font+3,words=(button?'Arrows move. Space or Enter selects. Pick a neighbour to swap.':'Arrows move. Space selects. Select a neighbour to swap.').split(' '),lines=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(line&&this.measure(next,font)>w-2*padding){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return{x,y,w,h:padding*2+lines.length*lineHeight+(button?40:0),font,lineHeight,padding,lines,button,card:true};};
 if(this.plaqueAt){const[x,y,w,h]=this.plaqueAt,r=card(x,y+h+(a.cssHeight<460?90:108),w,12,true);if(fits(r))return r;}
 else{const lines=['Arrows move / Space selects','Pick a neighbour to swap'],w=Math.max(...lines.map(t=>this.measure(t,11)))+8,r={x:(a.cssWidth-w)/2,y:b.y+b.h+2,w,h:24,font:11,lineHeight:12,padding:0,lines};if(fits(r))return r;}
 // Short windows use the spare right margin, never the board or control rail.
 const x=b.x+b.w+12,w=Math.min(208,a.cssWidth-x-12),r=card(x,Math.max(64,b.y+4),w,w>=120?12:11,w>=120);if(fits(r))return r;
 return null;
};
CabinetUI.prototype.drawFirstRunHint=function(){
 const a=this.app,e=a.expedition,keyboard=a.lastInputDevice==='keyboard',visible=e?.tourVisible&&a.board.moves===0&&e.run.mode==='zen'&&!a.practice&&!a.gameOver;
 if(!visible||!keyboard)this.keyboardTutorialAnnounced=false;
 if(!visible)return;
 if(keyboard){
  // Controller connection and other active notices own their presentation slot.
  if(performance.now()<=this.toastUntil+260)return;
  const r=this.keyboardTutorialLayout();
  if(r){if(r.card)this.plaque(r.x,r.y,r.w,r.h,true);for(let i=0;i<r.lines.length;i++)this.text(r.lines[i],r.x+r.w/2,r.y+r.padding+i*r.lineHeight,r.font,UI_ART.highlight,'center',r.w-2*r.padding);
   if(r.button)this.button('exp-dismiss','Got it',r.x+7,r.y+r.h-39,r.w-14,32);else this.hit('exp-dismiss',r.x,r.y,r.w,r.h,'button',null,'Dismiss keyboard hint');}
  const n=a.coop,ann=e.announcement,annAge=ann?a.time-ann.at:-1;
  if(!this.keyboardTutorialAnnounced&&!a.panelOpen&&!a.aaCompare&&!e.photo&&!n?.pending&&!n?.spectator&&!n?.electing&&!(n?.role==='peer'&&!n.synced)&&!document.activeElement?.matches('input,select,textarea,button,a,summary')&&!document.getElementById('trontAbout')?.open&&performance.now()>this.toastUntil+260&&!(ann&&annAge>=0&&annAge<ann.duration)&&!this.hits.some(h=>h.id===this.focus)){
   document.getElementById('accessibility-status').textContent='Arrow keys move the cursor. Space or Enter selects a gem. Select its neighbour to swap. Escape clears selection.';this.keyboardTutorialAnnounced=true;
  }
  return;
 }
 // Retain the existing touch/mouse/controller hint and hit boxes byte for byte.
 if(this.plaqueAt){const [x,y,w,h]=this.plaqueAt,yy=y+h+(a.cssHeight<460?100:118);if(a.cssHeight<460){this.text('Tap a gem, then its',x+4,yy,11,UI_ART.highlight,'left',w-8);this.text('neighbour to swap.',x+4,yy+21,11,UI_ART.highlight,'left',w-8);this.hit('exp-dismiss',x,yy,w,42,'button',null,'Dismiss first-run hint');}else{this.plaque(x,yy-10,w,125,true);const end=this.paragraph('Tap a gem, then its neighbour.',x+8,yy,w-16,13,UI_ART.highlight);this.text('Drag and controller also work.',x+8,end+4,10,UI_ART.dim,'left',w-16);this.button('exp-dismiss','Got it',x+7,end+28,w-14,32);}}else{const {cx,bw}=this.boardBox(),y=this.boardRect.y+this.boardRect.h+8;this.text('Tap a gem, then its neighbour',cx,y,11,UI_ART.highlight,'center',bw-8);this.hit('exp-dismiss',cx-bw/2,y-3,bw,20,'button',null,'Dismiss first-run hint');}
};
