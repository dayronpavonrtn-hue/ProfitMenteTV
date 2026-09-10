(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteRippleGapEngine)return;
  const E=window.ProfitMenteRippleGapEngine,$=s=>document.querySelector(s);
  function ensureWordTimingSync(){
    if(window.ProfitMenteTimelineWordTimingSync||document.querySelector('script[data-profitmente-word-sync]'))return;
    const script=document.createElement('script');script.src='timeline-word-timing-sync.js';script.async=false;script.dataset.profitmenteWordSync='1';
    script.onerror=()=>console.warn('No se pudo cargar la sincronización de word timings de timeline');
    document.body.appendChild(script);
  }
  ensureWordTimingSync();
  function typing(){return ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)}
  function now(){const el=$('#playhead'),n=Number(el?.value);return Number.isFinite(n)?n:0}
  function refresh(time){
    persist?.();drawTimeline?.();
    const next=Math.max(0,Math.min(Number(project?.duration)||0,Number(time)||0)),head=$('#playhead');if(head)head.value=next;
    window.ProfitMenteTransport?.seek?.(next);renderAt?.(next);
    window.ProfitMenteRenderRange?.refresh?.();
  }
  function closeAt(time=now()){
    const result=E.apply(project,time);
    if(!result.ok){
      const messages={
        no_gap:'El cursor no está dentro de un hueco global de la timeline',
        locked:'No se cerró el hueco: un clip o pista posterior está bloqueado',
        group_spans_gap:'No se cerró el hueco: un grupo enlazado tiene miembros a ambos lados',
        ambiguous_id:'No se cerró el hueco: hay IDs de clips ambiguos',
        invalid_time:'No se cerró el hueco: posición del cursor inválida',
        invalid_clip:'No se cerró el hueco: la timeline contiene un clip inválido',
        invalid_project:'No se cerró el hueco: proyecto inválido'
      };
      setStatus?.(messages[result.reason]||'No se pudo cerrar el hueco');return result;
    }
    refresh(result.gap.start);
    const seconds=result.gap.duration.toFixed(2),moved=result.changed?` · ${result.changed} clip(s) desplazados`:'';
    const words=result.wordsShifted?` · ${result.wordsShifted} palabra(s) sincronizadas`:'';
    setStatus?.(`Hueco cerrado · ${seconds}s eliminados${moved}${words}`);return result;
  }
  function mount(){
    const head=document.querySelector('.timelineHead');if(!head||$('#rippleGapBtn'))return;
    const btn=document.createElement('button');btn.id='rippleGapBtn';btn.type='button';btn.textContent='⇤ Cerrar hueco';btn.title='Cerrar el hueco global bajo el cursor y desplazar todo lo posterior (Shift+Delete)';btn.onclick=()=>closeAt();head.appendChild(btn);
  }
  document.addEventListener('keydown',e=>{
    if(typing()||!e.shiftKey||e.ctrlKey||e.metaKey||e.altKey||e.key!=='Delete')return;
    e.preventDefault();closeAt();
  });
  window.addEventListener('load',mount,{once:true});
  window.addEventListener('profitmente:project-restored',mount);
  if(document.readyState!=='loading')mount();
  window.ProfitMenteRippleGap={engine:E,closeAt};
})();