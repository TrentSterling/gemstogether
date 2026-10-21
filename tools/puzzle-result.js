// Result feedback reads the existing shared goal state, never the score.
GemsExpedition.prototype.puzzleResultSummary=function(){
 const r=this.run;if(r.mode!=='puzzle'||!r.finished)return null;
 const puzzle=EXPEDITION_PUZZLES[r.puzzle];if(!puzzle)return null;
 const done=this.puzzleWon();let title,tip;
 if(puzzle.goal==='targets'){title=done?'All marked gems cleared':'Marked gems: '+r.targets.length+' left';tip='Clear every marked gem';}
 else if(puzzle.goal==='blast'){title=done?'Blast gem forged':'Blast gem still needed';tip='Match 4 in a line';}
 else if(puzzle.goal==='prism'){title=done?'Prism forged':'Prism still needed';tip='Match 5 in a line';}
 else {title='Best chain: '+r.bestChain+' / 5';tip='Reach a 5-wave cascade';}
 return {title,detail:done?'Puzzle goal reached':tip};
};
const puzzleResultCommit=GemsExpedition.prototype.commitResult;
GemsExpedition.prototype.commitResult=function(...args){
 const before=this.committed,result=puzzleResultCommit.apply(this,args);
 if(this.committed!==before){
  const summary=this.puzzleResultSummary();
  if(summary)document.getElementById('accessibility-status').textContent=this.run.reason+'. '+summary.title+'. '+summary.detail+'.';
 }
 return result;
};
