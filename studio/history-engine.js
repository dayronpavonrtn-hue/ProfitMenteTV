(()=>{
  if(typeof window==='undefined'||typeof localStorage==='undefined')return;
  const key='profitmente-project',backupKey='profitmente-project-corrupt-backup';
  const raw=localStorage.getItem(key);if(raw==null)return;
  try{
    const value=JSON.parse(raw);
    if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('invalid project root');
    if(value.clips!=null&&!Array.isArray(value.clips))throw new Error('invalid clips');
  }catch(err){
    try{localStorage.removeItem(key)}catch{}
    try{localStorage.setItem(backupKey,raw)}catch{}
    window.__profitmenteStartupRecovered={reason:'corrupt-project-storage',backupKey};
    console.warn('ProfitMente Studio isolated a corrupt startup project and preserved a backup.',err);
  }
})();

class ProfitMenteHistoryEngine{
  constructor(limit=60){this.limit=limit;this.undoStack=[];this.redoStack=[];this.locked=false;this.last=null}
  snapshot(project){return JSON.stringify(project)}
  seed(project){this.last=this.snapshot(project);this.undoStack=[];this.redoStack=[]}
  capture(project){if(this.locked)return;const next=this.snapshot(project);if(next===this.last)return;if(this.last)this.undoStack.push(this.last);if(this.undoStack.length>this.limit)this.undoStack.shift();this.last=next;this.redoStack=[]}
  undo(project){if(!this.undoStack.length)return null;this.redoStack.push(this.snapshot(project));const state=this.undoStack.pop();this.last=state;return JSON.parse(state)}
  redo(project){if(!this.redoStack.length)return null;this.undoStack.push(this.snapshot(project));const state=this.redoStack.pop();this.last=state;return JSON.parse(state)}
  get canUndo(){return this.undoStack.length>0}
  get canRedo(){return this.redoStack.length>0}
}
window.ProfitMenteHistoryEngine=ProfitMenteHistoryEngine;