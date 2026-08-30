(()=>{
  if(typeof document==='undefined'||typeof ProfitMenteRenderJobClient==='undefined')return;
  const renderBtn=document.querySelector('#renderMp4Btn');if(!renderBtn)return;
  const client=new ProfitMenteRenderJobClient();
  const SESSION_KEY='profitmente.activeRenderJob.v1';
  let cancelBtn=document.querySelector('#cancelRenderBtn');
  if(!cancelBtn){cancelBtn=document.createElement('button');cancelBtn.id='cancelRenderBtn';cancelBtn.type='button';cancelBtn.textContent='■ Cancelar render';cancelBtn.hidden=true;cancelBtn.title='Detener el render MP4 local';renderBtn.insertAdjacentElement('afterend',cancelBtn)}
  const safeName=name=>String(name||'profitmente').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(-120);
  const renderFailure=err=>typeof ProfitMenteRenderErrorEngine!=='undefined'?ProfitMenteRenderErrorEngine.format(err):`No se pudo renderizar MP4: ${err?.message||err}`;
  const shouldPreserveSession=err=>!!client.jobId&&err?.name!=='AbortError'&&!/cancelado/i.test(err?.message||'')&&(err?.retryable===true||err?.code==='INVALID_RENDER_RESULT'||err?.status===408||err?.status===425||err?.status===429||Number(err?.status)>=500||(!Number.isFinite(Number(err?.status))&&/fetch|network|red|conexi|descarg|truncad|mp4/i.test(err?.message||'')));
  function statusText(s){const p=Number.isFinite(Number(s.progress))?` · ${Math.max(0,Math.min(100,Math.round(Number(s.progress))))}%`:'';const elapsed=Number(s.elapsed||0)>0?` · ${Math.round(Number(s.elapsed))}s`:'';const retry=s.status==='reconnecting'&&Number(s.retry)>0?` · intento ${Number(s.retry)}`:'';const queue=s.status==='queued'&&Number(s.queue_position)>0?` · posición ${Number(s.queue_position)}`:'';const label=s.status==='queued'?'En cola':s.status==='rendering'?'Renderizando':s.status==='reconnecting'?'Reconectando':s.status==='done'?'Terminado':s.status==='cancelled'?'Cancelado':'Preparando';return `${label}${queue}${p}${elapsed}${retry}`}
  function persistSession(projectName){try{localStorage.setItem(SESSION_KEY,JSON.stringify({jobId:client.jobId,projectName:String(projectName||'profitmente'),savedAt:Date.now()}))}catch{}}
  function readSession(){try{const raw=localStorage.getItem(SESSION_KEY);if(!raw)return null;const data=JSON.parse(raw);return data?.jobId?data:null}catch{return null}}
  function clearSession(){try{localStorage.removeItem(SESSION_KEY)}catch{}}
  async function download(blob,name=project?.name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${safeName(name)}.mp4`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);return blob.size}
  function projectForRender(){return typeof ProfitMenteAudioDuckingEngine!=='undefined'?ProfitMenteAudioDuckingEngine.prepareForRender(project):project}
  function validatePostRender(state){
    const qc=state?.qc;
    if(!qc?.ok)throw new Error('El servidor terminó el MP4 sin superar el control de calidad post-render.');
    return typeof bundler?.qcSummary==='function'?bundler.qcSummary(qc):`QA post-render ${Number(qc.score)||0}/100`;
  }
  function resultRetryStatus(event){const reason=event?.code==='INVALID_RENDER_RESULT'?'respuesta MP4 inválida':'fallo de descarga';return `MP4 terminado · ${reason} · reintentando descarga ${Number(event?.nextAttempt)||2}/${client.resultMaxAttempts}`}
  async function finishActiveJob(projectName){
    const finalState=await client.wait(s=>setStatus(`MP4 local · ${statusText(s)}`));
    const qcLabel=validatePostRender(finalState);setStatus(`${qcLabel} · preparando descarga…`);
    const mp4=await client.result({onRetry:event=>setStatus(resultRetryStatus(event))});const size=await download(mp4,projectName);clearSession();
    setStatus(`MP4 final descargado · ${(size/1048576).toFixed(1)} MB · integridad MP4 ✓ · ${qcLabel}`);
    return finalState;
  }
  async function resumeSavedJob(){
    const saved=readSession();if(!saved)return false;
    renderBtn.disabled=true;cancelBtn.hidden=false;
    try{
      client.attach(saved.jobId);setStatus('Reconectando con el render MP4 que seguía activo…');
      const state=await client.status();
      if(state.status==='error')throw new Error(state.error||'Falló el render guardado');
      if(state.status==='cancelled'){clearSession();setStatus('El render anterior estaba cancelado');return false}
      await finishActiveJob(saved.projectName);return true;
    }catch(err){
      if(shouldPreserveSession(err)){
        persistSession(saved.projectName);
        console.warn(err);setStatus('El render se conserva para recuperación. Recarga Studio para reintentar la descarga sin volver a renderizar.');
      }else{
        clearSession();
        if(!/HTTP 404|no encontrado|not found/i.test(err?.message||'')){console.error(err);setStatus('No se pudo recuperar el render anterior. '+renderFailure(err))}
      }
      return false;
    }finally{renderBtn.disabled=false;cancelBtn.hidden=true;client.reset()}
  }
  renderBtn.onclick=async()=>{
    save();const r=qa.inspect(project,assets);if(r.issues.length){setStatus('Render MP4 bloqueado: corrige primero los errores de QA');document.querySelector('#qaBtn')?.click();return}
    renderBtn.disabled=true;cancelBtn.hidden=false;client.reset();clearSession();
    try{
      const health=await bundler.health();if(!health.ok)throw new Error('Abre Studio con start_studio_windows.bat para activar el render MP4 directo.');if(!health.render_ready)throw new Error('FFmpeg y FFprobe no están disponibles. Instala FFmpeg gratis y vuelve a abrir Studio.');
      const renderProject=projectForRender();setStatus('Empaquetando proyecto, ducking de voz y medios…');const blob=await bundler.build(renderProject,assets);setStatus(`Enviando ${(blob.size/1048576).toFixed(1)} MB al render local…`);await client.start(blob);persistSession(project.name);
      await finishActiveJob(project.name);
    }catch(err){
      if(err?.name==='AbortError'||/cancelado/i.test(err?.message||'')){clearSession();setStatus('Render MP4 cancelado')}
      else if(shouldPreserveSession(err)){persistSession(project.name);console.warn(err);setStatus('El render se conserva para recuperación. Recarga Studio para reintentar la descarga sin volver a renderizar.')}
      else{clearSession();console.error(err);setStatus(renderFailure(err))}
    }
    finally{renderBtn.disabled=false;cancelBtn.hidden=true;client.reset()}
  };
  cancelBtn.onclick=async()=>{cancelBtn.disabled=true;try{setStatus('Cancelando render local…');await client.cancel();clearSession()}catch(err){console.warn(err)}finally{cancelBtn.disabled=false}};
  setTimeout(()=>{resumeSavedJob()},0);
  window.profitMenteRenderJobClient=client;
  window.ProfitMenteAsyncRenderValidation={validatePostRender,resumeSavedJob,readSession,clearSession,statusText,renderFailure,resultRetryStatus,shouldPreserveSession};
})();