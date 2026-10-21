// Repeated genuine misses get the existing local hint, after the gems settle.
// This never sends a room message or changes board, score, RNG or saved progress.
JewelApp.prototype.missHintAllowed=function(){
 const co=this.coop;
 return !(this.auto||this.oneShot||this.gameOver||this.expedition?.run?.finished||this.expedition?.photo||this.panelOpen||this.aaCompare||this.frozen||document.getElementById('trontAbout')?.open||co?.pending||co?.spectator||co?.electing||(co?.mirror&&!co.synced));
};
JewelApp.prototype.missHintKey=function(){return this.board.cells.map(t=>t?.id).join(',');};
JewelApp.prototype.noteFailedSwap=function(){
 if(!this.missHintAllowed()){this.missHint=null;return;}
 const key=this.missHintKey(),old=this.missHint,epoch=this.coop?.epoch,
  same=old&&old.cells===this.board.cells&&old.moves===this.board.moves&&old.key===key&&old.epoch===epoch&&this.time>=old.last,
  attempts=[...(same?old.attempts.filter(t=>this.time-t<=12):[]),this.time].slice(-3);
 this.missHint={cells:this.board.cells,moves:this.board.moves,key,epoch,attempts,count:attempts.length,last:this.time,readyAt:this.time+2*FEEL.swap+BOUNCE_HOLD+.05};
};
JewelApp.prototype.updateMissHint=function(){
 const miss=this.missHint;if(!miss)return;
 if(!this.missHintAllowed()||miss.cells!==this.board.cells||miss.moves!==this.board.moves||miss.epoch!==this.coop?.epoch||this.time<miss.last||this.time-miss.last>12||this.hintCells.length){this.missHint=null;return;}
 if(miss.count<3||this.phase!=='idle'||this.time<miss.readyAt||this.time<(this.bounceUntil||0))return;
 this.missHint=null;
 if(miss.key!==this.missHintKey())return;
 this.hintCells=this.bestMove(false)||[];
 if(this.hintCells.length){this.hintUntil=this.time+4;this.idleSince=this.time;document.getElementById('accessibility-status').textContent='Try swapping the highlighted pair.';}
};
const missHintUpdate=JewelApp.prototype.update;
JewelApp.prototype.update=function(...args){const result=missHintUpdate.apply(this,args);this.updateMissHint();return result;};
const missHintManual=JewelApp.prototype.hint;
JewelApp.prototype.hint=function(...args){const result=missHintManual.apply(this,args);if(this.hintCells.length)this.missHint=null;return result;};
