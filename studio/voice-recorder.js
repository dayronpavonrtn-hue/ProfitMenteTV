(function(root){
  const MIME_CANDIDATES=['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/ogg'];
  function pickMime(MediaRecorderCtor=root.MediaRecorder){
    if(!MediaRecorderCtor)return '';
    for(const mime of MIME_CANDIDATES){try{if(MediaRecorderCtor.isTypeSupported?.(mime))return mime}catch{}}
    return '';
  }
  function extensionFor(mime=''){return mime.includes('ogg')?'ogg':'webm'}
  function recordingName(date=new Date(),mime='audio/webm'){
    const stamp=date.toISOString().replace(/[:.]/g,'-').replace('T','_').replace('Z','');
    return `voz_${stamp}.${extensionFor(mime)}`;
  }
  function resolveDuration(metadataDuration,fallbackDuration){
    const metadata=Number(metadataDuration),fallback=Number(fallbackDuration);
    if(Number.isFinite(metadata)&&metadata>0)return metadata;
    return Number.isFinite(fallback)&&fallback>0?fallback:0;
  }
  function durationFromBlob(blob){
    return new Promise((resolve,reject)=>{
      const audio=document.createElement('audio'),url=URL.createObjectURL(blob);
      const clean=()=>URL.revokeObjectURL(url);
      audio.preload='metadata';audio.onloadedmetadata=()=>{const d=Number(audio.duration);clean();resolve(Number.isFinite(d)&&d>0?d:0)};
      audio.onerror=()=>{clean();reject(new Error('No se pudo leer la duración de la grabación'))};audio.src=url;
    });
  }
  class ProfitMenteVoiceRecorder{
    constructor(){this.stream=null;this.recorder=null;this.chunks=[];this.startedAt=0}
    get active(){return !!this.recorder&&this.recorder.state==='recording'}
    async start(){
      if(this.active)throw new Error('Ya hay una grabación activa');
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('Este navegador no permite acceso al micrófono');
      this.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
      const mime=pickMime(),options=mime?{mimeType:mime,audioBitsPerSecond:128000}:undefined;
      this.chunks=[];this.recorder=new MediaRecorder(this.stream,options);this.startedAt=performance.now();
      this.recorder.ondataavailable=e=>{if(e.data?.size)this.chunks.push(e.data)};
      this.recorder.start(250);return {mime:this.recorder.mimeType||mime||'audio/webm'};
    }
    stop(){
      if(!this.recorder||this.recorder.state==='inactive')return Promise.reject(new Error('No hay grabación activa'));
      return new Promise((resolve,reject)=>{
        const rec=this.recorder,mime=rec.mimeType||pickMime()||'audio/webm';
        rec.onerror=e=>reject(e.error||new Error('Error grabando audio'));
        rec.onstop=async()=>{
          try{
            const blob=new Blob(this.chunks,{type:mime}),fallback=Math.max(0,(performance.now()-this.startedAt)/1000);
            const metadata=await durationFromBlob(blob).catch(()=>0),duration=resolveDuration(metadata,fallback);
            if(!blob.size)throw new Error('La grabación no contiene audio');
            if(duration<=0)throw new Error('No se pudo determinar la duración de la grabación');
            resolve({blob,mime,duration,name:recordingName(new Date(),mime)});
          }catch(e){reject(e)}finally{this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.recorder=null;this.chunks=[]}
        };
        rec.stop();
      });
    }
    cancel(){
      const rec=this.recorder;
      if(rec){rec.ondataavailable=null;rec.onerror=null;rec.onstop=null;if(rec.state!=='inactive')try{rec.stop()}catch{}}
      this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.recorder=null;this.chunks=[];this.startedAt=0;
    }
  }
  const api={ProfitMenteVoiceRecorder,pickMime,extensionFor,recordingName,resolveDuration};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  Object.assign(root,api);
})(typeof window!=='undefined'?window:globalThis);

if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',()=>{
  const upload=document.querySelector('#uploadBtn');if(!upload||!window.ProfitMenteVoiceRecorder)return;
  const rec=new ProfitMenteVoiceRecorder(),btn=document.createElement('button'),timer=document.createElement('div');
  btn.id='recordVoiceBtn';btn.textContent='🎙 Grabar voz';btn.title='Graba narración con el micrófono y la añade a la pista Voz';
  timer.id='recordVoiceTimer';timer.className='status';timer.hidden=true;upload.insertAdjacentElement('afterend',btn);btn.insertAdjacentElement('afterend',timer);
  let clock=null,started=0;
  const stopClock=()=>{clearInterval(clock);clock=null;timer.hidden=true};
  const startClock=()=>{started=Date.now();timer.hidden=false;clock=setInterval(()=>{const s=Math.floor((Date.now()-started)/1000);timer.textContent=`● Grabando ${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`},250)};
  btn.onclick=async()=>{
    if(!rec.active){
      try{await rec.start();btn.textContent='■ Detener voz';btn.classList.add('recording');startClock();setStatus('Grabando narración… pulsa Detener cuando termines')}
      catch(e){console.error(e);setStatus('No se pudo iniciar el micrófono: '+e.message)}
      return;
    }
    btn.disabled=true;
    try{
      const r=await rec.stop();stopClock();
      const asset={id:crypto.randomUUID(),name:r.name,type:'audio',mime:r.mime,blob:r.blob,duration:r.duration,size:r.blob.size,source:'microphone'};
      await putAsset(asset);assets.push(asset);drawLibrary();
      const start=+document.querySelector('#playhead').value||0,remaining=Math.max(0,project.duration-start);
      if(remaining<.25)throw new Error('Mueve el cursor antes del final del proyecto para insertar la voz');
      const duration=Math.max(.25,Math.min(r.duration,remaining));
      addClip(6,'Voz grabada',asset.id,start,duration);
      setStatus(`Voz añadida · ${duration.toFixed(1)} s · pista Voz`);
    }catch(e){console.error(e);setStatus('No se pudo guardar la grabación: '+e.message)}
    finally{btn.disabled=false;btn.textContent='🎙 Grabar voz';btn.classList.remove('recording');stopClock()}
  };
  window.addEventListener('beforeunload',()=>rec.cancel());
});