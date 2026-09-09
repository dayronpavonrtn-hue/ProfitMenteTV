(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ProfitMentePreviewRenderCoordinator=api;
  if(typeof window!=='undefined'&&typeof window.renderAt==='function'&&!window.__profitmentePreviewRenderCoordinator){
    const original=window.renderAt;
    const coordinator=api.createCoordinator((time)=>original(time));
    window.__profitmentePreviewRenderOriginal=original;
    window.__profitmentePreviewRenderCoordinator=coordinator;
    window.renderAt=(time)=>coordinator.request(time);
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function createCoordinator(render){
    if(typeof render!=='function')throw new TypeError('render must be a function');
    let active=false,pending=null,sequence=0;
    const stats={requested:0,rendered:0,superseded:0,failed:0};

    function settleSuperseded(job){
      if(!job)return;
      stats.superseded++;
      job.resolve({status:'superseded',time:job.time,sequence:job.sequence});
    }

    async function pump(){
      if(active)return;
      active=true;
      try{
        while(pending){
          const job=pending;
          pending=null;
          try{
            await render(job.time);
            stats.rendered++;
            job.resolve({status:'rendered',time:job.time,sequence:job.sequence});
          }catch(error){
            stats.failed++;
            job.reject(error);
          }
        }
      }finally{
        active=false;
        if(pending)queueMicrotask(pump);
      }
    }

    function request(time){
      const n=Number(time);
      if(!Number.isFinite(n))return Promise.reject(new TypeError('preview time must be finite'));
      stats.requested++;
      const seq=++sequence;
      return new Promise((resolve,reject)=>{
        if(pending)settleSuperseded(pending);
        pending={time:n,sequence:seq,resolve,reject};
        void pump();
      });
    }

    function snapshot(){return {...stats,active,hasPending:!!pending,sequence};}
    return {request,snapshot};
  }
  return {createCoordinator};
});