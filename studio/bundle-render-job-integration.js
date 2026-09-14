(function(g){
  const Bundle=g.ProfitMenteBundleEngine,Client=g.ProfitMenteRenderJobClient;
  if(!Bundle||!Client)return;

  function clientFor(engine){
    if(!engine._renderJobClient)engine._renderJobClient=new Client();
    return engine._renderJobClient;
  }

  function emitProgress(stage,detail={}){
    if(typeof document==='undefined'||typeof CustomEvent!=='function')return;
    document.dispatchEvent(new CustomEvent('profitmente:render-progress',{detail:{...detail,stage}}));
  }

  function transportAssetName(engine,asset,index){
    const marker=`pm${index.toString(36).padStart(6,'0').slice(-6)}__`;
    const safe=engine.sanitize(asset?.name||'asset')||'asset';
    return marker+safe.slice(-(84-marker.length));
  }

  function stripTransportMarker(name){
    return String(name||'').replace(/^pm[0-9a-z]{6}__/i,'');
  }

  function assertTarHeaderChecksum(engine,header,name='entrada'){
    const checksumRaw=engine.readString(header,148,8),stored=parseInt(checksumRaw||'',8);
    if(!Number.isFinite(stored))throw new Error(`Checksum TAR inválido: ${name}`);
    let computed=0;
    for(let i=0;i<header.length;i++)computed+=(i>=148&&i<156)?32:header[i];
    if(computed!==stored)throw new Error(`Checksum TAR inválido: ${name}`);
    return true;
  }

  async function assertUniqueTarEntries(engine,blob){
    const bytes=new Uint8Array(await blob.arrayBuffer()),seen=new Set();
    let offset=0,terminated=false;
    while(offset+512<=bytes.length){
      const header=bytes.slice(offset,offset+512);
      if(header.every(x=>x===0)){
        if(offset+1024>bytes.length)throw new Error('Paquete TAR truncado: falta terminador completo');
        const secondTerminator=bytes.slice(offset+512,offset+1024);
        if(!secondTerminator.every(x=>x===0))throw new Error('Paquete TAR con terminador inválido');
        for(let i=offset+1024;i<bytes.length;i++)if(bytes[i]!==0)throw new Error('Paquete TAR contiene datos después del terminador');
        terminated=true;
        break;
      }
      const name=engine.readString(header,0,100);
      assertTarHeaderChecksum(engine,header,name||'entrada');
      const sizeRaw=engine.readString(header,124,12),size=parseInt(sizeRaw||'0',8);
      if(!name||!Number.isSafeInteger(size)||size<0)throw new Error('Paquete TAR inválido');
      if(name.length>100)throw new Error(`Entrada TAR demasiado larga: ${name}`);
      if(seen.has(name))throw new Error(`Entrada TAR duplicada: ${name}`);
      seen.add(name);
      offset+=512;
      const paddedSize=Math.ceil(size/512)*512;
      if(offset+paddedSize>bytes.length)throw new Error('Paquete TAR truncado');
      offset+=paddedSize;
    }
    if(!terminated)throw new Error('Paquete TAR sin terminador válido');
    return true;
  }

  function validateImportedBundle(engine,restored){
    if(!restored||!restored.project||!Array.isArray(restored.assets))throw new Error('Paquete restaurado inválido');
    const mediaIds=new Set();
    for(const asset of restored.assets){
      const id=engine.canonicalMediaId(asset?.id);
      if(!id)throw new Error(`Medio restaurado sin identificador válido: ${asset?.name||'sin nombre'}`);
      if(mediaIds.has(id))throw new Error(`Identificador de medio duplicado al importar: ${id}`);
      mediaIds.add(id);
      asset.id=id;
    }
    const manifestIds=new Set();
    const manifestAssets=Array.isArray(restored.project.assets)?restored.project.assets:[];
    for(const asset of manifestAssets){
      const id=engine.canonicalMediaId(asset?.id);
      if(!id)throw new Error(`Medio del proyecto sin identificador válido: ${asset?.name||'sin nombre'}`);
      if(manifestIds.has(id))throw new Error(`Identificador de medio duplicado en proyecto: ${id}`);
      if(!mediaIds.has(id))throw new Error(`Medio del proyecto no restaurado: ${id}`);
      manifestIds.add(id);
      asset.id=id;
    }
    for(const clip of restored.project.clips||[]){
      if(!clip||clip.asset==null)continue;
      const id=engine.canonicalMediaId(clip.asset);
      if(!id)throw new Error(`Clip con identificador de medio inválido al importar: ${clip.id||'sin id'}`);
      if(!mediaIds.has(id))throw new Error(`Medio requerido por clip no restaurado: ${id}`);
      clip.asset=id;
    }
    return restored;
  }

  const originalBuild=Bundle.prototype.build;
  Bundle.prototype.build=async function(project,assets){
    if(!Array.isArray(assets))return originalBuild.call(this,project,assets);
    const transportAssets=assets.map((asset,index)=>asset&&typeof asset==='object'?{...asset,name:transportAssetName(this,asset,index)}:asset);
    const blob=await originalBuild.call(this,project,transportAssets);
    await assertUniqueTarEntries(this,blob);
    return blob;
  };

  const originalParse=Bundle.prototype.parse;
  Bundle.prototype.parse=async function(blob){
    await assertUniqueTarEntries(this,blob);
    const restored=validateImportedBundle(this,await originalParse.call(this,blob));
    const namesById=new Map();
    for(const asset of restored.assets){
      asset.name=stripTransportMarker(asset.name);
      namesById.set(this.canonicalMediaId(asset.id),asset.name);
    }
    for(const asset of restored.project.assets||[]){
      const id=this.canonicalMediaId(asset?.id);
      if(namesById.has(id))asset.name=namesById.get(id);
    }
    return restored;
  };

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
    emitProgress('cancelled',{message:'Cancelando render local…'});
    try{
      await client.cancel();
      emitProgress('cancelled',{message:'Render cancelado'});
      return true;
    }catch(error){
      this.cancelRequested=false;
      onStatus('No se pudo cancelar el render: '+error.message);
      emitProgress('error',{message:'No se pudo cancelar el render: '+error.message});
      return false;
    }
  };

  Bundle.prototype.renderJob=async function(project,blob,onStatus=()=>{}){
    const client=clientFor(this);
    client.reset();
    this.cancelRequested=false;
    const uploadMessage=`Enviando ${(blob.size/1048576).toFixed(1)} MB al render local…`;
    onStatus(uploadMessage);
    emitProgress('uploading',{message:uploadMessage});
    const initial=await client.start(blob);
    this.currentJobId=client.jobId;
    emitProgress(initial?.status||'queued',{...initial,message:'Render recibido por el motor local'});
    this.setCancelVisible(true,onStatus);
    try{
      const state=await client.wait(s=>{
        const status=s?.status||'rendering',progress=Math.max(0,Math.min(100,Number(s?.progress)||0)),elapsed=Number(s?.elapsed)||0;
        if(status==='reconnecting'){
          const seconds=Math.max(.1,Number(s.retryDelay||0)/1000).toFixed(1);
          const message=`Reconectando motor de render · intento ${Number(s.retry)||1} · próximo intento en ${seconds}s`;
          onStatus(message);
          emitProgress('reconnecting',{...s,message});
        }else if(status==='queued'){
          const message=`Render en cola · ${progress}%`;
          onStatus(message);
          emitProgress('queued',{...s,progress,elapsed,message});
        }else if(status==='rendering'){
          const message=`Renderizando MP4 · ${progress}% · ${elapsed.toFixed(1)}s${s.progress_stale?' · progreso sin cambios':''}`;
          onStatus(message);
          emitProgress('rendering',{...s,progress,elapsed,message});
        }
      });
      if(!state?.qc?.ok)throw new Error('El servidor terminó el MP4 sin un control post-render válido.');
      const qaMessage=this.qcSummary(state.qc);
      onStatus(qaMessage);
      emitProgress('qa',{progress:98,elapsed:state.elapsed,message:qaMessage});
      await this.sleep(350);
      emitProgress('downloading',{progress:99,elapsed:state.elapsed,message:'Descargando MP4 validado…'});
      const mp4=await client.result({onRetry:r=>{
        const message=`Reintentando descarga MP4 · intento ${r.nextAttempt}`;
        onStatus(message);
        emitProgress('downloading',{progress:99,message});
      }});
      const size=this.downloadMp4(mp4,project);
      emitProgress('done',{progress:100,elapsed:state.elapsed,message:`MP4 final listo · ${(size/1048576).toFixed(1)} MB`});
      return size;
    }finally{
      this.currentJobId=null;
      this.cancelRequested=false;
      client.reset();
      this.setCancelVisible(false,onStatus);
    }
  };

  Bundle.prototype.renderLegacy=async function(project,blob,onStatus=()=>{}){
    const client=clientFor(this);
    const uploadMessage=`Enviando ${(blob.size/1048576).toFixed(1)} MB al render local…`;
    onStatus(uploadMessage);
    emitProgress('uploading',{message:uploadMessage});
    const r=await client.fetchWithTimeout('/api/render',{method:'POST',headers:{'Content-Type':'application/x-tar'},body:blob},client.resultTimeoutMs);
    if(!r.ok)throw new Error(await this.errorFrom(r));
    if(r.headers.get('X-ProfitMente-Post-Render-QC')!=='passed')throw new Error('El servidor terminó el MP4 sin confirmar el control post-render.');
    const qaMessage='QA post-render superado · preparando descarga…';
    onStatus(qaMessage);
    emitProgress('qa',{progress:98,message:qaMessage});
    const mp4=await client.validateResultBlob(await r.blob());
    emitProgress('downloading',{progress:99,message:'Descargando MP4 validado…'});
    const size=this.downloadMp4(mp4,project);
    emitProgress('done',{progress:100,message:`MP4 final listo · ${(size/1048576).toFixed(1)} MB`});
    return size;
  };

  const originalRenderLocal=Bundle.prototype.renderLocal;
  Bundle.prototype.renderLocal=async function(project,assets,onStatus=()=>{}){
    emitProgress('packing',{message:'Empaquetando proyecto y medios…'});
    try{
      return await originalRenderLocal.call(this,project,assets,onStatus);
    }catch(error){
      const cancelled=error?.name==='AbortError'||/cancelad/i.test(String(error?.message||''));
      emitProgress(cancelled?'cancelled':'error',{message:cancelled?'Render cancelado':`Render detenido: ${error?.message||error}`});
      throw error;
    }
  };

  g.ProfitMenteBundleRenderJobIntegration={clientFor,assertUniqueTarEntries,assertTarHeaderChecksum,validateImportedBundle,emitProgress,transportAssetName,stripTransportMarker};
})(globalThis);