(()=>{
  class ProfitMenteProjectHistoryEngine{
    constructor(initial,{limit=80}={}){
      this.limit=this.normalizeLimit(limit,80);
      this.undoStack=[];
      this.redoStack=[];
      this.current=this.clone(this.validSnapshot(initial)?initial:{});
    }
    clone(value){return JSON.parse(JSON.stringify(value??{}))}
    key(value){return JSON.stringify(value??{})}
    normalizeLimit(value,fallback=80){
      const n=Number(value),base=Number(fallback);
      const safe=Number.isFinite(n)&&n>0?n:(Number.isFinite(base)&&base>0?base:80);
      return Math.min(500,Math.max(5,Math.floor(safe)));
    }
    validSnapshot(value){return !!value&&typeof value==='object'&&!Array.isArray(value)}
    validStack(value){return Array.isArray(value)&&value.every(item=>this.validSnapshot(item))}
    commit(next){
      if(!this.validSnapshot(next))return false;
      const snapshot=this.clone(next);
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
      if(this.redoStack.length>this.limit)this.redoStack.splice(0,this.redoStack.length-this.limit);
      this.current=this.undoStack.pop();
      return this.clone(this.current);
    }
    redo(){
      if(!this.canRedo())return null;
      this.undoStack.push(this.clone(this.current));
      if(this.undoStack.length>this.limit)this.undoStack.splice(0,this.undoStack.length-this.limit);
      this.current=this.redoStack.pop();
      return this.clone(this.current);
    }
    reset(value){
      this.undoStack=[];this.redoStack=[];this.current=this.clone(this.validSnapshot(value)?value:{});
      return this.clone(this.current);
    }
    exportState(){
      return this.clone({limit:this.limit,undoStack:this.undoStack,redoStack:this.redoStack,current:this.current});
    }
    importState(state){
      if(!state||typeof state!=='object'||Array.isArray(state)||!this.validStack(state.undoStack)||!this.validStack(state.redoStack)||!this.validSnapshot(state.current))return false;
      try{
        const nextLimit=this.normalizeLimit(state.limit,this.limit||80);
        const nextUndo=this.clone(state.undoStack).slice(-nextLimit);
        const nextRedo=this.clone(state.redoStack).slice(-nextLimit);
        const nextCurrent=this.clone(state.current);
        // Validate the fully cloned transaction before replacing live history.
        if(!this.validStack(nextUndo)||!this.validStack(nextRedo)||!this.validSnapshot(nextCurrent))return false;
        this.limit=nextLimit;
        this.undoStack=nextUndo;
        this.redoStack=nextRedo;
        this.current=nextCurrent;
        return true;
      }catch{return false}
    }
    state(){return {undo:this.undoStack.length,redo:this.redoStack.length,limit:this.limit}}
  }
  if(typeof window!=='undefined')window.ProfitMenteProjectHistoryEngine=ProfitMenteProjectHistoryEngine;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteProjectHistoryEngine;
})();
