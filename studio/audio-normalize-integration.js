(()=>{
  const Engine=window.ProfitMenteAudioNormalizeEngine;if(!Engine)return;
  const $=s=>document.querySelector(s);let ctx=null,busy=false;
  const selected=()=>{const id=window.ProfitMenteEditTools?.selectedId;return (project?.clips||[]).find(c=>c.id===id)};
  function status(t){setStatus?.(t)}
  async function context(){if(!ctx)ctx=new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')await ctx.resume();return ctx}
  async function decode(asset){const c=await context();return await c.decodeAudioData(await asset.blob.arrayBuffer())}
  function currentVolume(clip){return Number(clip.volume??(Engine.canonicalTrack(clip.track)===5?.22:1))}
  async function normalizeClip(clip,cache=new Map()){
    if(!clip||!Engine.AUDIO_TRACKS.includes(Engine.canonicalTrack(clip.track))||!Engine.hasAsset(clip.asset))return {ok:false,reason:'not-audio-clip'};
    const asset=Engine.findAsset(assets,clip.asset);if(!asset||asset.type!=='audio'||!asset.blob)return {ok:false,reason:'asset-missing'};
    const cacheKey=Engine.canonicalMediaId(asset.id);let buffer=cache.get(cacheKey);if(!buffer){buffer=await decode(asset);cache.set(cacheKey,buffer)}
    const win=Engine.clipWindow(clip,buffer.duration),metrics=Engine.analyzeBuffer(buffer,win.offset,win.sourceDuration),rec=Engine.recommendation(metrics,clip.track,currentVolume(clip));
    if(!rec.ok)return {...rec,clip};
    clip.volume=rec.volume;clip.audioNormalization={version:1,at:new Date().toISOString(),rmsDb:metrics.rmsDb,peakDb:metrics.peakDb,targetRmsDb:rec.target.rmsDb,targetPeakDb:rec.target.peakDb,gain:rec.gain};
    return {...rec,clip};
  }
  function refresh(){persist?.();drawTimeline?.();renderAt?.(+$('#playhead')?.value||0)}
  async function runOne(){if(busy)return;const clip=selected();if(!clip||!Engine.AUDIO_TRACKS.includes(Engine.canonicalTrack(clip.track))){status('Selecciona un clip de voz, música o efectos');return}busy=true;updateButtons();try{const r=await normalizeClip(clip);if(!r.ok){status(r.reason==='silence'?'No se normalizó: el tramo seleccionado está en silencio':'No se pudo analizar el audio seleccionado');return}refresh();status(`Audio normalizado · ${r.target.label} · ${r.metrics.rmsDb.toFixed(1)} dB RMS → objetivo ${r.target.rmsDb} dB${r.limitedByPeak?' · limitado por pico':''}`)}catch(e){console.error(e);status('No se pudo normalizar el audio: '+(e?.message||e))}finally{busy=false;updateButtons()}}
  async function runAll(options={}){
    const {deferPersist=false,quiet=false}=options&&typeof options==='object'?options:{};
    if(busy)return {ok:false,reason:'busy',changed:0,skipped:0};
    const audioClips=(project?.clips||[]).filter(c=>Engine.AUDIO_TRACKS.includes(Engine.canonicalTrack(c.track))&&Engine.hasAsset(c.asset));
    const clips=Engine.activeAudioClips(project);
    const inactive=Math.max(0,audioClips.length-clips.length);
    if(!clips.length){if(!quiet)status(audioClips.length?'No hay clips de audio activos para normalizar':'No hay clips de audio para normalizar');return {ok:false,reason:audioClips.length?'inactive':'empty',changed:0,skipped:inactive}}
    busy=true;updateButtons();const cache=new Map();let changed=0,skipped=inactive;
    try{
      if(!quiet)status(`Analizando ${clips.length} clip(s) de audio activo(s) localmente…`);
      for(const clip of clips){try{const r=await normalizeClip(clip,cache);r.ok?changed++:skipped++}catch{skipped++}}
      if(changed&&!deferPersist)refresh();
      if(!quiet)status(`Normalización terminada · ${changed} clip(s) ajustados${skipped?` · ${skipped} omitidos`:''}`);
      return {ok:true,changed,skipped,deferred:!!deferPersist};
    }finally{busy=false;updateButtons()}
  }
  function updateButtons(){const c=selected(),ok=c&&Engine.AUDIO_TRACKS.includes(Engine.canonicalTrack(c.track));if(oneBtn){oneBtn.disabled=busy||!ok;oneBtn.textContent=busy?'Analizando…':'⚖ Normalizar clip'}if(allBtn){allBtn.disabled=busy;allBtn.textContent=busy?'Analizando mezcla…':'⚖ Normalizar mezcla'}}
  let oneBtn=null,allBtn=null;
  function install(){
    const wrap=$('#ciVolumeWrap');if(wrap&&!$('#audioNormalizeClipBtn')){oneBtn=document.createElement('button');oneBtn.id='audioNormalizeClipBtn';oneBtn.type='button';oneBtn.textContent='⚖ Normalizar clip';oneBtn.title='Analiza localmente el tramo usado y ajusta su nivel sin servicios externos';oneBtn.onclick=runOne;wrap.insertAdjacentElement('afterend',oneBtn)}else oneBtn=$('#audioNormalizeClipBtn');
    const qa=$('#qaBtn'),aside=qa?.parentElement;if(aside&&!$('#audioNormalizeAllBtn')){allBtn=document.createElement('button');allBtn.id='audioNormalizeAllBtn';allBtn.type='button';allBtn.textContent='⚖ Normalizar mezcla';allBtn.title='Normaliza solo las pistas de audio activas según Solo/Mute y objetivos seguros';qa.insertAdjacentElement('afterend',allBtn)}else allBtn=$('#audioNormalizeAllBtn');
    document.addEventListener('click',e=>{if(e.target.closest?.('.clip'))requestAnimationFrame(updateButtons)},true);setInterval(updateButtons,700);updateButtons();
  }
  install();window.ProfitMenteAudioNormalize={normalizeClip,normalizeAll:runAll};
})();