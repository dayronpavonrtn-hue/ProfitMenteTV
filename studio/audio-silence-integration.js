(()=>{
  const Engine=window.ProfitMenteAudioSilenceEngine;if(!Engine)return;
  const $=s=>document.querySelector(s);let ctx=null,busy=false;
  const selected=()=>{const id=window.ProfitMenteEditTools?.selectedId;return (project?.clips||[]).find(c=>Engine.sameMediaId(c?.id,id))};
  function status(t){setStatus?.(t)}
  function locked(clip){
    const track=Engine.canonicalTrack(clip?.track);
    return !!clip?.locked||Engine.trackLocked(project,clip?.track)||(track!==null&&!!window.ProfitMenteTrackControls?.state?.(track)?.locked);
  }
  async function context(){if(!ctx)ctx=new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')await ctx.resume();return ctx}
  async function decode(asset,cache){
    const key=Engine.canonicalMediaId(asset?.id);if(key!==null&&cache?.has(key))return cache.get(key);
    const c=await context(),buffer=await c.decodeAudioData(await asset.blob.arrayBuffer());if(key!==null)cache?.set(key,buffer);return buffer;
  }
  async function trimClip(clip,cache=new Map()){
    if(!clip||!Engine.isAudioTrack(clip.track)||!Engine.hasAsset(clip.asset))return {ok:false,reason:'not-audio-clip'};
    if(locked(clip))return {ok:false,reason:'locked'};
    const asset=Engine.findAsset(assets,clip.asset);if(!asset||asset.type!=='audio'||!asset.blob)return {ok:false,reason:'asset-missing'};
    const buffer=await decode(asset,cache),win=Engine.clipWindow(clip,buffer.duration),detection=Engine.detectBuffer(buffer,win.offset,win.sourceDuration),plan=Engine.trimPlan(clip,detection);
    if(!plan.ok)return {...plan,detection,clip};
    Engine.applyPlan(clip,plan);return {...plan,detection,clip};
  }
  function refresh(){persist?.();drawTimeline?.();renderAt?.(+$('#playhead')?.value||0)}
  function reasonText(r){
    if(r==='silence')return 'el tramo completo está en silencio';
    if(r==='no-silence')return 'no se detectó silencio útil en los extremos';
    if(r==='too-short')return 'el recorte dejaría el clip demasiado corto';
    if(r==='locked')return 'el clip o la pista están bloqueados';
    if(r==='asset-missing')return 'falta el archivo de audio original';
    return 'no se pudo analizar el clip';
  }
  async function runOne(){
    if(busy)return;const clip=selected();if(!clip||!Engine.isAudioTrack(clip.track)){status('Selecciona un clip de voz, música o efectos');return}
    busy=true;updateButtons();try{status('Detectando silencio localmente…');const r=await trimClip(clip);if(!r.ok){status('Sin cambios: '+reasonText(r.reason));return}refresh();status(`Silencio recortado · inicio ${(r.leading||0).toFixed(2)} s · final ${(r.trailing||0).toFixed(2)} s`)}catch(e){console.error(e);status('No se pudo recortar silencio: '+(e?.message||e))}finally{busy=false;updateButtons()}
  }
  async function runVoices(){
    if(busy)return;const clips=(project?.clips||[]).filter(c=>Engine.canonicalTrack(c?.track)===4&&Engine.hasAsset(c?.asset)&&!locked(c));if(!clips.length){status('No hay clips de voz editables para limpiar');return}
    busy=true;updateButtons();const cache=new Map();let changed=0,skipped=0,totalRemoved=0;try{status(`Limpiando silencios en ${clips.length} clip(s) de voz…`);for(const clip of clips){try{const r=await trimClip(clip,cache);if(r.ok){changed++;totalRemoved+=r.removedTimeline||0}else skipped++}catch{skipped++}}if(changed)refresh();status(`Limpieza de voz terminada · ${changed} clip(s) ajustados · ${totalRemoved.toFixed(2)} s removidos${skipped?` · ${skipped} sin cambios`:''}`)}finally{busy=false;updateButtons()}
  }
  let oneBtn=null,allBtn=null;
  function updateButtons(){const c=selected(),ok=c&&Engine.isAudioTrack(c.track)&&Engine.hasAsset(c.asset)&&!locked(c);if(oneBtn){oneBtn.disabled=busy||!ok;oneBtn.textContent=busy?'Analizando…':'✂ Recortar silencio'}if(allBtn){allBtn.disabled=busy;allBtn.textContent=busy?'Limpiando…':'✂ Limpiar silencios de voz'}}
  function install(){
    const normalize=$('#audioNormalizeClipBtn'),wrap=$('#ciVolumeWrap');if(!$('#audioSilenceTrimBtn')){oneBtn=document.createElement('button');oneBtn.id='audioSilenceTrimBtn';oneBtn.type='button';oneBtn.textContent='✂ Recortar silencio';oneBtn.title='Detecta y elimina silencio al inicio/final del clip usando análisis local';oneBtn.onclick=runOne;(normalize||wrap)?.insertAdjacentElement('afterend',oneBtn)}else oneBtn=$('#audioSilenceTrimBtn');
    const normalizeAll=$('#audioNormalizeAllBtn'),qa=$('#qaBtn');if(!$('#audioSilenceAllBtn')){allBtn=document.createElement('button');allBtn.id='audioSilenceAllBtn';allBtn.type='button';allBtn.textContent='✂ Limpiar silencios de voz';allBtn.title='Recorta automáticamente silencios de entrada/salida en todos los clips de voz';allBtn.onclick=runVoices;(normalizeAll||qa)?.insertAdjacentElement('afterend',allBtn)}else allBtn=$('#audioSilenceAllBtn');
    document.addEventListener('click',e=>{if(e.target.closest?.('.clip'))requestAnimationFrame(updateButtons)},true);setInterval(updateButtons,700);updateButtons();
  }
  install();window.ProfitMenteAudioSilence={trimClip,trimVoices:runVoices};
})();
