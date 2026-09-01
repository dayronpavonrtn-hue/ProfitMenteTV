(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteAutoTransitionEngine||window.ProfitMenteAutoTransitions)return;
  const Engine=window.ProfitMenteAutoTransitionEngine,$=s=>document.querySelector(s);
  function run(force=false){
    const result=Engine.apply(project,{force});
    if(result.changed){persist?.();drawTimeline?.();renderAt?.(+($('#playhead')?.value||0))}
    setStatus?.(`Transiciones auto · ${result.changed} ajustada(s)${result.preserved?` · ${result.preserved} manual(es) preservada(s)`:''}${result.locked?` · ${result.locked} bloqueada(s) respetada(s)`:''}${result.skipped?` · ${result.skipped} hueco(s) omitido(s)`:''}`);
    return result;
  }
  function install(){
    if($('#autoTransitionBtn'))return;const anchor=$('#autoFinishBtn')||$('#generateBtn')||$('#qaBtn');if(!anchor)return;
    const btn=document.createElement('button');btn.id='autoTransitionBtn';btn.type='button';btn.textContent='✨ Transiciones auto';btn.title='Aplica transiciones locales a escenas generadas contiguas sin sobrescribir ajustes manuales ni clips/pistas bloqueados.';btn.onclick=()=>run(false);anchor.insertAdjacentElement('afterend',btn);
  }
  install();new MutationObserver(install).observe(document.body,{childList:true,subtree:true});
  window.ProfitMenteAutoTransitions={inspect:()=>Engine.inspect(project),run,force:()=>run(true)};
})();