(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ProfitMentePreviewRenderCoordinator=api;
  if(typeof window!=='undefined'&&typeof window.renderAt==='function'&&!window.__profitmentePreviewRenderCoordinator){
    const original=window.renderAt;
    const coordinator=api.createCoordinator((time)=>original(time),{
      invalidate:()=>window.ProfitMentePreviewEngine?.invalidate?.(),
      timeoutMs:5000
    });
    window.__profitmentePreviewRenderOriginal=original;
    window.__profitmentePreviewRenderCoordinator=coordinator;
    window.renderAt=api.createSafePreviewRequest(coordinator,{
      onTimeout:(error)=>{
        console.warn('Preview frame timed out; continuing with the newest requested frame',error);
        try{window.setStatus?.('Preview recuperado de un fotograma atascado')}catch{}
      }
    });
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

  function finiteTimeout(value,fallback=5000){
    const parsed=typeof value==='number'?value:Number(value);
    return Number.isFinite(parsed)&&parsed>0?Math.max(50,Math.floor(parsed)):fallback;
  }

  function previewTimeoutError(time,timeoutMs){
    const error=new Error(`Preview frame timed out after ${timeoutMs} ms at ${time}s`);
    error.name='PreviewRenderTimeoutError';
    error.code='PREVIEW_RENDER_TIMEOUT';
    error.time=time;
    error.timeoutMs=timeoutMs;
    return error;
  }

  function createCoordinator(render,options={}){
    if(typeof render!=='function')throw new TypeError('render must be a function');
    const invalidate=typeof options?.invalidate==='function'?options.invalidate:null;
    const timeoutMs=finiteTimeout(options?.timeoutMs,5000);
    let active=false,pending=null,sequence=0,activeJob=null;
    const stats={requested:0,rendered:0,superseded:0,failed:0,timedOut:0,invalidated:0};

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

    function runWithTimeout(job){
      let timer=null;
      const task=Promise.resolve().then(()=>render(job.time));
      const timeout=new Promise((_,reject)=>{
        timer=setTimeout(()=>reject(previewTimeoutError(job.time,timeoutMs)),timeoutMs);
      });
      return Promise.race([task,timeout]).finally(()=>{if(timer!==null)clearTimeout(timer)});
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
            await runWithTimeout(job);
            if(job.superseded)settleSuperseded(job);
            else{
              stats.rendered++;
              job.resolve({status:'rendered',time:job.time,sequence:job.sequence});
            }
          }catch(error){
            if(job.superseded)settleSuperseded(job);
            else{
              stats.failed++;
              if(error?.code==='PREVIEW_RENDER_TIMEOUT'){
                stats.timedOut++;
                try{invalidate?.()}catch{}
              }
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

    function snapshot(){return {...stats,active,hasPending:!!pending,sequence,activeSequence:activeJob?.sequence??null,timeoutMs};}
    return {request,snapshot};
  }

  function createSafePreviewRequest(coordinator,options={}){
    if(!coordinator||typeof coordinator.request!=='function')throw new TypeError('coordinator.request must be a function');
    const onTimeout=typeof options?.onTimeout==='function'?options.onTimeout:null;
    return async function safePreviewRequest(time){
      try{return await coordinator.request(time)}
      catch(error){
        if(error?.code!=='PREVIEW_RENDER_TIMEOUT')throw error;
        try{onTimeout?.(error)}catch{}
        return {status:'timed-out',time:error.time,timeoutMs:error.timeoutMs,error};
      }
    };
  }

  return {createCoordinator,createSafePreviewRequest,finitePreviewTime,finiteTimeout,previewTimeoutError};
});