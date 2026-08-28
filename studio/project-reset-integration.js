(()=>{
  if(typeof document==='undefined'||typeof ProfitMenteProjectResetEngine==='undefined')return;
  const btn=document.querySelector('#clearBtn');if(!btn)return;
  const engine=new ProfitMenteProjectResetEngine();
  btn.onclick=async()=>{
    if(!confirm('¿Crear proyecto nuevo? Se guardará un punto de recuperación del proyecto actual.'))return;
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
