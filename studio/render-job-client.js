class ProfitMenteRenderJobClient{
  constructor({fetchFn,interval=750,maxConsecutiveErrors=8,maxRetryDelay=5000,resultMaxAttempts=3,minResultBytes=24,staleProgressMs=300000,requestTimeoutMs=15000,resultTimeoutMs=120000}={}){
    this.fetchFn=fetchFn||globalThis.fetch?.bind(globalThis);
    this.interval=interval;
    this.maxConsecutiveErrors=maxConsecutiveErrors;
    this.maxRetryDelay=maxRetryDelay;
    this.resultMaxAttempts=Math.max(1,Number(resultMaxAttempts)||3);
    this.minResultBytes=Math.max(16,Number(minResultBytes)||24);
    this.staleProgressMs=Math.max(1,Number(staleProgressMs)||300000);
    this.requestTimeoutMs=Math.max(1,Number(requestTimeoutMs)||15000);
    this.resultTimeoutMs=Math.max(this.requestTimeoutMs,Number(resultTimeoutMs)||120000);
    this.jobId=null;
    this.cancelled=false;
    this.jobGeneration=0;
  }
  async fetchWithTimeout(url,options={},timeoutMs=this.requestTimeoutMs){
    if(!this.fetchFn)throw new Error('Fetch no disponible');
    const timeout=Math.max(1,Number(timeoutMs)||this.requestTimeoutMs);
    const controller=typeof AbortController==='function'?new AbortController():null;
    const externalSignal=options?.signal||null;
    let relayAbort=null,timer=null,timedOut=false;
    const requestOptions={...options};
    if(controller){
      relayAbort=()=>controller.abort(externalSignal?.reason);
      if(externalSignal?.aborted)relayAbort();
      else externalSignal?.addEventListener?.('abort',relayAbort,{once:true});
      requestOptions.signal=controller.signal;
    }
    const timeoutPromise=new Promise((_,reject)=>{
      timer=setTimeout(()=>{
        timedOut=true;
        try{controller?.abort()}catch{}
        const error=new Error(`Tiempo de espera agotado al contactar el motor de render (${timeout} ms)`);
        error.name='TimeoutError';
        error.code='REQUEST_TIMEOUT';
        error.retryable=true;
        reject(error);
      },timeout);
    });
    try{
      return await Promise.race([Promise.resolve().then(()=>this.fetchFn(url,requestOptions)),timeoutPromise]);
    }catch(error){
      if(timedOut&&error?.code!=='REQUEST_TIMEOUT'){
        const timeoutError=new Error(`Tiempo de espera agotado al contactar el motor de render (${timeout} ms)`);
        timeoutError.name='TimeoutError';
        timeoutError.code='REQUEST_TIMEOUT';
        timeoutError.retryable=true;
        throw timeoutError;
      }
      if(error?.name==='AbortError'&&externalSignal?.aborted)throw error;
      if(!Number.isFinite(Number(error?.status)))error.retryable=true;
      throw error;
    }finally{
      if(timer)clearTimeout(timer);
      if(relayAbort)externalSignal?.removeEventListener?.('abort',relayAbort);
    }
  }
  async json(url,options){
    let r;
    try{r=await this.fetchWithTimeout(url,options,this.requestTimeoutMs)}catch(error){error.retryable=true;throw error}
    let data={};
    try{data=await r.json()}catch{}
    if(!r.ok){
      const error=new Error(data.error||`Error HTTP ${r.status}`);
      error.status=r.status;
      error.retryable=r.status===408||r.status===425||r.status===429||r.status>=500;
      throw error;
    }
    return data;
  }
  attach(jobId){
    const id=String(jobId||'').trim();
    if(!id)throw new Error('ID de render inválido');
    this.jobGeneration+=1;
    this.jobId=id;
    this.cancelled=false;
    return this.jobId;
  }
  snapshotJob(){
    const jobId=String(this.jobId||'').trim();
    if(!jobId)throw new Error('No hay trabajo de render activo');
    return {jobId,generation:this.jobGeneration};
  }
  isCurrentJob(snapshot){
    return Boolean(snapshot)&&snapshot.generation===this.jobGeneration&&snapshot.jobId===this.jobId;
  }
  supersededError(){
    const error=new Error('El trabajo de render fue reemplazado por otro');
    error.name='AbortError';
    error.code='RENDER_JOB_SUPERSEDED';
    error.retryable=false;
    return error;
  }
  assertCurrentJob(snapshot){
    if(!this.isCurrentJob(snapshot))throw this.supersededError();
  }
  async start(bundle){
    if(!this.fetchFn)throw new Error('Fetch no disponible');
    this.cancelled=false;
    const data=await this.json('/api/render/jobs',{method:'POST',headers:{'Content-Type':'application/x-tar'},body:bundle});
    if(!data.job_id)throw new Error('El servidor no devolvió un trabajo de render');
    this.attach(data.job_id);
    return data;
  }
  async status(jobId=this.jobId){
    const id=String(jobId||'').trim();
    if(!id)throw new Error('No hay trabajo de render activo');
    return this.json(`/api/render/jobs/${encodeURIComponent(id)}`);
  }
  async validateResultBlob(blob){
    const fail=message=>{
      const error=new Error(message);
      error.retryable=true;
      error.code='INVALID_RENDER_RESULT';
      throw error;
    };
    if(!blob||!Number.isFinite(Number(blob.size)))fail('El servidor devolvió un resultado de render inválido');
    if(Number(blob.size)<this.minResultBytes)fail(`El MP4 descargado está vacío o truncado (${Number(blob.size)||0} bytes)`);
    const mime=String(blob.type||'').toLowerCase();
    if(mime&&!['video/mp4','application/mp4','application/octet-stream','binary/octet-stream'].includes(mime))fail(`El servidor devolvió ${mime} en lugar de video MP4`);
    try{
      const head=blob.slice?.(0,96)||blob;
      if(typeof head.arrayBuffer!=='function')return blob;
      const bytes=new Uint8Array(await head.arrayBuffer());
      let ftyp=false;
      for(let i=0;i<=bytes.length-4;i+=1){
        if(bytes[i]===0x66&&bytes[i+1]===0x74&&bytes[i+2]===0x79&&bytes[i+3]===0x70){ftyp=true;break}
      }
      if(!ftyp)fail('El resultado no contiene una cabecera MP4 válida (ftyp)');
    }catch(error){
      if(error?.code==='INVALID_RENDER_RESULT')throw error;
      fail(`No se pudo validar la integridad del MP4: ${error?.message||error}`);
    }
    return blob;
  }
  async result({maxAttempts=this.resultMaxAttempts,onRetry=()=>{}}={}){
    const snapshot=this.snapshotJob();
    const attempts=Math.max(1,Number(maxAttempts)||1);
    for(let attempt=1;attempt<=attempts;attempt+=1){
      this.assertCurrentJob(snapshot);
      try{
        const r=await this.fetchWithTimeout(`/api/render/jobs/${encodeURIComponent(snapshot.jobId)}/result`,{},this.resultTimeoutMs);
        this.assertCurrentJob(snapshot);
        if(!r.ok){
          let data={};
          try{data=await r.json()}catch{}
          const error=new Error(data.error||`Error HTTP ${r.status}`);
          error.status=r.status;
          error.retryable=r.status===408||r.status===425||r.status===429||r.status>=500;
          throw error;
        }
        const blob=await this.validateResultBlob(await r.blob());
        this.assertCurrentJob(snapshot);
        return blob;
      }catch(error){
        if(error?.code==='RENDER_JOB_SUPERSEDED')throw error;
        const retryable=error?.retryable===true||error?.status===408||error?.status===425||error?.status===429||Number(error?.status)>=500||!Number.isFinite(Number(error?.status));
        if(!retryable||attempt>=attempts)throw error;
        this.assertCurrentJob(snapshot);
        const retryDelay=Math.min(this.maxRetryDelay,Math.max(this.interval,this.interval*(2**Math.min(attempt-1,4))));
        onRetry({attempt,nextAttempt:attempt+1,retryDelay,error:error?.message||String(error),code:error?.code||null});
        await new Promise(resolve=>setTimeout(resolve,retryDelay));
        this.assertCurrentJob(snapshot);
      }
    }
    throw new Error('No se pudo descargar el render');
  }
  async cancel(){
    if(!this.jobId)return {ok:true,status:'idle'};
    const snapshot=this.snapshotJob();
    const result=await this.json(`/api/render/jobs/${encodeURIComponent(snapshot.jobId)}`,{method:'DELETE'});
    if(String(result?.status||'').toLowerCase()!=='cancelled'){
      const error=new Error(result?.error||`El servidor no confirmó la cancelación del render${result?.status?` (estado: ${result.status})`:''}`);
      error.code='CANCEL_NOT_CONFIRMED';
      error.retryable=true;
      throw error;
    }
    if(this.isCurrentJob(snapshot))this.cancelled=true;
    return result;
  }
  async wait(onProgress=()=>{}){
    const snapshot=this.snapshotJob();
    let failures=0,lastSignature=null,lastAdvanceAt=Date.now();
    for(;;){
      this.assertCurrentJob(snapshot);
      let s;
      try{
        s=await this.status(snapshot.jobId);
        this.assertCurrentJob(snapshot);
        failures=0;
      }catch(error){
        if(error?.code==='RENDER_JOB_SUPERSEDED')throw error;
        if(this.cancelled&&this.isCurrentJob(snapshot))throw Object.assign(new Error('Render cancelado'),{name:'AbortError'});
        if(!error?.retryable||failures>=this.maxConsecutiveErrors)throw error;
        failures+=1;
        const retryDelay=Math.min(this.maxRetryDelay,Math.max(this.interval,this.interval*(2**Math.min(failures-1,4))));
        onProgress({status:'reconnecting',progress:null,retry:failures,retryDelay,error:error?.message||String(error),code:error?.code||null});
        await new Promise(resolve=>setTimeout(resolve,retryDelay));
        this.assertCurrentJob(snapshot);
        continue;
      }
      if(s.status==='rendering'){
        const signature=`${Number.isFinite(Number(s.progress))?Number(s.progress):''}|${String(s.phase||'')}`;
        const now=Date.now();
        if(signature!==lastSignature){lastSignature=signature;lastAdvanceAt=now}
        else{
          const staleFor=Math.max(0,now-lastAdvanceAt);
          if(staleFor>=this.staleProgressMs)s={...s,progress_stale:true,progress_stale_seconds:Math.max(1,Math.round(staleFor/1000))};
        }
      }else{
        lastSignature=null;
        lastAdvanceAt=Date.now();
      }
      this.assertCurrentJob(snapshot);
      onProgress(s);
      if(s.status==='done')return s;
      if(s.status==='error')throw new Error(s.error||'Falló el render');
      if(s.status==='cancelled'||(this.cancelled&&this.isCurrentJob(snapshot)))throw Object.assign(new Error('Render cancelado'),{name:'AbortError'});
      await new Promise(resolve=>setTimeout(resolve,this.interval));
      this.assertCurrentJob(snapshot);
    }
  }
  reset(){
    this.jobGeneration+=1;
    this.jobId=null;
    this.cancelled=false;
  }
}
if(typeof window!=='undefined')window.ProfitMenteRenderJobClient=ProfitMenteRenderJobClient;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteRenderJobClient;
