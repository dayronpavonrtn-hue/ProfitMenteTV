(()=>{
  if(typeof document==='undefined'||typeof ProfitMenteWebMRenderEngine==='undefined'||window.ProfitMenteWebMRender)return;
  const renderBtn=document.querySelector('#renderBtn'),canvas=document.querySelector('#previewCanvas');
  if(!renderBtn||!canvas)return;
  const engine=new ProfitMenteWebMRenderEngine();let resources=null;
  let cancelBtn=document.querySelector('#cancelWebmBtn');
  if(!cancelBtn){cancelBtn=document.createElement('button');cancelBtn.id='cancelWebmBtn';cancelBtn.type='button';cancelBtn.textContent='■ Cancelar WebM';cancelBtn.hidden=true;cancelBtn.title='Detener el render WebM y liberar audio/video';renderBtn.insertAdjacentElement('afterend',cancelBtn)}
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function stopTracks(stream){for(const track of stream?.getTracks?.()||[]){try{track.stop()}catch{}}}
  function safeStopRecorder(recorder){try{if(recorder&&recorder.state!=='inactive')recorder.stop()}catch{}}
  function currentQuality(){return window.ProfitMentePreviewFormat?.quality||localStorage.getItem('profitmente-preview-quality')||'full'}
  function applyQuality(quality){
    if(!window.ProfitMentePreviewFormatEngine)return;
    const format=document.querySelector('#format')?.value||project?.format||'9:16';
    ProfitMentePreviewFormatEngine.apply(canvas,format,quality);
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
    const previousTime=Number(document.querySelector('#playhead')?.value||0),monitorQuality=currentQuality(),plan=ProfitMenteWebMRenderEngine.framePlan(renderProject?.duration,30),mime=ProfitMenteWebMRenderEngine.mimeType(window.MediaRecorder);
    if(!mime){setStatus?.('No hay un códec WebM compatible en este navegador');return}
    const assertRenderState=()=>{engine.assert(session);ProfitMenteWebMRenderEngine.assertState(renderState,project,assets)};
    const session=engine.begin({totalFrames:plan.totalFrames,fps:plan.fps,projectName:renderName});renderBtn.disabled=true;cancelBtn.hidden=false;applyQuality('full');
    try{
      if(typeof playing!=='undefined'&&playing)document.querySelector('#playBtn')?.click();
      assertRenderState();
      const playhead=document.querySelector('#playhead');if(playhead)playhead.value=0;
      const videoStream=canvas.captureStream(plan.fps);resources={videoStream,mixedStream:null,recorder:null};
      await audio.schedule(renderProject,assets,0,false);assertRenderState();
      const mixedStream=new MediaStream([...videoStream.getVideoTracks(),...audio.stream().getAudioTracks()]);resources.mixedStream=mixedStream;
      const recorder=new MediaRecorder(mixedStream,{mimeType:mime}),chunks=[],done=recorderDone(recorder,chunks);resources.recorder=recorder;
      recorder.start(1000);setStatus?.('Render WebM · 0%');
      for(let frame=0;frame<plan.totalFrames;frame++){
        assertRenderState();const started=performance.now(),time=plan.timeAt(frame);if(playhead)playhead.value=time;await renderAt(time);assertRenderState();
        if(frame%Math.max(1,Math.round(plan.fps/2))===0){const progress=Math.min(99,Math.round((frame+1)/plan.totalFrames*100));setStatus?.(`Render WebM · ${progress}%`)}
        const elapsed=performance.now()-started,remaining=Math.max(0,plan.frameDuration*1000-elapsed);if(remaining)await wait(remaining);
      }
      assertRenderState();safeStopRecorder(recorder);const blob=await done;assertRenderState();engine.finish(session);const size=download(blob,renderName);setStatus?.(`Render WebM listo · ${(size/1048576).toFixed(1)} MB · audio + video ✓`);
    }catch(err){
      if(err?.code==='WEBM_STATE_CHANGED'){setStatus?.('Render WebM detenido: el proyecto o sus medios cambiaron. Vuelve a exportar para evitar un archivo inconsistente')}
      else if(err?.name==='AbortError'||engine.cancelled)setStatus?.('Render WebM cancelado · recursos liberados');
      else{console.error(err);setStatus?.(`No se pudo renderizar WebM: ${err?.message||err}`)}
    }finally{await cleanup(previousTime,monitorQuality,renderProject)}
  }
  renderBtn.onclick=run;
  cancelBtn.onclick=()=>{
    if(!engine.cancel())return;cancelBtn.disabled=true;setStatus?.('Cancelando render WebM…');safeStopRecorder(resources?.recorder);stopTracks(resources?.mixedStream);stopTracks(resources?.videoStream);try{audio?.stop?.()}catch{}
  };
  window.ProfitMenteWebMRender={engine,run,cancel:()=>cancelBtn.click(),get active(){return engine.active}};
})();
