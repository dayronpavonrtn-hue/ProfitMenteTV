(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteAutoFinishEngine||window.ProfitMenteAutoFinish)return;
  const Engine=window.ProfitMenteAutoFinishEngine,$=s=>document.querySelector(s);let busy=false,renderBusy=false,lastReport=null,lastPreflight=null;
  function runQA(){
    if(!window.ProfitMenteQAEngine)return null;
    try{return new window.ProfitMenteQAEngine().inspect(project,assets)}catch(err){console.error('Auto Finish QA failed',err);return null}
  }
  async function runPreflight(){
    if(typeof window.ProfitMenteExportPreflightRun!=='function')return null;
    try{return await window.ProfitMenteExportPreflightRun()}catch(err){console.error('Auto Finish export preflight failed',err);return null}
  }
  function getProjectHistoryEngine(){return window.ProfitMenteProjectHistory?.engine||null}
  function captureAutomationState(){
    const projectHistory=getProjectHistoryEngine();
    return {
      project:structuredClone(project),
      assets:structuredClone(Array.isArray(assets)?assets:[]),
      projectHistory:projectHistory?.exportState?.()||null
    };
  }
  async function restoreAutomationState(snapshot){
    if(!snapshot)return false;
    project=structuredClone(snapshot.project);assets=structuredClone(snapshot.assets);
    const projectHistory=getProjectHistoryEngine();
    const historyRestored=!!(snapshot.projectHistory&&projectHistory?.importState?.(snapshot.projectHistory));
    persist?.();drawTimeline?.();drawLibrary?.();syncForm?.();
    const playhead=$('#playhead');if(playhead)playhead.value=Math.max(0,Math.min(Number(project?.duration)||0,+playhead.value||0));
    await renderAt?.(+(playhead?.value||0));
    if(!historyRestored&&typeof historyEngine!=='undefined'&&historyEngine?.seed)historyEngine.seed(project);
    window.dispatchEvent?.(new CustomEvent('profitmente:auto-finish-rolled-back',{detail:{reason:'step-error',historyRestored}}));
    return true;
  }
  async function startLocalRenderAndWait(renderBtn){
    if(!renderBtn||renderBtn.disabled)return {started:false,awaited:false};
    const handler=renderBtn.onclick;
    if(typeof handler!=='function'){
      renderBtn.click();
      return {started:true,awaited:false};
    }
    renderBtn.disabled=true;
    try{
      await handler.call(renderBtn);
      return {started:true,awaited:true};
    }finally{
      renderBtn.disabled=false;
    }
  }
  async function run(){
    if(busy)return null;busy=true;const btn=$('#autoFinishBtn');if(btn){btn.disabled=true;btn.textContent='Finalizando…'}
    const completed=[],skipped=[];lastReport=null;lastPreflight=null;const automationSnapshot=captureAutomationState();
    try{
      const plan=Engine.plan(project,assets);setStatus?.(`Auto Finish local · ${plan.steps.length} paso(s)…`);
      for(const step of plan.steps){
        if(step==='repair'){
          const r=window.ProfitMenteQAAutofix?.repair?.(project,assets);if(r){completed.push(`reparación ${r.changed||0}`)}else skipped.push('reparación');
        }else if(step==='fill-visual-gaps'){
          if(window.profitMenteVisualGapFill?.run){
            const r=window.profitMenteVisualGapFill.run(true),created=Array.isArray(r?.created)?r.created.length:0,unresolved=Array.isArray(r?.unresolved)?r.unresolved:[];
            const reasons=new Set(unresolved.map(item=>item?.reason).filter(Boolean));
            if(created)completed.push(`huecos visuales ${created}`);
            else if(reasons.has('visual-tracks-locked'))skipped.push('huecos visuales protegidos');
            else if(reasons.has('visual-tracks-hidden'))skipped.push('huecos visuales ocultos');
            else if(unresolved.length)skipped.push('huecos visuales sin medios');
            else completed.push('huecos visuales 0');
          }else skipped.push('huecos visuales');
        }else if(step==='smart-mix'){
          if(window.ProfitMenteSmartMix?.apply){await window.ProfitMenteSmartMix.apply();completed.push('mezcla')}else skipped.push('mezcla');
        }else if(step==='detect-beats'){
          if(window.ProfitMenteBeatDetect?.run){await window.ProfitMenteBeatDetect.run();completed.push('beats')}else skipped.push('beats');
        }else if(step==='sync-beats'){
          if(window.ProfitMenteBeatSync?.run){
            const r=window.ProfitMenteBeatSync.run();
            if(r?.reason==='locked-edit')skipped.push('sync protegido');
            else if(r?.reason)skipped.push('sync');
            else completed.push('sync');
          }else skipped.push('sync');
        }else if(step==='auto-transitions'){
          if(window.ProfitMenteAutoTransitions?.run){
            const r=window.ProfitMenteAutoTransitions.run(false);
            if(r?.changed)completed.push(`transiciones ${r.changed}`);
            else if(r?.locked)skipped.push(`transiciones protegidas ${r.locked}`);
            else completed.push('transiciones 0');
          }else skipped.push('transiciones');
        }else if(step==='qa'){
          lastReport=runQA();
          if(lastReport)completed.push(`QA ${lastReport.score}/100`);else skipped.push('QA');
        }
      }
      persist?.();drawTimeline?.();syncForm?.();await renderAt?.(+($('#playhead')?.value||0));
      $('#qaBtn')?.click();
      if(lastReport?.ok){
        lastPreflight=await runPreflight();
        if(lastPreflight)completed.push(`preflight ${lastPreflight.state}`);else skipped.push('preflight');
      }
      if(lastReport&&!lastReport.ok){
        setStatus?.(`Auto Finish completado con bloqueo QA · ${lastReport.score}/100 · ${lastReport.issues.length} error(es) · corrige antes de exportar`);
      }else if(lastPreflight?.canRender){
        setStatus?.(`Auto Finish listo · QA ${lastReport?.score||0}/100 · MP4 directo listo · $0 local`);
      }else if(lastPreflight?.canPackage){
        setStatus?.(`Auto Finish listo · QA ${lastReport?.score||0}/100 · paquete exportable · MP4 directo no disponible · $0 local`);
      }else{
        setStatus?.(`Auto Finish listo · ${completed.join(' · ')}${skipped.length?` · omitido: ${skipped.join(', ')}`:''} · $0 local`);
      }
      window.dispatchEvent?.(new CustomEvent('profitmente:auto-finish-complete',{detail:{completed:[...completed],skipped:[...skipped],qa:lastReport,preflight:lastPreflight}}));
      return {completed,skipped,qa:lastReport,preflight:lastPreflight};
    }catch(err){
      console.error(err);let rolledBack=false;
      try{rolledBack=await restoreAutomationState(automationSnapshot)}catch(restoreErr){console.error('Auto Finish rollback failed',restoreErr)}
      setStatus?.(rolledBack?'Auto Finish encontró un error y revirtió todos los cambios parciales: '+(err?.message||err):'Auto Finish no pudo completar todos los pasos: '+(err?.message||err));
      return {completed,skipped,qa:lastReport,preflight:lastPreflight,error:String(err?.message||err),rolledBack};
    }
    finally{busy=false;if(btn){btn.disabled=false;btn.textContent='✨ Auto Finish'}}
  }
  async function runAndRender(){
    if(renderBusy||busy)return null;renderBusy=true;const btn=$('#autoFinishRenderBtn');if(btn){btn.disabled=true;btn.textContent='Finalizando + MP4…'}
    try{
      const result=await run();
      if(!result||result.error||!result.qa?.ok)return {...(result||{}),renderStarted:false};
      if(!result.preflight?.canRender){
        if(result.preflight?.canPackage)setStatus?.(`Auto Finish completado · QA ${result.qa.score}/100 · MP4 directo no disponible; el paquete $0 sigue disponible`);
        return {...result,renderStarted:false};
      }
      const renderBtn=$('#renderMp4Btn');
      if(!renderBtn||renderBtn.disabled){setStatus?.('Auto Finish completado · MP4 local listo, pero el control de render está ocupado o no disponible');return {...result,renderStarted:false}}
      setStatus?.(`Auto Finish aprobado · QA ${result.qa.score}/100 · iniciando MP4 local…`);
      window.dispatchEvent?.(new CustomEvent('profitmente:auto-finish-render-started',{detail:{qa:result.qa,preflight:result.preflight}}));
      const renderState=await startLocalRenderAndWait(renderBtn);
      return {...result,renderStarted:renderState.started,renderAwaited:renderState.awaited};
    }finally{renderBusy=false;if(btn){btn.disabled=false;btn.textContent='✨ Auto Finish + MP4'}}
  }
  function install(){
    const anchor=$('#generateBtn')||$('#qaBtn');if(!anchor)return;
    let btn=$('#autoFinishBtn');
    if(!btn){btn=document.createElement('button');btn.id='autoFinishBtn';btn.type='button';btn.textContent='✨ Auto Finish';btn.title='Finaliza localmente el montaje: reparación segura, relleno visual, mezcla, ritmo, transiciones, QA y preflight de exportación. No publica ni usa servicios de pago.';btn.onclick=run;anchor.insertAdjacentElement('afterend',btn)}
    if(!$('#autoFinishRenderBtn')){const render=document.createElement('button');render.id='autoFinishRenderBtn';render.type='button';render.textContent='✨ Auto Finish + MP4';render.title='Finaliza, valida y, solo si QA y preflight pasan, inicia la exportación MP4 local $0. No publica ni usa servicios de pago.';render.onclick=runAndRender;btn.insertAdjacentElement('afterend',render)}
  }
  install();new MutationObserver(install).observe(document.body,{childList:true,subtree:true});
  window.ProfitMenteAutoFinish={inspect:()=>Engine.inspect(project,assets),plan:()=>Engine.plan(project,assets),run,runAndRender,startLocalRenderAndWait,captureAutomationState,restoreAutomationState,get lastReport(){return lastReport},get lastPreflight(){return lastPreflight}};
})();
