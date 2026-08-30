(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteBeatSyncEngine)return;
  const toolbar=document.querySelector('.markerToolbar');
  if(!toolbar||document.querySelector('#beatSyncBtn'))return;
  const btn=document.createElement('button');btn.id='beatSyncBtn';btn.title='Ajusta los cortes de escenas automáticas a los beats detectados';btn.textContent='⚡ Sync beats';toolbar.appendChild(btn);
  const engine=new ProfitMenteBeatSyncEngine();
  function run(){
    const scenes=engine.generatedScenes(project),beats=engine.beatTimes(project.markers,project.duration);
    if(scenes.length<2){setStatus?.('Genera primero un montaje automático con al menos 2 escenas');return}
    if(!beats.length){setStatus?.('Detecta beats primero con ♫ Beats');return}
    if(project.trackState?.[0]?.locked||project.trackState?.[3]?.locked){setStatus?.('Desbloquea las pistas visual o de captions para sincronizar escenas');return}
    const result=engine.sync(project);
    if(!result.boundaries){setStatus?.('Los cortes ya están cerca de los beats o no hay beats válidos dentro del margen');return}
    persist?.();render?.();renderPreview?.();window.markerEngine?.render?.();
    setStatus?.(`Montaje sincronizado al ritmo · ${result.boundaries} corte(s) ajustados · ${result.sceneCount} escenas preservadas`);
  }
  btn.onclick=run;
  window.ProfitMenteBeatSync={engine,run};
})();
