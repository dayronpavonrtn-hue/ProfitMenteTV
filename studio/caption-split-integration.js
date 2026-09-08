(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteCaptionSplitEngine||window.ProfitMenteCaptionSplit)return;
  const $=s=>document.querySelector(s),engine=new ProfitMenteCaptionSplitEngine();
  function selectedCaption(){
    const id=window.ProfitMenteEditTools?.selectedId,key=engine.idKey(id);if(key===null)return null;
    return (project.clips||[]).find(c=>engine.idKey(c?.id)===key&&engine.trackKey(c?.track)==='3')||null;
  }
  function status(text){if(typeof setStatus==='function')setStatus(text)}
  function reasonText(reason){return ({'too-close-to-edge':'Mueve el playhead al interior del caption, al menos 1 frame lejos de cada borde','locked':'El caption seleccionado está bloqueado','ambiguous-id':'El proyecto contiene IDs de clips ambiguos','invalid-project':'El proyecto no es válido','invalid-clip':'Hay un clip con datos inválidos','invalid-time':'El playhead no tiene un tiempo válido','not-caption':'Selecciona un caption de la pista Captions','empty-side':'El corte dejaría un lado sin palabras; mueve ligeramente el playhead','text-too-short':'El caption necesita al menos dos palabras para dividirse','id-exhausted':'No se pudo crear una identidad segura para el nuevo caption'}[reason]||'No se pudo dividir el caption')}
  function splitSelected(){
    const cap=selectedCaption();if(!cap){status('Selecciona un caption para dividirlo');return false}
    const playhead=+($('#playhead')?.value??NaN),before=engine.clone(project.clips),result=engine.split(project,cap.id,playhead);
    if(!result.ok){status(reasonText(result.reason));return false}
    try{
      persist?.();drawTimeline?.();renderAt?.(playhead);window.ProfitMenteEditTools?.select?.(result.right.id);window.ProfitMenteMultiSelect?.set?.([result.right.id]);window.ProfitMenteMultiSelect?.refresh?.();
    }catch(err){project.clips=before;drawTimeline?.();renderAt?.(playhead);status('No se guardó la división; Studio restauró el caption original');console.error(err);return false}
    status(`Caption dividido en ${result.split.toFixed(3)} s · ${result.wordTimings?`${result.leftWords}+${result.rightWords} palabras sincronizadas`:'texto repartido entre ambos bloques'}`);return true;
  }
  function ensureButton(){
    const form=$('#clipInspectorForm');if(!form||$('#ciSplitCaption'))return;
    const timing=$('#ciCaptionTimingActions');const button=document.createElement('button');button.id='ciSplitCaption';button.type='button';button.textContent='✂ Dividir caption en playhead';button.title='Divide el caption seleccionado exactamente en el frame del playhead';
    if(timing)timing.appendChild(button);else form.appendChild(button);button.onclick=splitSelected;
  }
  function refresh(){ensureButton();const button=$('#ciSplitCaption'),cap=selectedCaption();if(button)button.disabled=!cap}
  document.addEventListener('click',e=>{if(e.target.closest?.('.clip'))requestAnimationFrame(refresh)},true);window.addEventListener('profitmente:features-ready',refresh);setInterval(refresh,700);refresh();
  window.ProfitMenteCaptionSplit={engine,splitSelected,refresh};
})();
