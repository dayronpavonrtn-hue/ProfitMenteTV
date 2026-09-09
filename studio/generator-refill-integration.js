(()=>{
  if(typeof document==='undefined'||typeof project==='undefined'||typeof assets==='undefined')return;
  if(window.ProfitMenteGeneratorRefill)return;

  const status=text=>typeof setStatus==='function'&&setStatus(text);
  const buttonHost=document.querySelector('#generateBtn');
  if(!buttonHost)return;

  function helper(){return window.ProfitMenteGeneratorAutoFillIntegration||null}
  function summarize(result){
    const parts=[];
    const visual=Number(result?.primary||0)+Number(result?.broll||0);
    if(visual)parts.push(`${Number(result.primary||0)} escena(s) y ${Number(result.broll||0)} B-roll completado(s)`);
    if(result?.narration)parts.push('narración conectada');
    if(result?.music)parts.push('música conectada');
    if(result?.sfx)parts.push(`${result.sfx} SFX colocado(s)`);
    if(result?.after)parts.push(`${result.after} escena(s) visual(es) aún pendientes`);
    return parts.join(' · ');
  }
  async function refill(){
    const fill=helper();
    if(!fill){status('El motor de automatización todavía no está listo');return {changed:false,reason:'not-ready'}}
    if(project?.mode!=='Automático'){status('Completar con biblioteca solo modifica proyectos en modo Automático');return {changed:false,reason:'manual-mode'}}
    const available=fill.usableAssets(Array.isArray(assets)?assets:[]);
    if(!available.length){status('No hay medios locales utilizables para completar el proyecto');return {changed:false,reason:'no-assets'}}

    const snapshot=structuredClone(project);
    try{
      if(typeof fill.prepareImported==='function')await fill.prepareImported(available);
      const current=fill.usableAssets(Array.isArray(assets)?assets:[]);
      const result=fill.fill(project,current,current);
      if(!result.changed){
        const pending=Number(result.after||0);
        status(pending?`La biblioteca no contiene medios compatibles para ${pending} escena(s) pendiente(s)`:'El proyecto automático ya está completo con los medios disponibles');
        return {...result,reason:'unchanged'};
      }
      if(typeof save==='function')save();
      else if(typeof persist==='function'){persist();drawTimeline?.();drawLibrary?.();renderAt?.(+document.querySelector('#playhead')?.value||0)}
      status(`Biblioteca aplicada sin regenerar el guion · ${summarize(result)}`);
      window.dispatchEvent(new CustomEvent('profitmente:generator-refilled',{detail:{...result}}));
      return {...result,reason:'ok'};
    }catch(error){
      console.error('ProfitMente generator refill failed',error);
      project=snapshot;
      try{
        if(typeof originalPersist==='function')originalPersist();else if(typeof persist==='function')persist();
        drawTimeline?.();drawLibrary?.();syncForm?.();await renderAt?.(+document.querySelector('#playhead')?.value||0);
      }catch(restoreError){console.error('ProfitMente generator refill rollback failed',restoreError)}
      status(`No se pudo completar desde la biblioteca; el proyecto fue restaurado: ${error?.message||error}`);
      return {changed:false,reason:'error',error};
    }
  }

  const button=document.createElement('button');
  button.id='refillFromLibraryBtn';
  button.type='button';
  button.textContent='✨ Completar con biblioteca';
  button.title='Rellena escenas y audio automáticos pendientes usando medios locales ya guardados, sin regenerar el guion';
  buttonHost.insertAdjacentElement('afterend',button);
  button.addEventListener('click',async()=>{button.disabled=true;try{await refill()}finally{button.disabled=false}});

  window.ProfitMenteGeneratorRefill={refill,summarize};
})();
