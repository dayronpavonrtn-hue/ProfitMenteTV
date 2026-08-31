(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteFreezeFrameEngine||window.ProfitMenteFreezeFrame)return;
  const $=s=>document.querySelector(s),engine=new ProfitMenteFreezeFrameEngine(),props=$('.props');if(!props)return;
  const panel=document.createElement('section');panel.className='freezeFramePanel';panel.innerHTML='<hr><h3>Freeze Frame</h3><div id="freezeFrameInfo" class="clipEmpty">Selecciona un clip de video.</div><div class="ciActions"><button id="freezeFrameSet">❄ Congelar en cursor</button><button id="freezeFrameClear">Reanudar video</button></div><small>Congela todo el clip usando exactamente el fotograma situado bajo el cursor. Se crea un PNG local reutilizable por preview, proyecto y render MP4.</small>';props.appendChild(panel);
  const style=document.createElement('style');style.textContent='.freezeFramePanel .ciActions{display:flex;flex-wrap:wrap;gap:6px}.freezeFramePanel button:disabled{opacity:.45}.freezeFramePanel small{display:block;margin-top:7px;opacity:.72;line-height:1.35}';document.head.appendChild(style);
  const selected=()=>project?.clips?.find(c=>c?.id===window.ProfitMenteEditTools?.selectedId),assetById=id=>assets?.find(a=>a.id===id),assetFor=c=>assetById(c?.asset),sourceAssetFor=c=>assetById(c?.freezeOriginalAsset)||assetFor(c),locked=c=>window.ProfitMenteEditLockGuard?window.ProfitMenteEditLockGuard.isLocked(project,c):!!c?.locked||!!project?.trackState?.[c?.track]?.locked||!!project?.trackState?.[String(c?.track)]?.locked,status=t=>typeof setStatus==='function'&&setStatus(t),playhead=()=>Number($('#playhead')?.value)||0;
  function usable(c){return !!c&&sourceAssetFor(c)?.type==='video'}
  async function extractFrame(asset,time){
    if(!asset?.blob)throw new Error('Fuente de video no disponible');
    const url=URL.createObjectURL(asset.blob),video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';video.src=url;
    try{
      await new Promise((resolve,reject)=>{if(video.readyState>=1)resolve();else{video.onloadedmetadata=resolve;video.onerror=()=>reject(new Error('No se pudo leer el video'));video.load()}});
      const target=Math.max(0,Math.min(Number(time)||0,Math.max(0,(Number(video.duration)||0)-.01)));
      await new Promise((resolve,reject)=>{let done=false;const finish=()=>{if(done)return;done=true;resolve()};video.addEventListener('seeked',finish,{once:true});video.onerror=()=>reject(new Error('No se pudo buscar el fotograma'));try{video.currentTime=target}catch(err){reject(err)}setTimeout(finish,500)});
      const w=video.videoWidth||1920,h=video.videoHeight||1080,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(video,0,0,w,h);
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('No se pudo crear PNG')),'image/png'));
      return blob;
    }finally{URL.revokeObjectURL(url);video.removeAttribute('src');video.load?.()}
  }
  async function ensureFreezeAsset(c,source,time){
    const blob=await extractFrame(source,time),id=crypto.randomUUID(),base=String(source.name||'video').replace(/\.[^.]+$/,''),name=`${base}-freeze-${Number(time).toFixed(2)}s.png`,asset={id,name,type:'image',mime:'image/png',blob,generated:true,generatedBy:'freeze-frame',sourceAssetId:source.id,sourceTime:Number(time)};
    if(typeof putAsset==='function')await putAsset(asset);assets.push(asset);drawLibrary?.();return asset;
  }
  function state(){
    const c=selected(),info=$('#freezeFrameInfo'),set=$('#freezeFrameSet'),clear=$('#freezeFrameClear');let canSet=false,canClear=false;
    if(!c){if(info)info.textContent='Selecciona un clip de video.'}
    else if(locked(c)){if(info)info.textContent='El clip o su pista está bloqueado.'}
    else if(!usable(c)){if(info)info.textContent='Freeze Frame requiere un clip de video.'}
    else{
      canSet=true;canClear=engine.frozen(c)&&!!c.freezeOriginalAsset;
      if(info)info.textContent=canClear?`${c.name||'Video'} · congelado en fuente ${Number(c.freezeFrameSource).toFixed(2)}s`:`${c.name||'Video'} · reproducción normal`;
    }
    if(set)set.disabled=!canSet;if(clear)clear.disabled=!canClear;
  }
  function refresh(){persist?.();drawTimeline?.();renderAt?.(playhead());requestAnimationFrame(state)}
  async function setFreeze(){
    const c=selected();if(!usable(c)||locked(c)){status('Selecciona un clip de video editable');state();return}
    const source=sourceAssetFor(c),t=Math.max(Number(c.start)||0,Math.min((Number(c.start)||0)+(Number(c.duration)||0)-.001,playhead())),r=engine.sourceTimeAt(c,t,source);
    if(!r.ok){status('No se pudo calcular el fotograma');return}
    try{
      status('Creando Freeze Frame local…');const freezeAsset=await ensureFreezeAsset(c,source,r.time);
      c.freezeOriginalAsset=source.id;c.freezeFrameAsset=freezeAsset.id;c.freezeFrameSource=r.time;c.asset=freezeAsset.id;refresh();status(`Fotograma congelado · fuente ${r.time.toFixed(2)}s`);
    }catch(err){console.error(err);status(`Freeze Frame falló: ${err.message||err}`);state()}
  }
  function clearFreeze(){
    const c=selected();if(!c||locked(c)){status('El clip está bloqueado');state();return}const original=c.freezeOriginalAsset;
    if(original&&assetById(original))c.asset=original;delete c.freezeOriginalAsset;delete c.freezeFrameAsset;engine.clear(c);refresh();status('Freeze Frame desactivado · reproducción normal');
  }
  $('#freezeFrameSet').onclick=()=>setFreeze();$('#freezeFrameClear').onclick=clearFreeze;
  document.addEventListener('click',()=>requestAnimationFrame(state),true);
  document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||e.ctrlKey||e.metaKey)return;if(e.altKey&&e.key.toLowerCase()==='f'){e.preventDefault();setFreeze()}});
  window.ProfitMenteFreezeFrame={engine,state,set:setFreeze,clear:clearFreeze,extractFrame};state();
})();