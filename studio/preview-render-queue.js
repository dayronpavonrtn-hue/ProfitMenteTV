(function(root){
  class ProfitMentePreviewRenderQueue{
    constructor(renderer){
      if(typeof renderer!=='function')throw new TypeError('renderer must be a function');
      this.renderer=renderer;
      this.pending=null;
      this.running=false;
      this.sequence=0;
      this.lastCompleted=0;
    }
    request(time){
      const id=++this.sequence;
      return new Promise((resolve,reject)=>{
        const job={id,time,resolve,reject};
        if(this.pending){
          this.pending.resolve({id:this.pending.id,skipped:true,reason:'superseded'});
        }
        this.pending=job;
        this._drain();
      });
    }
    async _drain(){
      if(this.running)return;
      this.running=true;
      try{
        while(this.pending){
          const job=this.pending;
          this.pending=null;
          try{
            await this.renderer(job.time);
            this.lastCompleted=job.id;
            job.resolve({id:job.id,skipped:false});
          }catch(error){
            job.reject(error);
          }
        }
      }finally{
        this.running=false;
        if(this.pending)this._drain();
      }
    }
  }
  root.ProfitMentePreviewRenderQueue=ProfitMentePreviewRenderQueue;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMentePreviewRenderQueue;
})(typeof globalThis!=='undefined'?globalThis:this);
