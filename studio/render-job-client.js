class ProfitMenteRenderJobClient{
  constructor({fetchFn,interval=750,maxConsecutiveErrors=8,maxRetryDelay=5000,resultMaxAttempts=3,minResultBytes=24}={}){this.fetchFn=fetchFn||globalThis.fetch?.bind(globalThis);this.interval=interval;this.maxConsecutiveErrors=maxConsecutiveErrors;this.maxRetryDelay=maxRetryDelay;this.resultMaxAttempts=Math.max(1,Number(resultMaxAttempts)||3);this.minResultBytes=Math.max(16,Number(minResultBytes)||24);this.jobId=null;this.cancelled=false}
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
  async validateResultBlob(blob){
    const fail=message=>{const error=new Error(message);error.retryable=true;error.code='INVALID_RENDER_RESULT';throw error};
    if(!blob||!Number.isFinite(Number(blob.size)))fail('El servidor devolvió un resultado de render inválido');
    if(Number(blob.size)<this.minResultBytes)fail(`El MP4 descargado está vacío o truncado (${Number(blob.size)||0} bytes)`);
    const mime=String(blob.type||'').toLowerCase();
    if(mime&&!['video/mp4','application/mp4','application/octet-stream','binary/octet-stream'].includes(mime))fail(`El servidor devolvió ${mime} en lugar de video MP4`);
    try{
      const head=blob.slice?.(0,96)||blob;
      if(typeof head.arrayBuffer!=='function')return blob;
      const bytes=new Uint8Array(await head.arrayBuffer());
      let ftyp=false;
      for(let i=0;i<=bytes.length-4;i+=1){if(bytes[i]===0x66&&bytes[i+1]===0x74&&bytes[i+2]===0x79&&bytes[i+3]===0x70){ftyp=true;break}}
      if(!ftyp)fail('El resultado no contiene una cabecera MP4 válida (ftyp)');
    }catch(error){if(error?.code==='INVALID_RENDER_RESULT')throw error;fail(`No se pudo validar la integridad del MP4: ${error?.message||error}`)}
    return blob;
  }
  async result({maxAttempts=this.resultMaxAttempts,onRetry=()=>{}}={}){
    if(!this.jobId)throw new Error('No hay trabajo de render activo');
    const attempts=Math.max(1,Number(maxAttempts)||1);
    for(let attempt=1;attempt<=attempts;attempt+=1){
      try{
        const r=await this.fetchFn(`/api/render/jobs/${encodeURIComponent(this.jobId)}/result`);
        if(!r.ok){let data={};try{data=await r.json()}catch{}const error=new Error(data.error||`Error HTTP ${r.status}`);error.status=r.status;error.retryable=r.status===408||r.status===425||r.status===429||r.status>=500;throw error}
        return await this.validateResultBlob(await r.blob());
      }catch(error){
        const retryable=error?.retryable===true||error?.status===408||error?.status===425||error?.status===429||Number(error?.status)>=500||!Number.isFinite(Number(error?.status));
        if(!retryable||attempt>=attempts)throw error;
        const retryDelay=Math.min(this.maxRetryDelay,Math.max(this.interval,this.interval*(2**Math.min(attempt-1,4))));
        onRetry({attempt,nextAttempt:attempt+1,retryDelay,error:error?.message||String(error),code:error?.code||null});
        await new Promise(resolve=>setTimeout(resolve,retryDelay));
      }
    }
    throw new Error('No se pudo descargar el render');
  }
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
