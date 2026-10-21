// Accepted starts hand keyboard control back to the board. An activation held
// through the transition must be released before it can select a new gem.
const runInputHeld=new Set();
window.addEventListener('keydown',e=>{
 if(!['Enter',' '].includes(e.key)||e.ctrlKey||e.metaKey||e.altKey||e.isComposing||e.defaultPrevented||
    e.target?.closest?.('input,select,textarea,button,a,summary,[contenteditable]')||document.getElementById('trontAbout')?.open)return;
 const a=window.__jewel?.app;
 if(a?.runStartKeys?.has(e.key)||e.repeat&&!runInputHeld.has(e.key)){
  e.preventDefault();e.stopImmediatePropagation();return;
 }
 runInputHeld.add(e.key);
},true);
window.addEventListener('keyup',e=>{
 runInputHeld.delete(e.key);window.__jewel?.app?.runStartKeys?.delete(e.key);
},true);
const clearRunInput=()=>{runInputHeld.clear();window.__jewel?.app?.runStartKeys?.clear();};
window.addEventListener('blur',clearRunInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearRunInput();});
JewelApp.prototype.prepareRunInput=function(){
 if(this.ui)this.ui.focus=null;
 this.runStartKeys=new Set(runInputHeld);
};
