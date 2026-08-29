(()=>{
  const input=document.querySelector('#projectInput');
  if(!input||!window.ProfitMenteProjectImportEngine)return;
  const engine=new ProfitMenteProjectImportEngine();
  input.onchange=async e=>{
    const f=e.target.files?.[0];if(!f)return;
    try{
      const parsed=JSON.parse(await f.text());
      project=engine.normalize(parsed);
      if(typeof originalPersist==='function')originalPersist();else if(typeof persist==='function')persist();
      if(typeof drawTimeline==='function')drawTimeline();
      if(typeof drawLibrary==='function')drawLibrary();
      if(typeof syncForm==='function')syncForm();
      const playhead=document.querySelector('#playhead');if(playhead)playhead.value=0;
      if(typeof renderAt==='function')await renderAt(0);
      if(typeof historyEngine!=='undefined'&&historyEngine?.seed){historyEngine.seed(project);if(typeof updateHistoryButtons==='function')updateHistoryButtons()}
      if(typeof setStatus==='function')setStatus('Proyecto JSON importado como copia nueva · autoguardado seguro');
    }catch(err){console.error(err);if(typeof setStatus==='function')setStatus('No se pudo importar el proyecto: '+(err?.message||'JSON inválido'))}
    finally{e.target.value=''}
  };
})();
