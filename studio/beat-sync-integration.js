(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteBeatSyncEngine)return;
  const toolbar=document.querySelector('.markerToolbar');
  if(!toolbar||document.querySelector('#beatSyncBtn'))return;
  const btn=document.createElement('button');btn.id='beatSyncBtn';btn.title='Ajusta los cortes de escenas automáticas a los beats detectados sin modificar clips o pistas bloqueados';btn.textContent='⚡ Sync beats';toolbar.appendChild(btn);
  const engine=new ProfitMenteBeatSyncEngine();
  function run(){
    const scenes=engine.generatedScenes(project),beats=engine.beatTimes(project.markers,project.duration);
    if(scenes.length<2){setStatus?.('Genera primero un montaje automático con al menos 2 escenas');return {changed:0,boundaries:0,reason:'not-enough-scenes'}}
    if(!beats.length){setStatus?.('Detecta beats primero con ♫ Beats');return {changed:0,boundaries:0,reason:'no-beats'}}
    const result=engine.sync(project);
    if(result.reason==='locked-edit'){
      setStatus?.(`Sync beats protegido · ${result.locked||1} edición(es) manual(es) bloqueada(s) · desbloquea las escenas, captions o B-roll vinculados para ajustar el ritmo`);
      return result;
    }
    if(!result.boundaries){setStatus?.('Los cortes ya están cerca de los beats o no hay beats válidos dentro del margen');return result}
    persist?.();render?.();renderPreview?.();window.markerEngine?.render?.();
    setStatus?.(`Montaje sincronizado al ritmo · ${result.boundaries} corte(s) ajustados · ${result.sceneCount} escenas preservadas`);
    return result;
  }
  btn.onclick=run;
  window.ProfitMenteBeatSync={engine,run};
})();
