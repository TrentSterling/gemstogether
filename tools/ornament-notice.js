// Earned cabinet rewards stay local. Existing saves never announce retroactively.
GemsExpedition.prototype.ornamentCount=function(){return EXPEDITION_ORNAMENTS.filter(n=>this.profile.gems>=n).length;};
GemsExpedition.prototype.ornamentNoticeAllowed=function(){
 const a=this.a,r=this.run,n=a.coop,ending=(r.mode==='timed'&&r.elapsed>=r.limit)||(['moves','daily','puzzle'].includes(r.mode)&&a.board.moves>=r.limit)||(r.mode==='puzzle'&&this.puzzleWon()),ann=this.announcement,age=ann?a.time-ann.at:0,
  celebrating=[['co',1.2],['rc',1.6],['rp',2.4],['sc',2.6]].some(([key,duration])=>{const q=a.ui?.[key],t=q?a.time-q.birth:-1;return q&&t>=0&&t<=duration;});
 return this.active&&a.phase==='idle'&&!r.finished&&!ending&&!a.gameOver&&!a.panelOpen&&!this.photo&&!a.aaCompare&&!a.frozen&&!n?.pending&&!n?.electing&&!(n?.mirror&&!n.synced)&&!document.getElementById('trontAbout')?.open&&!(ann&&age>=0&&age<ann.duration)&&!celebrating;
};
const ornamentRecordClear=GemsExpedition.prototype.recordClear;
GemsExpedition.prototype.recordClear=function(...args){
 const from=this.ornamentCount(),result=ornamentRecordClear.apply(this,args),to=this.ornamentCount();
 if(to>from)this.ornamentNotice={from:Math.min(this.ornamentNotice?.from??from,from),to};
 return result;
};
GemsExpedition.prototype.updateOrnamentNotice=function(){
 const q=this.ornamentNotice,a=this.a;if(!q)return;
 if(this.ornamentCount()<q.to){this.ornamentNotice=null;return;}
 if(!this.ornamentNoticeAllowed()||!a.ui||a.ui.toastUntil+260>performance.now())return;
 this.ornamentNotice=null;
 const total=EXPEDITION_ORNAMENTS.length,earned=q.to-q.from,message=q.to===total?'All '+total+' ornaments earned! View your treasury in Journey.':earned>1?earned+' new ornaments! Treasury '+q.to+' of '+total+'. Open Journey.':'Ornament '+q.to+' of '+total+' earned! Find it in Journey.';
 a.toast(message,'ornament');
};
const ornamentUpdate=JewelApp.prototype.update;
JewelApp.prototype.update=function(...args){const result=ornamentUpdate.apply(this,args);this.expedition?.updateOrnamentNotice();return result;};
CabinetUI.prototype.drawOrnamentNotice=function(...args){if(this.app.expedition?.ornamentNoticeAllowed())this.drawControllerGuide(...args);};
