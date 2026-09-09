(()=>{
  if(typeof document==='undefined'||window.ProfitMenteAudioQC||!window.ProfitMenteAudioQCEngine)return;
  const Engine=window.ProfitMenteAudioQCEngine,Wave=window.ProfitMenteAudioWaveformEngine;
  const style=document.createElement('style');style.id='profitmenteAudioQCStyle';style.textContent=`.clip[data-audio-qc="clipping"]{box-shadow:inset 0 0 0 2px #ff4d5a}.clip[data-audio-qc="hot"]{box-shadow:inset 0 0 0 2px #ffb84d}.audioQcPanel{margin-top:8px}.audioQcPanel button{width:100%}.audioQcResult{font-size:12px;line-height:1.35;margin-top:6px}`;document.head.appendChild(style);
  const panel=document.createElement('div');panel.className='audioQcPanel';panel.innerHTML='<button id="audioQcBtn" type="button">🔊 Revisar picos de audio</button><div id="audioQcResult" class="audioQcResult" hidden></div>';
  (document.querySelector('.props')||document.querySelector('aside'))?.appendChild(panel);
  const button=panel.querySelector('#audioQcBtn'),resultEl=panel.querySelector('#audioQcResult');
  function canonicalId(value){return Wave?.canonicalMediaId?.(value)??(value==null?null:String(value))}
  function sameId(a,b){const x=canonicalId(a),y=canonicalId(b);return x!==null&&y!==null&&x===y}
  function assetFor(id){return (typeof assets!=='undefined'?assets:[]).find(a=>sameId(a?.id,id))||null}
  function eligible(clip){const track=Engine.canonicalTrack(clip?.track);return [0,1,4,5,6].includes(track)&&clip?.asset!==null&&clip?.asset!==undefined&&(track>3||!clip?.muted)}
  function clearMarks(){document.querySelectorAll('.clip[data-audio-qc]').forEach(el=>{delete el.dataset.audioQc;el.removeAttribute('data-audio-qc-db')})}
  function mark(clip,inspection){const el=[...document.querySelectorAll('.clip[data-id]')].find(node=>sameId(node.dataset.id,clip?.id));if(!el)return;el.dataset.audioQc=inspection.status;if(Number.isFinite(inspection.dbfs))el.dataset.audioQcDb=inspection.dbfs.toFixed(1)}
  async function inspect(){
    if(!Wave||!window.ProfitMenteAudioWaveforms?.decodeAsset)throw new Error('Formas de onda de audio no disponibles');
    clearMarks();button.disabled=true;resultEl.hidden=false;resultEl.textContent='Analizando audio localmente…';
    const rows=[];
    try{
      for(const clip of (typeof project!=='undefined'?project?.clips||[]:[]).filter(eligible)){
        const asset=assetFor(clip.asset);if(!asset||!['audio','video'].includes(asset.type)){rows.push({clip,status:'unavailable',reason:'asset_missing'});continue}
        const decoded=await window.ProfitMenteAudioWaveforms.decodeAsset(asset);if(!decoded){rows.push({clip,status:'unavailable',reason:'decode_failed'});continue}
        const inspection=Engine.inspectClip({project,clip,peaks:decoded.peaks,sourceDuration:decoded.duration,waveformEngine:Wave});rows.push({...inspection,clip});mark(clip,inspection);
      }
      const summary=Engine.summarize(rows);const worst=rows.filter(r=>Number.isFinite(r.dbfs)).sort((a,b)=>b.dbfs-a.dbfs)[0];
      const parts=[`${summary.total} clip(s)`,`${summary.clipping} clipping`,`${summary.hot} cerca de 0 dB`,`${summary.silent} silencioso(s)`];if(summary.unavailable)parts.push(`${summary.unavailable} sin analizar`);if(worst)parts.push(`pico máx. ${worst.dbfs.toFixed(1)} dBFS`);
      resultEl.textContent=parts.join(' · ');if(typeof setStatus==='function')setStatus(summary.clipping?`Audio QA: ${summary.clipping} clip(s) con riesgo de clipping`:'Audio QA completado: sin clipping detectado');
      document.dispatchEvent(new CustomEvent('profitmente:audio-qc',{detail:{summary,rows}}));return {summary,rows};
    }finally{button.disabled=false}
  }
  button?.addEventListener('click',()=>inspect().catch(error=>{console.error(error);resultEl.hidden=false;resultEl.textContent='No se pudo analizar el audio: '+error.message;if(typeof setStatus==='function')setStatus(resultEl.textContent)}));
  ['profitmente:project-loaded','profitmente:media-relinked'].forEach(name=>document.addEventListener(name,clearMarks));
  window.ProfitMenteAudioQC={inspect,clearMarks};
})();
