(()=>{
  if(typeof document==='undefined'||typeof ProfitMenteSceneDetectEngine==='undefined')return;
  const host=document.querySelector('#sceneBtn')?.parentElement||document.querySelector('aside');if(!host)return;
  const btn=document.createElement('button');btn.id='detectCutsBtn';btn.textContent='✦ Detectar cortes del video';btn.title='Analiza localmente el video y crea marcadores en los cambios de escena';
  document.querySelector('#sceneBtn')?.insertAdjacentElement('afterend',btn);
  const seek=(video,time)=>new Promise((resolve,reject)=>{const done=()=>{cleanup();resolve()};const fail=()=>{cleanup();reject(video.error||new Error('No se pudo leer el video'))};const cleanup=()=>{video.removeEventListener('seeked',done);video.removeEventListener('error',fail)};video.addEventListener('seeked',done,{once:true});video.addEventListener('error',fail,{once:true});video.currentTime=Math.max(0,Math.min(Number(video.duration)||0,time))});
  async function analyzeClip(clip,asset){
    const url=URL.createObjectURL(asset.blob),video=document.createElement('video');video.muted=true;video.preload='auto';video.src=url;
    try{
      await new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=()=>reject(video.error||new Error('Video no compatible'))});
      const speed=Math.max(.01,Number(clip.speed)||1),sourceStart=Math.max(0,Number(clip.sourceOffset)||0),sourceEnd=Math.min(Number(video.duration)||Infinity,sourceStart+Math.max(.1,Number(clip.duration)||0)*speed);
      const fps=3,step=1/fps,canvas=document.createElement('canvas');canvas.width=64;canvas.height=36;const ctx=canvas.getContext('2d',{willReadFrequently:true}),frames=[];
      for(let t=sourceStart;t<=sourceEnd+.0001;t+=step){await seek(video,t);ctx.drawImage(video,0,0,canvas.width,canvas.height);const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data,pixels=new Uint8Array(canvas.width*canvas.height);for(let i=0,j=0;i<rgba.length;i+=4,j++)pixels[j]=Math.round(rgba[i]*.299+rgba[i+1]*.587+rgba[i+2]*.114);frames.push({time:t,pixels});}
      return ProfitMenteSceneDetectEngine.detect(frames,{minGap:.65,sensitivity:3.5,floor:.08});
    }finally{video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url)}
  }
  function pickClip(){const t=+document.querySelector('#playhead')?.value||0;return project.clips.find(c=>c.track<=1&&c.asset&&t>=c.start&&t<c.start+c.duration&&assets.find(a=>a.id===c.asset&&a.type==='video'))||project.clips.find(c=>c.track<=1&&c.asset&&assets.find(a=>a.id===c.asset&&a.type==='video'))||null}
  btn.onclick=async()=>{
    const clip=pickClip();if(!clip){setStatus?.('No hay un clip de video para analizar');return}const asset=assets.find(a=>a.id===clip.asset);if(!asset?.blob){setStatus?.('El medio del clip no está disponible localmente');return}
    btn.disabled=true;try{
      setStatus?.(`Analizando cortes de ${asset.name}…`);const result=await analyzeClip(clip,asset);if(!Array.isArray(project.markers))project.markers=[];
      const existing=project.markers.map(m=>Number(m.time)||0),added=[];
      for(const cut of result.cuts){const time=ProfitMenteSceneDetectEngine.timelineTime(cut.time,clip);if(time<clip.start-.01||time>clip.start+clip.duration+.01)continue;if(existing.some(x=>Math.abs(x-time)<.2)||added.some(x=>Math.abs(x-time)<.2))continue;const marker={id:globalThis.crypto?.randomUUID?.()||`scene-${Date.now()}-${added.length}`,time,label:`Corte ${added.length+1}`};project.markers.push(marker);added.push(time)}
      project.markers.sort((a,b)=>a.time-b.time);persist();window.markerEngine?.render?.();setStatus?.(added.length?`${added.length} corte(s) detectado(s) y marcado(s) en el timeline`:`No se detectaron cortes fuertes en ${asset.name}`);
    }catch(err){console.error(err);setStatus?.('No se pudo analizar el video: '+(err?.message||err))}finally{btn.disabled=false}
  };
  window.ProfitMenteSceneDetect={analyzeClip,pickClip};
})();
