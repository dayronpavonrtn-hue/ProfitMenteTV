(()=>{
  const renderBtn=document.querySelector('#renderBtn');
  const cancelBtn=document.querySelector('#cancelRenderBtn');
  const Clock=globalThis.ProfitMenteRenderClock;
  if(!renderBtn||!cancelBtn||!Clock)return;

  let active=null;
  const finishRecorder=rec=>new Promise(resolve=>{
    if(!rec||rec.state==='inactive'){resolve();return}
    rec.addEventListener('stop',resolve,{once:true});
    try{rec.stop()}catch{resolve()}
  });
  const stopTracks=stream=>stream?.getTracks?.().forEach(track=>{try{track.stop()}catch{}});

  cancelBtn.onclick=()=>{
    if(!active)return;
    cancelBtn.disabled=true;
    setStatus('Cancelando render WebM…');
    active.controller.abort();
  };

  renderBtn.onclick=async()=>{
    if(active)return;
    if(!globalThis.MediaRecorder){setStatus('MediaRecorder no soportado');return}
    save();
    let report;
    try{report=qa?.inspect?.(project,assets)}catch(error){console.error(error);setStatus('Render WebM bloqueado: QA no disponible');return}
    if(!report||report.ok!==true||(Array.isArray(report.issues)&&report.issues.length)){
      setStatus('Render WebM bloqueado: corrige primero los errores de QA');
      document.querySelector('#qaBtn')?.click();
      return;
    }

    const controller=new AbortController();
    active={controller};
    renderBtn.disabled=true;
    cancelBtn.hidden=false;
    cancelBtn.disabled=false;
    document.querySelector('#playhead').value=0;
    let recorder=null,mixed=null,videoStream=null,chunks=[];
    try{
      setStatus('Renderizando WebM…');
      videoStream=canvas.captureStream(30);
      await audio.schedule(project,assets,0,false);
      if(controller.signal.aborted)throw Object.assign(new Error('Render cancelado'),{name:'AbortError'});
      mixed=new MediaStream([...videoStream.getVideoTracks(),...audio.stream().getAudioTracks()]);
      const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')?'video/webm;codecs=vp9,opus':'video/webm';
      recorder=new MediaRecorder(mixed,{mimeType:mime});
      recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
      recorder.start(1000);
      const clock=new Clock({fps:30});
      const result=await clock.run(project.duration,async t=>{
        if(controller.signal.aborted)return;
        await renderAt(t);
        document.querySelector('#playhead').value=Math.min(project.duration,t);
        syncForm();
      },{signal:controller.signal});
      await finishRecorder(recorder);
      if(controller.signal.aborted)return;
      const blob=new Blob(chunks,{type:'video/webm'});
      if(!blob.size)throw new Error('El render WebM quedó vacío');
      const a=document.createElement('a'),url=URL.createObjectURL(blob);
      a.href=url;a.download=(project.name||'profitmente')+'-mix.webm';a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      setStatus(`Render WebM listo · ${result.frames} frames · ${(blob.size/1048576).toFixed(1)} MB`);
    }catch(error){
      if(error?.name==='AbortError')setStatus('Render WebM cancelado');
      else{console.error(error);setStatus('No se pudo renderizar WebM: '+(error?.message||error))}
    }finally{
      await finishRecorder(recorder);
      audio.stop();
      stopTracks(mixed);stopTracks(videoStream);
      active=null;
      renderBtn.disabled=false;
      cancelBtn.disabled=true;
      cancelBtn.hidden=true;
    }
  };
})();
