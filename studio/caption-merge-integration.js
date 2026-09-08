(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteCaptionMergeEngine||window.ProfitMenteCaptionMerge)return;
  const $=s=>document.querySelector(s),engine=new ProfitMenteCaptionMergeEngine();
  function selectedCaption(){const id=window.ProfitMenteEditTools?.selectedId;return (project.clips||[]).find(c=>String(c.id)===String(id)&&Number(c.track)===3)||null}
  function status(t){if(typeof setStatus==='function')setStatus(t)}
  function commit(message){persist?.();drawTimeline?.();renderAt?.(+($('#playhead')?.value||0));window.ProfitMenteMultiSelect?.refresh?.();status(message)}
  function reasonText(reason){return ({'no-next':'No hay otro caption después del seleccionado','gap-too-large':'El siguiente caption está demasiado lejos para unirlo con seguridad','locked':'El caption seleccionado está bloqueado','next-locked':'El siguiente caption está bloqueado','ambiguous-id':'El proyecto contiene IDs de clips ambiguos','invalid-project':'El proyecto no es válido','invalid-clip':'Hay un clip con datos inválidos','not-caption':'Selecciona un caption de la pista Captions'}[reason]||'No se pudieron unir los captions')}
  function mergeSelected(){
    const cap=selectedCaption();if(!cap){status('Selecciona un caption para unirlo con el siguiente');return false}
    const result=engine.mergeWithNext(project,cap.id,{maxGap:.75});
    if(!result.ok){status(reasonText(result.reason));return false}
    window.ProfitMenteEditTools?.select?.(result.merged.id);
    commit(`Captions unidos · ${result.wordTimings?`${result.wordTimings} palabras sincronizadas`:'texto continuo'}${result.styleMismatch?' · se conservó el estilo del primero':''}`);return true;
  }
  function ensureButton(){
    const form=$('#clipInspectorForm');if(!form||$('#ciMergeNextCaption'))return;
    const timing=$('#ciCaptionTimingActions');
    const button=document.createElement('button');button.id='ciMergeNextCaption';button.type='button';button.textContent='⇄ Unir con siguiente caption';button.title='Une este caption con el siguiente si están separados por 0.75 s o menos';
    if(timing)timing.appendChild(button);else form.appendChild(button);button.onclick=mergeSelected;
  }
  function refresh(){ensureButton();const b=$('#ciMergeNextCaption');if(b)b.disabled=!selectedCaption()}
  document.addEventListener('click',e=>{if(e.target.closest?.('.clip'))requestAnimationFrame(refresh)},true);
  window.addEventListener('profitmente:features-ready',refresh);setInterval(refresh,700);refresh();
  window.ProfitMenteCaptionMerge={engine,mergeSelected,refresh};
})();
