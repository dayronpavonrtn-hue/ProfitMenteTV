(()=>{
  if(typeof document==='undefined'||window.ProfitMenteAudioQC||!window.ProfitMenteAudioQCEngine)return;
  const Engine=window.ProfitMenteAudioQCEngine,Wave=window.ProfitMenteAudioWaveformEngine;
  const style=document.createElement('style');style.id='profitmenteAudioQCStyle';style.textContent=`.clip[data-audio-qc="clipping"]{box-shadow:inset 0 0 0 2px #ff4d5a}.clip[data-audio-qc="hot"]{box-shadow:inset 0 0 0 2px #ffb84d}.audioQcPanel{margin-top:8px}.audioQcPanel button{width:100%;margin-top:4px}.audioQcResult{font-size:12px;line-height:1.35;margin-top:6px}`;document.head.appendChild(style);
  const panel=document.createElement('div');panel.className='audioQcPanel';panel.innerHTML='<button id="audioQcBtn" type="button">🔊 Revisar picos de audio</button><button id="audioQcHeadroomBtn" type="button" title="Reduce automáticamente los niveles editables para dejar la mezcla a -1 dBFS">🛡 Corregir headroom (-1 dB)</button><div id="audioQcResult" class="audioQcResult" hidden></div>';
  (document.querySelector('.props')||document.querySelector('aside'))?.appendChild(panel);
  const button=panel.querySelector('#audioQcBtn'),headroomBtn=panel.querySelector('#audioQcHeadroomBtn'),resultEl=panel.querySelector('#audioQcResult');let lastAnalysis=null,busy=false;
  function canonicalId(value){return Wave?.canonicalMediaId?.(value)??(value==null?null:String(value))}
  function sameId(a,b){const x=canonicalId(a),y=canonicalId(b);return x!==null&&y!==null&&x===y}
  function assetFor(id){return (typeof assets!=='undefined'?assets:[]).find(a=>sameId(a?.id,id))||null}
  function eligible(clip){const track=Engine.canonicalTrack(clip?.track);return [0,1,4,5,6].includes(track)&&clip?.asset!==null&&clip?.asset!==undefined&&(track>3||!clip?.muted)}
  function clearMarks(){document.querySelectorAll('.clip[data-audio-qc]').forEach(el=>{delete el.dataset.audioQc;el.removeAttribute('data-audio-qc-db')});lastAnalysis=null;updateHeadroomButton()}
  function mark(clip,inspection){const el=[...document.querySelectorAll('.clip[data-id]')].find(node=>sameId(node.dataset.id,clip?.id));if(!el)return;el.dataset.audioQc=inspection.status;if(Number.isFinite(inspection.dbfs))el.dataset.audioQcDb=inspection.dbfs.toFixed(1)}
  function updateHeadroomButton(){
    if(!headroomBtn)return;const plan=lastAnalysis&&typeof project!=='undefined'?Engine.planHeadroomFix(project,lastAnalysis.rows,lastAnalysis.mix):null;
    headroomBtn.disabled=busy||!plan?.needed||!plan?.ok;headroomBtn.title=plan?.lockedClipIds?.length?`No se puede corregir: ${plan.lockedClipIds.length} clip(s) de riesgo están bloqueados`:'Reduce automáticamente los niveles editables para dejar la mezcla a -1 dBFS';
  }
  async function inspect(){
    if(!Wave||!window.ProfitMenteAudioWaveforms?.decodeAsset)throw new Error('Formas de onda de audio no disponibles');
    clearMarks();busy=true;button.disabled=true;headroomBtn.disabled=true;resultEl.hidden=false;resultEl.textContent='Analizando audio localmente…';
    const rows=[];
    try{
      for(const clip of (typeof project!=='undefined'?project?.clips||[]:[]).filter(eligible)){
        const asset=assetFor(clip.asset);if(!asset||!['audio','video'].includes(asset.type)){rows.push({clip,status:'unavailable',reason:'asset_missing'});continue}
        const decoded=await window.ProfitMenteAudioWaveforms.decodeAsset(asset);if(!decoded){rows.push({clip,status:'unavailable',reason:'decode_failed'});continue}
        const inspection=Engine.inspectClip({project,clip,peaks:decoded.peaks,sourceDuration:decoded.duration,waveformEngine:Wave});rows.push({...inspection,clip});mark(clip,inspection);
      }
      const summary=Engine.summarize(rows),mix=Engine.inspectMixOverlaps(rows);const worst=rows.filter(r=>Number.isFinite(r.dbfs)).sort((a,b)=>b.dbfs-a.dbfs)[0];
      const parts=[`${summary.total} clip(s)`,`${summary.clipping} clipping`,`${summary.hot} cerca de 0 dB`,`${summary.silent} silencioso(s)`];if(summary.unavailable)parts.push(`${summary.unavailable} sin analizar`);if(worst)parts.push(`pico clip ${worst.dbfs.toFixed(1)} dBFS`);if(mix.clipping)parts.push(`${mix.clipping} tramo(s) de mezcla con clipping estimado`);else if(mix.hot)parts.push(`${mix.hot} tramo(s) de mezcla cerca de 0 dB`);if(mix.worst)parts.push(`mezcla máx. ${mix.worst.dbfs.toFixed(1)} dBFS`);
      resultEl.textContent=parts.join(' · ');const totalRisk=summary.clipping+mix.clipping;if(typeof setStatus==='function')setStatus(totalRisk?`Audio QA: ${totalRisk} riesgo(s) de clipping entre clips y mezcla`:'Audio QA completado: sin clipping detectado');
      lastAnalysis={summary,mix,rows};document.dispatchEvent(new CustomEvent('profitmente:audio-qc',{detail:lastAnalysis}));return lastAnalysis;
    }finally{busy=false;button.disabled=false;updateHeadroomButton()}
  }
  async function fixHeadroom(){
    if(busy)return {ok:false,reason:'busy',changed:0};try{
      if(!lastAnalysis)await inspect();if(!lastAnalysis)return {ok:false,reason:'analysis-unavailable',changed:0};
      const plan=Engine.planHeadroomFix(project,lastAnalysis.rows,lastAnalysis.mix,{targetDb:-1});
      if(!plan.needed){resultEl.hidden=false;resultEl.textContent='La mezcla ya tiene headroom seguro (≤ -1 dBFS).';if(typeof setStatus==='function')setStatus('Audio QA: no fue necesario ajustar headroom');return {...plan,ok:true,reason:'already-safe',changed:0}}
      if(!plan.ok){resultEl.hidden=false;resultEl.textContent=`No se modificó la mezcla: ${plan.lockedClipIds.length} clip(s) de riesgo están bloqueados.`;if(typeof setStatus==='function')setStatus('Headroom no corregido: desbloquea los clips o pistas de riesgo');return {...plan,reason:'locked-risk',changed:0}}
      const applied=Engine.applyHeadroomFix(project,lastAnalysis.rows,lastAnalysis.mix,{targetDb:-1});if(!applied.changed)return {...applied,reason:'no-editable-risk'};
      if(typeof persist==='function')persist();if(typeof drawTimeline==='function')drawTimeline();if(typeof renderAt==='function')renderAt(+(document.querySelector('#playhead')?.value||0));
      document.dispatchEvent(new CustomEvent('profitmente:audio-headroom-fixed',{detail:applied}));lastAnalysis=null;
      if(typeof setStatus==='function')setStatus(`Headroom corregido · ${applied.changed} clip(s) · ${applied.gainDb.toFixed(1)} dB`);
      const analysis=await inspect();return {...applied,reason:'corrected',analysis};
    }catch(error){console.error(error);resultEl.hidden=false;resultEl.textContent='No se pudo corregir el headroom: '+(error?.message||error);if(typeof setStatus==='function')setStatus(resultEl.textContent);return {ok:false,reason:'error',changed:0,error:String(error?.message||error)}}
  }
  button?.addEventListener('click',()=>inspect().catch(error=>{console.error(error);resultEl.hidden=false;resultEl.textContent='No se pudo analizar el audio: '+error.message;if(typeof setStatus==='function')setStatus(resultEl.textContent)}));
  headroomBtn?.addEventListener('click',fixHeadroom);
  ['profitmente:project-loaded','profitmente:media-relinked'].forEach(name=>document.addEventListener(name,clearMarks));
  window.ProfitMenteAudioQC={inspect,fixHeadroom,clearMarks};updateHeadroomButton();
})();
