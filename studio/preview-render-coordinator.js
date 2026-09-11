(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ProfitMentePreviewRenderCoordinator=api;
  if(typeof window!=='undefined'&&typeof window.renderAt==='function'&&!window.__profitmentePreviewRenderCoordinator){
    const original=window.renderAt;
    const coordinator=api.createCoordinator((time)=>original(time),{
      invalidate:()=>window.ProfitMentePreviewEngine?.invalidate?.()
    });
    window.__profitmentePreviewRenderOriginal=original;
    window.__profitmentePreviewRenderCoordinator=coordinator;
    window.renderAt=(time)=>coordinator.request(time);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function finitePreviewTime(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string')return null;
    const raw=value.trim();
    if(!raw||!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw))return null;
    const parsed=Number(raw);
    return Number.isFinite(parsed)?parsed:null;
  }

  function createCoordinator(render,options={}){
    if(typeof render!=='function')throw new TypeError('render must be a function');
    const invalidate=typeof options?.invalidate==='function'?options.invalidate:null;
    let active=false,pending=null,sequence=0,activeJob=null;
    const stats={requested:0,rendered:0,superseded:0,failed:0,invalidated:0};

    function settleSuperseded(job){
      if(!job)return;
      stats.superseded++;
      job.resolve({status:'superseded',time:job.time,sequence:job.sequence});
    }

    function invalidateActive(){
      if(!activeJob||activeJob.superseded||!invalidate)return false;
      try{
        invalidate();
        activeJob.superseded=true;
        stats.invalidated++;
        return true;
      }catch{
        return false;
      }
    }

    async function pump(){
      if(active)return;
      active=true;
      try{
        while(pending){
          const job=pending;
          pending=null;
          activeJob=job;
          try{
            await render(job.time);
            if(job.superseded)settleSuperseded(job);
            else{
              stats.rendered++;
              job.resolve({status:'rendered',time:job.time,sequence:job.sequence});
            }
          }catch(error){
            if(job.superseded)settleSuperseded(job);
            else{
              stats.failed++;
              job.reject(error);
            }
          }finally{
            if(activeJob===job)activeJob=null;
          }
        }
      }finally{
        active=false;
        activeJob=null;
        if(pending)queueMicrotask(pump);
      }
    }

    function request(time){
      const n=finitePreviewTime(time);
      if(n===null)return Promise.reject(new TypeError('preview time must be a finite numeric scalar'));
      stats.requested++;
      const seq=++sequence;
      return new Promise((resolve,reject)=>{
        invalidateActive();
        if(pending)settleSuperseded(pending);
        pending={time:n,sequence:seq,resolve,reject,superseded:false};
        void pump();
      });
    }

    function snapshot(){return {...stats,active,hasPending:!!pending,sequence,activeSequence:activeJob?.sequence??null};}
    return {request,snapshot};
  }
  return {createCoordinator,finitePreviewTime};
});