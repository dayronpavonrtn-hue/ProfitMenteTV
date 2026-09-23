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

  button.onclick=async()=>{
    if(!globalThis.MediaRecorder){setStatus('MediaRecorder no soportado');return}
    save();
    const report=typeof qa!=='undefined'&&qa?.inspect?qa.inspect(project,assets):null;
    if(report?.issues?.length){
      setStatus('Render WebM bloqueado: corrige primero los errores de QA');
      document.querySelector('#qaBtn')?.click();
      return;
    }

    button.disabled=true;
    let videoStream=null,mixed=null,recorder=null,objectUrl=null;
    try{
      setStatus('Renderizando WebM + audio…');
      document.querySelector('#playhead').value=0;
      videoStream=canvas.captureStream(30);
      await withTimeout(audio.schedule(project,assets,0,false),10000,'El audio no pudo prepararse a tiempo');
      mixed=new MediaStream([...videoStream.getVideoTracks(),...audio.stream().getAudioTracks()]);
      const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')?'video/webm;codecs=vp9,opus':'video/webm';
      const chunks=[];
      recorder=new MediaRecorder(mixed,{mimeType:mime});
      const finished=new Promise((resolve,reject)=>{
        recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
        recorder.onerror=e=>reject(e.error||new Error('MediaRecorder falló'));
        recorder.onstop=resolve;
      });
      recorder.start(1000);
      const frameMs=1000/30;
      const maxFrameMs=5000;
      for(let t=0;t<project.duration;t+=1/30){
        const started=performance.now();
        const rendered=await withTimeout(renderAt(t),maxFrameMs,`Frame bloqueado en ${t.toFixed(2)} s`);
        if(rendered===false)throw new Error('El preview cambió durante el render');
        const wait=frameMs-(performance.now()-started);
        if(wait>0)await sleep(wait);
      }
      if(recorder.state!=='recording')throw new Error('MediaRecorder se detuvo antes de completar el proyecto');
      recorder.stop();
      await withTimeout(finished,10000,'MediaRecorder no finalizó el archivo a tiempo');
      const blob=new Blob(chunks,{type:recorder.mimeType||'video/webm'});
      if(!blob.size)throw new Error('El render produjo un archivo vacío');
      objectUrl=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=objectUrl;
      a.download=(project.name||'profitmente')+'-mix.webm';
      document.body.appendChild(a);a.click();a.remove();
      setStatus(`Render WebM listo · ${(blob.size/1048576).toFixed(1)} MB`);
    }catch(error){
      console.error(error);
      try{if(recorder?.state==='recording')recorder.stop()}catch{}
      setStatus('No se pudo renderizar WebM: '+(error?.message||error));
    }finally{
      audio.stop();
      safeStop(mixed);safeStop(videoStream);
      if(objectUrl)setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
      button.disabled=false;
    }
  };
})();
