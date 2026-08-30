(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteFrameNudgeEngine)return;
  const E=window.ProfitMenteFrameNudgeEngine,$=s=>document.querySelector(s);
  function selectedId(){return window.ProfitMenteEditTools?.selectedId||null}
  function typing(){return ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)}
  function refresh(){persist?.();drawTimeline?.();renderAt?.(+$('#playhead')?.value||0)}
  function nudge(frames){
    const id=selectedId();if(!id){setStatus?.('Selecciona un clip para mover por fotogramas');return null}
    const result=E.apply(project,id,frames);
    if(!result.ok){
      const msg=result.reason==='locked'?'La pista o un miembro del grupo está bloqueado':result.reason==='boundary'?'El clip ya está en el límite del proyecto':'No se pudo mover el clip';
      setStatus?.(msg);return result;
    }
    refresh();
    const dir=result.delta<0?'izquierda':'derecha',framesMoved=Math.round(Math.abs(result.delta)/E.frame(project));
    setStatus?.(`${result.changed>1?'Grupo':'Clip'} movido ${framesMoved} fotograma(s) a la ${dir}`);
    return result;
  }
  document.addEventListener('keydown',e=>{
    if(typing()||!e.altKey||e.ctrlKey||e.metaKey||!['ArrowLeft','ArrowRight'].includes(e.key))return;
    const dir=e.key==='ArrowLeft'?-1:1,step=e.shiftKey?10:1;e.preventDefault();nudge(dir*step);
  });
  const head=document.querySelector('.timelineHead');
  if(head&&!$('#frameNudgeHelp')){const hint=document.createElement('small');hint.id='frameNudgeHelp';hint.textContent='Alt+←/→ 1 frame · Shift+Alt 10';hint.title='Mover clip o grupo seleccionado por fotogramas';head.appendChild(hint)}
  window.ProfitMenteFrameNudge={engine:E,nudge};
})();
