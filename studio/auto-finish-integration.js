(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteAutoFinishEngine||window.ProfitMenteAutoFinish)return;
  const Engine=window.ProfitMenteAutoFinishEngine,$=s=>document.querySelector(s);let busy=false,lastReport=null;
  function runQA(){
    if(!window.ProfitMenteQAEngine)return null;
    try{return new window.ProfitMenteQAEngine().inspect(project,assets)}catch(err){console.error('Auto Finish QA failed',err);return null}
  }
  async function run(){
    if(busy)return null;busy=true;const btn=$('#autoFinishBtn');if(btn){btn.disabled=true;btn.textContent='Finalizando…'}
    const completed=[],skipped=[];lastReport=null;
    try{
      const plan=Engine.plan(project,assets);setStatus?.(`Auto Finish local · ${plan.steps.length} paso(s)…`);
      for(const step of plan.steps){
        if(step==='repair'){
          const r=window.ProfitMenteQAAutofix?.repair?.(project,assets);if(r){completed.push(`reparación ${r.changed||0}`)}else skipped.push('reparación');
        }else if(step==='smart-mix'){
          if(window.ProfitMenteSmartMix?.apply){await window.ProfitMenteSmartMix.apply();completed.push('mezcla')}else skipped.push('mezcla');
        }else if(step==='detect-beats'){
          if(window.ProfitMenteBeatDetect?.run){await window.ProfitMenteBeatDetect.run();completed.push('beats')}else skipped.push('beats');
        }else if(step==='sync-beats'){
          if(window.ProfitMenteBeatSync?.run){window.ProfitMenteBeatSync.run();completed.push('sync')}else skipped.push('sync');
        }else if(step==='auto-transitions'){
          if(window.ProfitMenteAutoTransitions?.run){const r=window.ProfitMenteAutoTransitions.run(false);completed.push(`transiciones ${r?.changed||0}`)}else skipped.push('transiciones');
        }else if(step==='qa'){
          lastReport=runQA();
          if(lastReport)completed.push(`QA ${lastReport.score}/100`);else skipped.push('QA');
        }
      }
      persist?.();drawTimeline?.();syncForm?.();await renderAt?.(+($('#playhead')?.value||0));
      $('#qaBtn')?.click();
      if(lastReport&&!lastReport.ok){
        setStatus?.(`Auto Finish completado con bloqueo QA · ${lastReport.score}/100 · ${lastReport.issues.length} error(es) · corrige antes de exportar`);
      }else{
        setStatus?.(`Auto Finish listo · ${completed.join(' · ')}${skipped.length?` · omitido: ${skipped.join(', ')}`:''} · $0 local`);
      }
      window.dispatchEvent?.(new CustomEvent('profitmente:auto-finish-complete',{detail:{completed:[...completed],skipped:[...skipped],qa:lastReport}}));
      return {completed,skipped,qa:lastReport};
    }catch(err){console.error(err);setStatus?.('Auto Finish no pudo completar todos los pasos: '+(err?.message||err));return {completed,skipped,qa:lastReport,error:String(err?.message||err)}}
    finally{busy=false;if(btn){btn.disabled=false;btn.textContent='✨ Auto Finish'}}
  }
  function install(){
    if($('#autoFinishBtn'))return;const anchor=$('#generateBtn')||$('#qaBtn');if(!anchor)return;
    const btn=document.createElement('button');btn.id='autoFinishBtn';btn.type='button';btn.textContent='✨ Auto Finish';btn.title='Finaliza localmente el montaje: reparación segura, mezcla, ritmo, transiciones y QA. No publica ni usa servicios de pago.';btn.onclick=run;anchor.insertAdjacentElement('afterend',btn);
  }
  install();new MutationObserver(install).observe(document.body,{childList:true,subtree:true});
  window.ProfitMenteAutoFinish={inspect:()=>Engine.inspect(project,assets),plan:()=>Engine.plan(project,assets),run,get lastReport(){return lastReport}};
})();
