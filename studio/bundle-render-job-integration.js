(function(g){
  const Bundle=g.ProfitMenteBundleEngine,Client=g.ProfitMenteRenderJobClient;
  if(!Bundle||!Client)return;

  function clientFor(engine){
    if(!engine._renderJobClient)engine._renderJobClient=new Client();
    return engine._renderJobClient;
  }

  Bundle.prototype.health=async function(){
    const client=clientFor(this);
    try{
      const r=await client.fetchWithTimeout('/api/health',{cache:'no-store'},client.requestTimeoutMs);
      if(!r.ok)return {ok:false,render_ready:false};
      return await r.json();
    }catch{return {ok:false,render_ready:false}}
  };

  Bundle.prototype.cancelLocal=async function(onStatus=()=>{}){
    const client=this._renderJobClient;
    if(!client?.jobId)return false;
    this.cancelRequested=true;
    onStatus('Cancelando render local…');
    try{
      await client.cancel();
      return true;
    }catch(error){
      this.cancelRequested=false;
      onStatus('No se pudo cancelar el render: '+error.message);
      return false;
    }
  };

  Bundle.prototype.renderJob=async function(project,blob,onStatus=()=>{}){
    const client=clientFor(this);
    client.reset();
    this.cancelRequested=false;
    onStatus(`Enviando ${(blob.size/1048576).toFixed(1)} MB al render local…`);
    const initial=await client.start(blob);
    this.currentJobId=client.jobId;
    this.setCancelVisible(true,onStatus);
    try{
      const state=await client.wait(s=>{
        const status=s?.status||'rendering',progress=Math.max(0,Math.min(100,Number(s?.progress)||0)),elapsed=Number(s?.elapsed)||0;
        if(status==='reconnecting'){
          const seconds=Math.max(.1,Number(s.retryDelay||0)/1000).toFixed(1);
          onStatus(`Reconectando motor de render · intento ${Number(s.retry)||1} · próximo intento en ${seconds}s`);
        }else if(status==='queued')onStatus(`Render en cola · ${progress}%`);
        else if(status==='rendering')onStatus(`Renderizando MP4 · ${progress}% · ${elapsed.toFixed(1)}s${s.progress_stale?' · progreso sin cambios':''}`);
      });
      if(!state?.qc?.ok)throw new Error('El servidor terminó el MP4 sin un control post-render válido.');
      onStatus(this.qcSummary(state.qc));
      await this.sleep(350);
      const mp4=await client.result({onRetry:r=>onStatus(`Reintentando descarga MP4 · intento ${r.nextAttempt}`)});
      return this.downloadMp4(mp4,project);
    }finally{
      this.currentJobId=null;
      this.cancelRequested=false;
      client.reset();
      this.setCancelVisible(false,onStatus);
    }
  };

  Bundle.prototype.renderLegacy=async function(project,blob,onStatus=()=>{}){
    const client=clientFor(this);
    onStatus(`Enviando ${(blob.size/1048576).toFixed(1)} MB al render local…`);
    const r=await client.fetchWithTimeout('/api/render',{method:'POST',headers:{'Content-Type':'application/x-tar'},body:blob},client.resultTimeoutMs);
    if(!r.ok)throw new Error(await this.errorFrom(r));
    onStatus(r.headers.get('X-ProfitMente-Post-Render-QC')==='passed'?'QA post-render superado · preparando descarga…':'MP4 terminado. Preparando descarga…');
    const mp4=await client.validateResultBlob(await r.blob());
    return this.downloadMp4(mp4,project);
  };

  g.ProfitMenteBundleRenderJobIntegration={clientFor};
})(globalThis);
