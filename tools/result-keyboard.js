// Enter a fresh result at its visible actions, then retain the full control cycle.
CabinetUI.prototype.keyboardResultHits=function(){
 const a=this.app;
 return a.gameOver&&!a.panelOpen&&!a.aaCompare&&!a.expedition?.photo&&!document.getElementById('trontAbout')?.open?
  this.hits.filter(h=>h.kind==='button'&&expeditionResultActions.includes(h.id)):[];
};
CabinetUI.prototype.keyboardResultTarget=function(){return this.keyboardResultHits().some(h=>h.id===this.focus);};
CabinetUI.prototype.enterResultTab=function(e){
 if(e.ctrlKey||e.metaKey||e.altKey||e.isComposing||e.defaultPrevented||e.target?.closest?.('input,select,textarea,button,a,summary,[contenteditable]'))return false;
 const results=this.keyboardResultHits();if(!results.length)return false;
 const a=this.app,key=a.expedition?.run.finished?a.expedition.run.id:a.gameOver,
  fresh=this.resultKeyboardKey!==key,ix=this.hits.findIndex(h=>h.id===this.focus);
 this.resultKeyboardKey=key;
 if(ix<0||fresh)this.focus=results[e.shiftKey?results.length-1:0].id;
 else this.focus=this.hits[(ix+(e.shiftKey?-1:1)+this.hits.length)%this.hits.length]?.id;
 if(results.some(h=>h.id===this.focus))document.getElementById('accessibility-status').textContent=
  ({again:'Play again','exp-next-puzzle':'Next puzzle','exp-endless':'Return to endless'}[this.focus])+'. Press Enter or Space.';
 e.preventDefault();e.stopImmediatePropagation();return true;
};
const resultKeyboardActivate=CabinetUI.prototype.activate;
CabinetUI.prototype.activate=function(id,...args){
 const a=this.app,keyboardResult=a.lastInputDevice==='keyboard'&&this.keyboardResultHits().some(h=>h.id===id),
  result=resultKeyboardActivate.call(this,id,...args);
 // Also cover the optional Endless result, whose legacy replay calls newBoard.
 if(keyboardResult&&!a.gameOver)a.prepareRunInput();
 return result;
};
