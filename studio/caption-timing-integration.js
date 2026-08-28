(()=>{
  if(typeof document==='undefined'||typeof ProfitMenteCaptionTimingEngine==='undefined')return;
  const engine=new ProfitMenteCaptionTimingEngine(),$=s=>document.querySelector(s);
  function refresh(message){persist?.();drawTimeline?.();renderAt?.(+$('#playhead')?.value||0);setStatus?.(message)}
  const aside=$('aside');
  if(aside&&!$('#captionFromScriptBtn')){
    const btn=document.createElement('button');btn.id='captionFromScriptBtn';btn.textContent='✨ Captions desde guion';btn.title='Genera captions sincronizados localmente usando el script de la pista de voz';
    const anchor=$('#captionBtn');anchor?.after(btn);
    btn.onclick=()=>{const r=engine.rebuildFromVoice(project);if(!r.voices){setStatus?.('No hay una pista de voz con guion para generar captions');return}refresh(`Captions regenerados desde guion · ${r.created} bloques sincronizados`)};
  }
  function selectedCaption(){const id=window.ProfitMenteEditTools?.selectedId;return (project.clips||[]).find(c=>c.id===id&&Number(c.track)===3)||null}
  function ensureInspectorButton(){const form=$('#clipInspectorForm');if(!form||$('#ciRetimeWords'))return;const wrap=document.createElement('div');wrap.className='ciActions';wrap.id='ciCaptionTimingActions';wrap.hidden=true;wrap.innerHTML='<button id="ciRetimeWords" type="button">⏱ Re-sincronizar palabras</button><button id="ciClearWordTimings" type="button">Texto continuo</button>';form.appendChild(wrap);$('#ciRetimeWords').onclick=()=>{const c=selectedCaption();if(!c)return;if(engine.retimeCaption(c))refresh(`Caption sincronizado · ${c.wordTimings.length} palabras`)};$('#ciClearWordTimings').onclick=()=>{const c=selectedCaption();if(!c)return;delete c.wordTimings;c.animation='none';refresh('Caption cambiado a texto continuo')};}
  function updateInspector(){ensureInspectorButton();const wrap=$('#ciCaptionTimingActions');if(wrap)wrap.hidden=!selectedCaption()}
  document.addEventListener('click',e=>{if(e.target.closest?.('.clip'))requestAnimationFrame(updateInspector)},true);setInterval(updateInspector,500);updateInspector();
  window.ProfitMenteCaptionTiming={engine,rebuild:()=>engine.rebuildFromVoice(project),retimeSelected:()=>{const c=selectedCaption();return c?engine.retimeCaption(c):false}};
})();
