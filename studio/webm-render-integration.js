(()=>{
  if(typeof document==='undefined'||typeof ProfitMenteWebMRenderEngine==='undefined'||window.ProfitMenteWebMRender)return;
  const renderBtn=document.querySelector('#renderBtn'),canvas=document.querySelector('#previewCanvas');
  if(!renderBtn||!canvas)return;
  const engine=new ProfitMenteWebMRenderEngine();let resources=null,qcLoader=null;
  let cancelBtn=document.querySelector('#cancelWebmBtn');
  if(!cancelBtn){cancelBtn=document.createElement('button');cancelBtn.id='cancelWebmBtn';cancelBtn.type='button';cancelBtn.textContent='■ Cancelar WebM';cancelBtn.hidden=true;cancelBtn.title='Detener el render WebM y liberar audio/video';renderBtn.insertAdjacentElement('afterend',cancelBtn)}
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function stopTracks(stream){for(const track of stream?.getTracks?.()||[]){try{track.stop()}catch{}}}
  function safeStopRecorder(recorder){try{if(recorder&&recorder.state!=='inactive')recorder.stop()}catch{}}
  function currentQuality(){return window.ProfitMentePreviewFormat?.quality||localStorage.getItem('profitmente-preview-quality')||'full'}
  function projectFps(target=project){return ProfitMenteWebMRenderEngine.normalizeFps(target?.fps||30)}
  function applyQuality(quality){
    if(!window.ProfitMentePreviewFormatEngine)return;
    const format=document.querySelector('#format')?.value||project?.format||'9:16';
    ProfitMentePreviewFormatEngine.apply(canvas,format,quality);
  }
  function applyExportDimensions(target=project){
    const format=document.querySelector('#format')?.value||target?.format||'9:16';
    if(window.ProfitMentePreviewFormatEngine?.exportDimensions){
      const next=ProfitMentePreviewFormatEngine.exportDimensions(format);
      canvas.width=next.width;canvas.height=next.height;
      if(canvas.dataset){canvas.dataset.projectFormat=ProfitMentePreviewFormatEngine.normalize(format);canvas.dataset.previewQuality='export'}
      return {...next,format:ProfitMentePreviewFormatEngine.normalize(format),quality:'export'};
    }
    applyQuality('full');return {width:canvas.width,height:canvas.height,format,quality:'full'};
  }
  function recorderDone(recorder,chunks){return new Promise((resolve,reject)=>{
    recorder.addEventListener('dataavailable',event=>{if(event.data?.size)chunks.push(event.data)});
    recorder.addEventListener('stop',()=>resolve(new Blob(chunks,{type:'video/webm'})),{once:true});
    recorder.addEventListener('error',event=>reject(event.error||new Error('Falló MediaRecorder')),{once:true});
  })}
  function download(blob,projectName){
    if(!blob?.size)throw new Error('El render WebM terminó vacío');
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${String(projectName||'profitmente').replace(/[^a-zA-Z0-9._-]+/g,'_')}-mix.webm`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);return blob.size;
  }
  async function ensureQCEngine(){
    if(window.ProfitMenteWebMQCEngine)return window.ProfitMenteWebMQCEngine;
    if(!qcLoader)qcLoader=new Promise((resolve,reject)=>{const existing=[...document.scripts].find(s=>s.src.endsWith('/webm-qc-engine.js')||s.src.endsWith('webm-qc-engine.js'));if(existing){existing.addEventListener('load',()=>resolve(window.ProfitMenteWebMQCEngine),{once:true});existing.addEventListener('error',()=>reject(new Error('No se pudo cargar el control post-render WebM')),{once:true});return}const script=document.createElement('script');script.src='webm-qc-engine.js';script.async=false;script.onload=()=>resolve(window.ProfitMenteWebMQCEngine);script.onerror=()=>reject(new Error('No se pudo cargar el control post-render WebM'));document.body.appendChild(script)});
    const QC=await qcLoader;if(!QC)throw new Error('Control post-render WebM no disponible');return QC;
  }
  async function validateWebM(blob,{duration,width,height,fps}){
    const QC=await ensureQCEngine();
    setStatus?.('Validando WebM final antes de descargar…');
    const result=await QC.inspectBlob(blob,{duration,width,height,fps});
    if(!result.ok){const detail=result.issues?.slice(0,2).join(' · ')||'archivo inválido';const error=new Error(`QA WebM bloqueó la descarga: ${detail}`);error.code='WEBM_QC_FAILED';error.qc=result;throw error}
    return result;
  }
  async function cleanup(previousTime,monitorQuality,renderProject){
    safeStopRecorder(resources?.recorder);stopTracks(resources?.mixedStream);stopTracks(resources?.videoStream);try{audio?.stop?.()}catch{}
    resources=null;engine.reset();cancelBtn.hidden=true;cancelBtn.disabled=false;renderBtn.disabled=false;
    applyQuality(monitorQuality);
    const playhead=document.querySelector('#playhead');
    const restoreTime=project===renderProject?previousTime:Number(playhead?.value||0);
    if(playhead)playhead.value=Math.max(0,Math.min(Number(project?.duration)||0,restoreTime));
    try{syncForm?.()}catch{}try{await renderAt?.(Number(playhead?.value||0))}catch{}
  }
  async function run(){
    if(engine.active)return;
    if(!window.MediaRecorder||typeof canvas.captureStream!=='function'){setStatus?.('Render WebM no soportado por este navegador');return}
    save?.();
    if(typeof qa!=='undefined'){
      const report=qa.inspect(project,assets);if(report.issues?.length){setStatus?.('Render WebM bloqueado: corrige primero los errores de QA');document.querySelector('#qaBtn')?.click();return}
    }
    const renderProject=project,renderState=ProfitMenteWebMRenderEngine.captureState(renderProject,assets),renderName=String(renderProject?.name||'profitmente');
    const previousTime=Number(document.querySelector('#playhead')?.value||0),monitorQuality=currentQuality(),plan=ProfitMenteWebMRenderEngine.framePlan(renderProject?.duration,projectFps(renderProject)),mime=ProfitMenteWebMRenderEngine.mimeType(window.MediaRecorder);
    if(!mime){setStatus?.('No hay un códec WebM compatible en este navegador');return}
    const renderQuality=ProfitMenteWebMRenderEngine.normalizeQuality(renderProject?.renderQuality||'high');
    const exportSize=applyExportDimensions(renderProject);
    const recorderOptions=ProfitMenteWebMRenderEngine.recorderOptions({mimeType:mime,quality:renderQuality,width:exportSize.width,height:exportSize.height,fps:plan.fps});
    const assertRenderState=()=>{engine.assert(session);ProfitMenteWebMRenderEngine.assertState(renderState,project,assets)};
    const session=engine.begin({totalFrames:plan.totalFrames,fps:plan.fps,projectName:renderName,renderQuality,width:exportSize.width,height:exportSize.height,videoBitsPerSecond:recorderOptions.videoBitsPerSecond});renderBtn.disabled=true;cancelBtn.hidden=false;
    try{
      if(typeof playing!=='undefined'&&playing)document.querySelector('#playBtn')?.click();
      assertRenderState();
      const playhead=document.querySelector('#playhead');if(playhead)playhead.value=0;
      const videoStream=canvas.captureStream(plan.fps);resources={videoStream,mixedStream:null,recorder:null};
      await audio.schedule(renderProject,assets,0,false);assertRenderState();
      const mixedStream=new MediaStream([...videoStream.getVideoTracks(),...audio.stream().getAudioTracks()]);resources.mixedStream=mixedStream;
      const recorder=new MediaRecorder(mixedStream,recorderOptions),chunks=[],done=recorderDone(recorder,chunks);resources.recorder=recorder;
      recorder.start(1000);setStatus?.(`Render WebM ${exportSize.width}×${exportSize.height} · ${plan.fps} FPS · ${renderQuality} · 0%`);
      for(let frame=0;frame<plan.totalFrames;frame++){
        assertRenderState();const started=performance.now(),time=plan.timeAt(frame);if(playhead)playhead.value=time;await renderAt(time);assertRenderState();
        if(frame%Math.max(1,Math.round(plan.fps/2))===0){const progress=Math.min(99,Math.round((frame+1)/plan.totalFrames*100));setStatus?.(`Render WebM ${exportSize.width}×${exportSize.height} · ${plan.fps} FPS · ${renderQuality} · ${progress}%`)}
        const elapsed=performance.now()-started,remaining=Math.max(0,plan.frameDuration*1000-elapsed);if(remaining)await wait(remaining);
      }
      assertRenderState();safeStopRecorder(recorder);const blob=await done;assertRenderState();
      const qc=await validateWebM(blob,{duration:plan.duration,width:exportSize.width,height:exportSize.height,fps:plan.fps});assertRenderState();
      const QC=await ensureQCEngine();engine.finish(session);const size=download(blob,renderName);setStatus?.(`Render WebM listo · ${QC.summary(qc)} · ${plan.fps} FPS · ${renderQuality} · ${(size/1048576).toFixed(1)} MB · audio + video ✓`);
    }catch(err){
      if(err?.code==='WEBM_STATE_CHANGED'){setStatus?.('Render WebM detenido: el proyecto o sus medios cambiaron. Vuelve a exportar para evitar un archivo inconsistente')}
      else if(err?.code==='WEBM_QC_FAILED'){console.error(err);setStatus?.(err.message)}
      else if(err?.name==='AbortError'||engine.cancelled)setStatus?.('Render WebM cancelado · recursos liberados');
      else{console.error(err);setStatus?.(`No se pudo renderizar WebM: ${err?.message||err}`)}
    }finally{await cleanup(previousTime,monitorQuality,renderProject)}
  }
  renderBtn.onclick=run;
  cancelBtn.onclick=()=>{
    if(!engine.cancel())return;cancelBtn.disabled=true;setStatus?.('Cancelando render WebM…');safeStopRecorder(resources?.recorder);stopTracks(resources?.mixedStream);stopTracks(resources?.videoStream);try{audio?.stop?.()}catch{}
  };
  window.ProfitMenteWebMRender={engine,run,cancel:()=>cancelBtn.click(),projectFps,applyExportDimensions,validateWebM,ensureQCEngine,get active(){return engine.active}};
})();
