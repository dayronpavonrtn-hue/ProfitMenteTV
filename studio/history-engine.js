class ProfitMenteHistoryEngine{
  constructor(limit=60){
    const parsed=Number(limit);
    this.limit=Number.isFinite(parsed)?Math.max(1,Math.min(500,Math.floor(parsed))):60;
    this.undoStack=[];this.redoStack=[];this.locked=false;this.last=null;
  }
  snapshot(project){return JSON.stringify(project)}
  seed(project){this.last=this.snapshot(project);this.undoStack=[];this.redoStack=[]}
  trim(stack){while(stack.length>this.limit)stack.shift()}
  capture(project){
    if(this.locked)return false;
    const next=this.snapshot(project);
    if(next===this.last)return false;
    if(this.last)this.undoStack.push(this.last);
    this.trim(this.undoStack);
    this.last=next;
    this.redoStack=[];
    return true;
  }
  undo(project){
    if(!this.undoStack.length)return null;
    const current=this.last||this.snapshot(project);
    this.redoStack.push(current);
    this.trim(this.redoStack);
    const state=this.undoStack.pop();
    this.last=state;
    return JSON.parse(state);
  }
  redo(project){
    if(!this.redoStack.length)return null;
    const current=this.last||this.snapshot(project);
    this.undoStack.push(current);
    this.trim(this.undoStack);
    const state=this.redoStack.pop();
    this.last=state;
    return JSON.parse(state);
  }
  get canUndo(){return this.undoStack.length>0}
  get canRedo(){return this.redoStack.length>0}
}
window.ProfitMenteHistoryEngine=ProfitMenteHistoryEngine;