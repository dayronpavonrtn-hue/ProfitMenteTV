(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteFrameNudgeEngine)return;
  const E=window.ProfitMenteFrameNudgeEngine,$=s=>document.querySelector(s);
  function selectedId(){return window.ProfitMenteEditTools?.selectedId||null}
  function selectedIds(){
    const api=window.ProfitMenteMultiSelect;
    const ids=typeof api?.selected==='function'?api.selected():api?.engine?.values?.();
    if(Array.isArray(ids)&&ids.length)return ids;
    const id=selectedId();return id?[id]:[];
  }
  function typing(){return ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)}
  function redraw(){drawTimeline?.();renderAt?.(+$('#playhead')?.value||0)}
  function snapshot(){return {duration:project?.duration,starts:(project?.clips||[]).map(c=>[c,c?.start])}}
  function restore(snap){if(!snap)return;for(const [clip,start] of snap.starts)clip.start=start;if(project)project.duration=snap.duration;redraw()}
  function commit(snap){
    try{persist?.();redraw();return true}catch(error){restore(snap);console.error('ProfitMente Frame Nudge persist rollback',error);return false}
  }
  function nudge(frames){
    const ids=selectedIds();if(!ids.length){setStatus?.('Selecciona uno o varios clips para mover por fotogramas');return null}
    const snap=snapshot(),result=E.applySelection(project,ids,frames);
    if(!result.ok){
      const messages={locked:'Movimiento cancelado: un clip, grupo o pista está bloqueado',boundary:'No cabe otro fotograma completo antes de 0:00',ambiguous_id:'Movimiento cancelado: hay IDs de clips ambiguos',invalid_id:'Movimiento cancelado: selección inválida',invalid_clip:'Movimiento cancelado: hay tiempos de clip inválidos',invalid_project:'Movimiento cancelado: duración de proyecto inválida'};
      setStatus?.(messages[result.reason]||'No se pudo mover la selección');return result;
    }
    if(!commit(snap)){setStatus?.('No se pudo guardar el movimiento; se restauró la timeline');return {...result,ok:false,reason:'persist_failed',rolledBack:true}}
    const dir=result.delta<0?'izquierda':'derecha',framesMoved=Math.abs(result.appliedFrames??Math.round(result.delta/E.frame(project))),label=result.changed>1?'clips':'clip';
    setStatus?.(`${result.changed} ${label} movido${result.changed===1?'':'s'} ${framesMoved} fotograma(s) a la ${dir}`);
    return result;
  }
  document.addEventListener('keydown',e=>{
    if(typing()||!e.altKey||e.ctrlKey||e.metaKey||!['ArrowLeft','ArrowRight'].includes(e.key))return;
    const dir=e.key==='ArrowLeft'?-1:1,step=e.shiftKey?10:1;e.preventDefault();nudge(dir*step);
  });
  const head=document.querySelector('.timelineHead');
  if(head&&!$('#frameNudgeHelp')){const hint=document.createElement('small');hint.id='frameNudgeHelp';hint.textContent='Alt+←/→ 1 frame · Shift+Alt 10';hint.title='Mover clip, grupo o selección múltiple por fotogramas';head.appendChild(hint)}
  window.ProfitMenteFrameNudge={engine:E,nudge};
})();