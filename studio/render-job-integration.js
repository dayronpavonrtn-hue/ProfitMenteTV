(()=>{
  if(typeof document==='undefined'||typeof ProfitMenteRenderJobClient==='undefined')return;
  const renderBtn=document.querySelector('#renderMp4Btn');if(!renderBtn)return;
  const client=new ProfitMenteRenderJobClient();
  const SESSION_KEY='profitmente.activeRenderJob.v1';
  let cancelBtn=document.querySelector('#cancelRenderBtn');
  if(!cancelBtn){cancelBtn=document.createElement('button');cancelBtn.id='cancelRenderBtn';cancelBtn.type='button';cancelBtn.textContent='■ Cancelar render';cancelBtn.hidden=true;cancelBtn.title='Detener el render MP4 local';renderBtn.insertAdjacentElement('afterend',cancelBtn)}
  const safeName=name=>String(name||'profitmente').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(-120);
  const renderFailure=err=>typeof ProfitMenteRenderErrorEngine!=='undefined'?ProfitMenteRenderErrorEngine.format(err):`No se pudo renderizar MP4: ${err?.message||err}`;
  const shouldPreserveSession=err=>!!client.jobId&&err?.name!=='AbortError'&&!/cancelado/i.test(err?.message||'')&&(err?.retryable===true||err?.code==='INVALID_RENDER_RESULT'||err?.status===408||err?.status===425||err?.status===429||Number(err?.status)>=500||(!Number.isFinite(Number(err?.status))&&/fetch|network|conexi|descarg|truncad/i.test(err?.message||'')));
  function statusText(s){const p=Number.isFinite(Number(s.progress))?` · ${Math.max(0,Math.min(100,Math.round(Number(s.progress))))}%`:'';const elapsed=Number(s.elapsed||0)>0?` · ${Math.round(Number(s.elapsed))}s`:'';const retry=s.status==='reconnecting'&&Number(s.retry)>0?` · intento ${Number(s.retry)}`:'';const queue=s.status==='queued'&&Number(s.queue_position)>0?` · posición ${Number(s.queue_position)}`:'';const phase=s.status==='rendering'&&String(s.phase||'').trim()?` · ${String(s.phase).trim().slice(0,120)}`:'';const stale=s.status==='rendering'&&s.progress_stale?` · ⚠ sin avance reportado ${Number(s.progress_stale_seconds)>=60?`${Math.max(1,Math.round(Number(s.progress_stale_seconds)/60))} min`:`${Math.max(1,Math.round(Number(s.progress_stale_seconds)||1))} s`}`:'';const label=s.status==='queued'?'En cola':s.status==='rendering'?'Renderizando':s.status==='reconnecting'?'Reconectando':s.status==='done'?'Terminado':s.status==='cancelled'?'Cancelado':'Preparando';return `${label}${phase}${queue}${p}${elapsed}${retry}${stale}`}
  function canonicalize(value){
    if(Array.isArray(value))return value.map(canonicalize);
    if(!value||typeof value!=='object')return value;
    const out={};for(const key of Object.keys(value).sort())out[key]=canonicalize(value[key]);return out;
  }
  function mediaIdentity(assetList){
    return (Array.isArray(assetList)?assetList:[]).map(a=>({
      id:String(a?.id||''),name:String(a?.name||''),type:String(a?.type||''),mime:String(a?.mime||''),
      size:Number.isFinite(Number(a?.size))?Number(a.size):null,
      duration:Number.isFinite(Number(a?.duration))?Number(a.duration):null,
      width:Number.isFinite(Number(a?.width))?Number(a.width):null,
      height:Number.isFinite(Number(a?.height))?Number(a.height):null,
      sourceLastModified:Number.isFinite(Number(a?.sourceLastModified))?Number(a.sourceLastModified):null,
      sourceFingerprint:String(a?.sourceFingerprint||''),sourceContentHash:String(a?.sourceContentHash||'')
    })).sort((a,b)=>a.id.localeCompare(b.id)||a.name.localeCompare(b.name));
  }
  function renderFingerprint(renderProject,renderAssets){
    const copy=structuredClone(renderProject&&typeof renderProject==='object'?renderProject:{});
    delete copy.libraryId;delete copy.name;
    const version=Array.isArray(renderAssets)?'v2':'v1';
    const payload=version==='v2'?{project:canonicalize(copy),assets:canonicalize(mediaIdentity(renderAssets))}:canonicalize(copy);
    const text=JSON.stringify(payload);let hash=2166136261;
    for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619)}
    return `${version}-${(hash>>>0).toString(16).padStart(8,'0')}-${text.length}`;
  }
  function normalizeRenderContext(value){const data=value&&typeof value==='object'?value:{projectName:value};return {projectName:String(data?.projectName||'profitmente'),libraryId:data?.libraryId||null,renderFingerprint:data?.renderFingerprint||null}}
  function projectForRender(value=project){const prepared=typeof ProfitMenteAudioDuckingEngine!=='undefined'?ProfitMenteAudioDuckingEngine.prepareForRender(value):value;return structuredClone(prepared)}
  function snapshotAssetsForRender(value=assets){return structuredClone(Array.isArray(value)?value:[])}
  function captureRenderContext(renderSnapshot=projectForRender(),renderAssets=snapshotAssetsForRender()){return normalizeRenderContext({projectName:project?.name||'profitmente',libraryId:project?.libraryId||null,renderFingerprint:renderFingerprint(renderSnapshot,renderAssets)})}
  function evaluateRenderFreshness(context,currentProject=project,currentAssets=(typeof assets!=='undefined'?assets:[])){
    const identity=normalizeRenderContext(context),currentId=currentProject?.libraryId||null;
    if(identity.libraryId&&currentId&&identity.libraryId!==currentId)return {status:'different-project',current:false,reason:'project'};
    if(identity.libraryId&&!currentId)return {status:'different-project',current:false,reason:'project'};
    if(!identity.renderFingerprint)return {status:'unknown',current:false,reason:'legacy'};
    const isMediaAware=String(identity.renderFingerprint).startsWith('v2-');
    const currentFingerprint=isMediaAware?renderFingerprint(projectForRender(currentProject),currentAssets):renderFingerprint(projectForRender(currentProject));
    return currentFingerprint===identity.renderFingerprint?{status:'current',current:true,reason:null}:{status:'stale',current:false,reason:isMediaAware?'content-or-media':'content'};
  }
  function freshnessLabel(freshness){
    if(freshness?.status==='stale')return ' · ⚠ el proyecto o sus medios cambiaron durante el render; este MP4 corresponde al snapshot anterior';
    if(freshness?.status==='different-project')return ' · MP4 del proyecto original; el proyecto abierto ahora es otro';
    if(freshness?.status==='unknown')return ' · resultado recuperado de una sesión anterior';
    return ' · versión actual ✓';
  }
  async function renderPreflight(){
    if(typeof window.ProfitMenteExportPreflightRun==='function'){
      const preflight=await window.ProfitMenteExportPreflightRun();
      return {ok:!!preflight?.canRender,preflight,qa:null};
    }
    const report=qa.inspect(project,assets);
    return {ok:!(report.issues||[]).length,preflight:null,qa:report};
  }
  function reportPreflightBlock(gate){
    const p=gate?.preflight;
    if(p?.state==='blocked'){
      setStatus('Render MP4 bloqueado por Preflight: corrige primero los errores de QA');
      document.querySelector('#qaBtn')?.click();
      return;
    }
    if(p?.canPackage){
      setStatus(p?.health?.ok?'Preflight: MP4 directo no disponible. Puedes exportar el paquete $0.':'Preflight: abre Studio con el servidor local para MP4 directo; el paquete $0 sigue disponible.');
      return;
    }
    setStatus('Render MP4 bloqueado: corrige primero los errores de QA');
    document.querySelector('#qaBtn')?.click();
  }
  function persistSession(context){try{const identity=normalizeRenderContext(context);localStorage.setItem(SESSION_KEY,JSON.stringify({jobId:client.jobId,...identity,savedAt:Date.now()}))}catch{}}
  function readSession(){try{const raw=localStorage.getItem(SESSION_KEY);if(!raw)return null;const data=JSON.parse(raw);return data?.jobId?data:null}catch{return null}}
  function clearSession(){try{localStorage.removeItem(SESSION_KEY)}catch{}}
  async function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${safeName(name||'profitmente')}.mp4`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000);return blob.size}
  function validatePostRender(state){
    const qc=state?.qc;
    if(!qc?.ok)throw new Error('El servidor terminó el MP4 sin superar el control de calidad post-render.');
    return typeof bundler?.qcSummary==='function'?bundler.qcSummary(qc):`QA post-render ${Number(qc.score)||0}/100`;
  }
  function resultRetryStatus(event){const reason=event?.code==='INVALID_RENDER_RESULT'?'respuesta MP4 inválida':'fallo de descarga';return `MP4 terminado · ${reason} · reintentando descarga ${Number(event?.nextAttempt)||2}/${client.resultMaxAttempts}`}
  async function finishActiveJob(context){
    const identity=normalizeRenderContext(context),finalState=await client.wait(s=>setStatus(`MP4 local · ${statusText(s)}`));
    const qcLabel=validatePostRender(finalState);setStatus(`${qcLabel} · preparando descarga…`);
    const mp4=await client.result({onRetry:event=>setStatus(resultRetryStatus(event))});const size=await download(mp4,identity.projectName);const freshness=evaluateRenderFreshness(identity);clearSession();
    setStatus(`MP4 final descargado · ${(size/1048576).toFixed(1)} MB · integridad MP4 ✓ · ${qcLabel}${freshnessLabel(freshness)}`);
    return {...finalState,renderFreshness:freshness};
  }
  async function resumeSavedJob(){
    const saved=readSession();if(!saved)return false;
    renderBtn.disabled=true;cancelBtn.hidden=false;
    try{
      client.attach(saved.jobId);setStatus('Reconectando con el render MP4 que seguía activo…');
      const state=await client.status();
      if(state.status==='error')throw new Error(state.error||'Falló el render guardado');
      if(state.status==='cancelled'){clearSession();setStatus('El render anterior estaba cancelado');return false}
      await finishActiveJob(saved);return true;
    }catch(err){
      if(shouldPreserveSession(err)){
        persistSession(saved);
        console.warn(err);setStatus('El render se conserva para recuperación. Recarga Studio para reintentar la descarga sin volver a renderizar.');
      }else{
        clearSession();
        if(!/HTTP 404|no encontrado|not found/i.test(err?.message||'')){console.error(err);setStatus('No se pudo recuperar el render anterior. '+renderFailure(err))}
      }
      return false;
    }finally{renderBtn.disabled=false;cancelBtn.hidden=true;client.reset()}
  }
  renderBtn.onclick=async()=>{
    save();
    let gate;
    try{gate=await renderPreflight()}catch(err){console.error(err);setStatus('No se pudo completar el Preflight de exportación: '+(err?.message||err));return}
    if(!gate.ok){reportPreflightBlock(gate);return}
    const renderProject=projectForRender(),renderAssets=snapshotAssetsForRender(),renderContext=captureRenderContext(renderProject,renderAssets);
    renderBtn.disabled=true;cancelBtn.hidden=false;client.reset();clearSession();
    try{
      const health=gate.preflight?.health||await bundler.health();if(!health.ok)throw new Error('Abre Studio con start_studio_windows.bat para activar el render MP4 directo.');if(!health.render_ready)throw new Error('FFmpeg y FFprobe no están disponibles. Instala FFmpeg gratis y vuelve a abrir Studio.');
      setStatus('Empaquetando snapshot del proyecto, ducking de voz y medios…');const blob=await bundler.build(renderProject,renderAssets);setStatus(`Enviando ${(blob.size/1048576).toFixed(1)} MB al render local…`);await client.start(blob);persistSession(renderContext);
      await finishActiveJob(renderContext);
    }catch(err){
      if(err?.name==='AbortError'||/cancelado/i.test(err?.message||'')){clearSession();setStatus('Render MP4 cancelado')}
      else if(shouldPreserveSession(err)){persistSession(renderContext);console.warn(err);setStatus('El render se conserva para recuperación. Recarga Studio para reintentar la descarga sin volver a renderizar.')}
      else{clearSession();console.error(err);setStatus(renderFailure(err))}
    }
    finally{renderBtn.disabled=false;cancelBtn.hidden=true;client.reset()}
  };
  cancelBtn.onclick=async()=>{cancelBtn.disabled=true;try{setStatus('Cancelando render local…');await client.cancel();clearSession()}catch(err){console.warn(err)}finally{cancelBtn.disabled=false}};
  setTimeout(()=>{resumeSavedJob()},0);
  window.profitMenteRenderJobClient=client;
  window.ProfitMenteAsyncRenderValidation={validatePostRender,resumeSavedJob,readSession,clearSession,statusText,renderFailure,resultRetryStatus,shouldPreserveSession,captureRenderContext,normalizeRenderContext,renderFingerprint,mediaIdentity,snapshotAssetsForRender,evaluateRenderFreshness,freshnessLabel,renderPreflight,reportPreflightBlock};
})();