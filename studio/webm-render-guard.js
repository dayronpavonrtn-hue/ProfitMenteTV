(()=>{
  'use strict';
  const button=document.querySelector('#renderBtn');
  if(!button)return;

  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const safeStop=stream=>{try{stream?.getTracks?.().forEach(track=>track.stop())}catch{}};
  const withTimeout=(promise,ms,message)=>new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error(message)),ms);
    Promise.resolve(promise).then(
      value=>{clearTimeout(timer);resolve(value)},
      error=>{clearTimeout(timer);reject(error)}
    );
  });
  const finiteDuration=value=>Number.isFinite(+value)&&+value>0?+value:0;
  let activeJob=null;

  const cancelActive=()=>{
    if(!activeJob)return false;
    activeJob.cancelled=true;
    try{if(activeJob.recorder?.state==='recording')activeJob.recorder.stop()}catch{}
    safeStop(activeJob.mixed);safeStop(activeJob.videoStream);
    try{audio.stop()}catch{}
    setStatus('Cancelando render WebM…');
    return true;
  };
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&activeJob){event.preventDefault();cancelActive()}
  });

  button.onclick=async()=>{
    if(activeJob){cancelActive();return}
    if(!globalThis.MediaRecorder){setStatus('MediaRecorder no soportado');return}
    const duration=finiteDuration(project?.duration);
    if(!duration){setStatus('Render WebM bloqueado: duración de proyecto inválida');return}
    save();
    const report=typeof qa!=='undefined'&&qa?.inspect?qa.inspect(project,assets):null;
    if(report?.issues?.length){
      setStatus('Render WebM bloqueado: corrige primero los errores de QA');
      document.querySelector('#qaBtn')?.click();
      return;
    }

    const job={cancelled:false,recorder:null,videoStream:null,mixed:null};
    activeJob=job;
    button.textContent='■ Cancelar WebM';
    button.title='Cancelar render (Esc)';
    let objectUrl=null;
    try{
      setStatus('Renderizando WebM · 0% · Esc para cancelar');
      document.querySelector('#playhead').value=0;
      job.videoStream=canvas.captureStream(30);
      await withTimeout(audio.schedule(project,assets,0,false),10000,'El audio no pudo prepararse a tiempo');
      if(job.cancelled)throw new Error('Render cancelado por el usuario');
      job.mixed=new MediaStream([...job.videoStream.getVideoTracks(),...audio.stream().getAudioTracks()]);
      const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')?'video/webm;codecs=vp9,opus':'video/webm';
      const chunks=[];
      job.recorder=new MediaRecorder(job.mixed,{mimeType:mime});
      const finished=new Promise((resolve,reject)=>{
        job.recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
        job.recorder.onerror=e=>reject(e.error||new Error('MediaRecorder falló'));
        job.recorder.onstop=resolve;
      });
      job.recorder.start(1000);
      const frameMs=1000/30,maxFrameMs=5000;
      let lastPercent=-1;
      for(let t=0;t<duration;t+=1/30){
        if(job.cancelled)throw new Error('Render cancelado por el usuario');
        const started=performance.now();
        const rendered=await withTimeout(renderAt(t),maxFrameMs,`Frame bloqueado en ${t.toFixed(2)} s`);
        if(job.cancelled)throw new Error('Render cancelado por el usuario');
        if(rendered===false)throw new Error('El preview cambió durante el render');
        const percent=Math.min(99,Math.floor(t/duration*100));
        if(percent!==lastPercent){lastPercent=percent;setStatus(`Renderizando WebM · ${percent}% · Esc para cancelar`)}
        const wait=frameMs-(performance.now()-started);
        if(wait>0)await sleep(wait);
      }
      if(job.cancelled)throw new Error('Render cancelado por el usuario');
      if(job.recorder.state!=='recording')throw new Error('MediaRecorder se detuvo antes de completar el proyecto');
      job.recorder.stop();
      await withTimeout(finished,10000,'MediaRecorder no finalizó el archivo a tiempo');
      if(job.cancelled)throw new Error('Render cancelado por el usuario');
      const blob=new Blob(chunks,{type:job.recorder.mimeType||'video/webm'});
      if(!blob.size)throw new Error('El render produjo un archivo vacío');
      objectUrl=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=objectUrl;
      a.download=(project.name||'profitmente')+'-mix.webm';
      document.body.appendChild(a);a.click();a.remove();
      setStatus(`Render WebM listo · 100% · ${(blob.size/1048576).toFixed(1)} MB`);
    }catch(error){
      console.error(error);
      try{if(job.recorder?.state==='recording')job.recorder.stop()}catch{}
      setStatus(job.cancelled?'Render WebM cancelado':'No se pudo renderizar WebM: '+(error?.message||error));
    }finally{
      try{audio.stop()}catch{}
      safeStop(job.mixed);safeStop(job.videoStream);
      if(objectUrl)setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
      if(activeJob===job)activeJob=null;
      button.textContent='Render WebM';
      button.title='';
      button.disabled=false;
    }
  };
})();
