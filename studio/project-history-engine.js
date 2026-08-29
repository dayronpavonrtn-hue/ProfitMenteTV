(()=>{
  class ProfitMenteProjectHistoryEngine{
    constructor(initial,{limit=80}={}){
      this.limit=Math.max(5,Number(limit)||80);
      this.undoStack=[];
      this.redoStack=[];
      this.current=this.clone(initial||{});
    }
    clone(value){return JSON.parse(JSON.stringify(value??{}))}
    key(value){return JSON.stringify(value??{})}
    commit(next){
      const snapshot=this.clone(next||{});
      if(this.key(snapshot)===this.key(this.current))return false;
      this.undoStack.push(this.clone(this.current));
      if(this.undoStack.length>this.limit)this.undoStack.splice(0,this.undoStack.length-this.limit);
      this.current=snapshot;
      this.redoStack=[];
      return true;
    }
    canUndo(){return this.undoStack.length>0}
    canRedo(){return this.redoStack.length>0}
    undo(){
      if(!this.canUndo())return null;
      this.redoStack.push(this.clone(this.current));
      this.current=this.undoStack.pop();
      return this.clone(this.current);
    }
    redo(){
      if(!this.canRedo())return null;
      this.undoStack.push(this.clone(this.current));
      this.current=this.redoStack.pop();
      return this.clone(this.current);
    }
    reset(value){
      this.undoStack=[];this.redoStack=[];this.current=this.clone(value||{});
      return this.clone(this.current);
    }
    state(){return {undo:this.undoStack.length,redo:this.redoStack.length,limit:this.limit}}
  }
  if(typeof window!=='undefined')window.ProfitMenteProjectHistoryEngine=ProfitMenteProjectHistoryEngine;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteProjectHistoryEngine;
})();
