(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteRenderQAGuard{
    inspect(engine,project,assets){
      if(!engine||typeof engine.inspect!=='function')return {ok:false,issues:['Motor QA no disponible'],warnings:[]};
      try{const report=engine.inspect(project,Array.isArray(assets)?assets:[]);if(!report||typeof report!=='object')return {ok:false,issues:['QA no produjo un reporte válido'],warnings:[]};return report}catch(error){return {ok:false,issues:['QA falló antes del render: '+(error?.message||String(error))],warnings:[]}}
    }
    blocked(report){return !report||typeof report!=='object'||(Array.isArray(report.issues)&&report.issues.length>0)||report.ok!==true}
  }
  root.ProfitMenteRenderQAGuard=ProfitMenteRenderQAGuard;
  if(typeof document==='undefined')return;
  const button=document.querySelector('#renderBtn');if(!button||button.dataset.qaGuard==='1')return;
  const fallback=button.onclick;if(typeof fallback!=='function')return;const guard=new ProfitMenteRenderQAGuard();button.dataset.qaGuard='1';
  button.onclick=async function(event){
    if(button.disabled)return;if(typeof save==='function')save();
    const report=guard.inspect(typeof qa!=='undefined'?qa:null,typeof project!=='undefined'?project:null,typeof assets!=='undefined'?assets:[]);
    if(guard.blocked(report)){if(typeof setStatus==='function')setStatus('Render WebM bloqueado: corrige primero los errores de QA');document.querySelector('#qaBtn')?.click();return}
    if(!root.ProfitMenteRenderClock||typeof canvas==='undefined'||typeof audio==='undefined'||typeof renderAt!=='function'){button.disabled=true;try{return await fallback.call(this,event)}finally{button.disabled=false}}
    if(!root.MediaRecorder){if(typeof setStatus==='function')setStatus('MediaRecorder no soportado');return}
    button.disabled=true;let recorder=null;
    try{
      if(typeof setStatus==='function')setStatus('Renderizando video + audio en tiempo real…');
      const playhead=document.querySelector('#playhead');if(playhead)playhead.value=0;
      const videoStream=canvas.captureStream(30);await audio.schedule(project,assets,0,false);
      const mixed=new MediaStream([...videoStream.getVideoTracks(),...audio.stream().getAudioTracks()]);
      const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')?'video/webm;codecs=vp9,opus':'video/webm',chunks=[];
      recorder=new MediaRecorder(mixed,{mimeType:mime});recorder.ondataavailable=e=>e.data.size&&chunks.push(e.data);
      const stopped=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=e=>reject(e.error||new Error('Falló MediaRecorder'))});
      recorder.start();const clock=new root.ProfitMenteRenderClock({fps:30});
      await clock.run(project.duration,async t=>{if(playhead)playhead.value=t;if(typeof syncForm==='function')syncForm();await renderAt(t)});
      recorder.stop();await stopped;audio.stop();const blob=new Blob(chunks,{type:'video/webm'});if(!blob.size)throw new Error('El render produjo un archivo vacío');
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(project.name||'profitmente')+'-mix.webm';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
      if(typeof setStatus==='function')setStatus('Render con audio listo · duración sincronizada');
    }catch(error){console.error(error);try{if(recorder&&recorder.state!=='inactive')recorder.stop()}catch{}try{audio.stop()}catch{}if(typeof setStatus==='function')setStatus('Render falló: '+(error?.message||String(error)))}finally{button.disabled=false}
  };
})();
