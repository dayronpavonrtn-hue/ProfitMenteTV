(()=>{
  if(typeof document==='undefined'||typeof ProfitMenteProjectResetEngine==='undefined')return;
  const btn=document.querySelector('#clearBtn');if(!btn)return;
  const engine=new ProfitMenteProjectResetEngine();
  btn.onclick=async()=>{
    if(!confirm('¿Crear proyecto nuevo? Se guardará el proyecto actual y un punto de recuperación.'))return;

    // project-library.js owns the canonical safe project transition. Its controller
    // flushes pending form/autosave state, promotes unsaved drafts into "Mis proyectos",
    // resets history/UI and emits the project-opened event used by integrations.
    // This advanced reset module loads later and must not bypass that persistence path.
    if(window.ProfitMenteNewProject?.create&&window.ProfitMenteNewProject?.flushCurrentProject){
      const flushed=window.ProfitMenteNewProject.flushCurrentProject();
      if(!flushed)return;
      const snapshot=engine.snapshot(window.profitMenteRecovery,project);
      const created=await window.ProfitMenteNewProject.create();
      if(!created)return;
      if(typeof setStatus==='function')setStatus(snapshot?'Proyecto nuevo creado · anterior guardado en Mis proyectos y Recuperación':'Proyecto nuevo creado · anterior guardado en Mis proyectos');
      return;
    }

    // Compatibility fallback for installations where project-library.js is unavailable.
    const result=engine.reset(window.profitMenteRecovery,project);
    try{
      if(typeof playing!=='undefined'&&playing){playing=false}
      if(typeof audio!=='undefined'&&audio?.stop)audio.stop();
      if(typeof playTimer!=='undefined'&&playTimer)cancelAnimationFrame(playTimer);
      const playBtn=document.querySelector('#playBtn');if(playBtn)playBtn.textContent='▶ Preview';
    }catch{}
    project=result.project;
    const ph=document.querySelector('#playhead');if(ph)ph.value=0;
    if(typeof originalPersist==='function')originalPersist();else if(typeof persist==='function')persist();
    if(typeof drawTimeline==='function')drawTimeline();
    if(typeof drawLibrary==='function')drawLibrary();
    if(typeof syncForm==='function')syncForm();
    if(typeof historyEngine!=='undefined'&&historyEngine?.seed)historyEngine.seed(project);
    if(typeof updateHistoryButtons==='function')updateHistoryButtons();
    if(typeof renderAt==='function')await renderAt(0);
    if(typeof setStatus==='function')setStatus(result.snapshot?'Proyecto nuevo creado · versión anterior guardada en Recuperación':'Proyecto nuevo creado');
  };
  window.profitMenteProjectReset=engine;
})();
