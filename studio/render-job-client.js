class ProfitMenteRenderJobClient{
  constructor({fetchFn,interval=750,maxConsecutiveErrors=8,maxRetryDelay=5000}={}){this.fetchFn=fetchFn||globalThis.fetch?.bind(globalThis);this.interval=interval;this.maxConsecutiveErrors=maxConsecutiveErrors;this.maxRetryDelay=maxRetryDelay;this.jobId=null;this.cancelled=false}
  async json(url,options){
    let r;
    try{r=await this.fetchFn(url,options)}catch(error){error.retryable=true;throw error}
    let data={};try{data=await r.json()}catch{}
    if(!r.ok){const error=new Error(data.error||`Error HTTP ${r.status}`);error.status=r.status;error.retryable=r.status===408||r.status===425||r.status===429||r.status>=500;throw error}
    return data;
  }
  attach(jobId){const id=String(jobId||'').trim();if(!id)throw new Error('ID de render inválido');this.jobId=id;this.cancelled=false;return this.jobId}
  async start(bundle){if(!this.fetchFn)throw new Error('Fetch no disponible');this.cancelled=false;const data=await this.json('/api/render/jobs',{method:'POST',headers:{'Content-Type':'application/x-tar'},body:bundle});if(!data.job_id)throw new Error('El servidor no devolvió un trabajo de render');this.attach(data.job_id);return data}
  async status(){if(!this.jobId)throw new Error('No hay trabajo de render activo');return this.json(`/api/render/jobs/${encodeURIComponent(this.jobId)}`)}
  async result(){if(!this.jobId)throw new Error('No hay trabajo de render activo');const r=await this.fetchFn(`/api/render/jobs/${encodeURIComponent(this.jobId)}/result`);if(!r.ok){let data={};try{data=await r.json()}catch{}throw new Error(data.error||`Error HTTP ${r.status}`)}return r.blob()}
  async cancel(){if(!this.jobId)return {ok:true,status:'idle'};this.cancelled=true;return this.json(`/api/render/jobs/${encodeURIComponent(this.jobId)}`,{method:'DELETE'})}
  async wait(onProgress=()=>{}){
    if(!this.jobId)throw new Error('No hay trabajo de render activo');
    let failures=0;
    for(;;){
      let s;
      try{s=await this.status();failures=0}
      catch(error){
        if(this.cancelled)throw Object.assign(new Error('Render cancelado'),{name:'AbortError'});
        if(!error?.retryable||failures>=this.maxConsecutiveErrors)throw error;
        failures+=1;
        const retryDelay=Math.min(this.maxRetryDelay,Math.max(this.interval,this.interval*(2**Math.min(failures-1,4))));
        onProgress({status:'reconnecting',progress:null,retry:failures,retryDelay,error:error?.message||String(error)});
        await new Promise(resolve=>setTimeout(resolve,retryDelay));
        continue;
      }
      onProgress(s);
      if(s.status==='done')return s;
      if(s.status==='error')throw new Error(s.error||'Falló el render');
      if(s.status==='cancelled'||this.cancelled)throw Object.assign(new Error('Render cancelado'),{name:'AbortError'});
      await new Promise(resolve=>setTimeout(resolve,this.interval));
    }
  }
  reset(){this.jobId=null;this.cancelled=false}
}
if(typeof window!=='undefined')window.ProfitMenteRenderJobClient=ProfitMenteRenderJobClient;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteRenderJobClient;
