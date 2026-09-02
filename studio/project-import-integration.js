(()=>{
  const input=document.querySelector('#projectInput');
  if(!input||!window.ProfitMenteProjectImportEngine)return;
  const engine=new ProfitMenteProjectImportEngine();
  input.accept='application/json,.json';
  function migrateImported(next){
    const migration=window.ProfitMenteProjectMigration?.engine;
    if(migration?.migrate)return migration.migrate(next).project;
    const MigrationEngine=window.ProfitMenteProjectMigrationEngine;
    if(typeof MigrationEngine==='function')return new MigrationEngine().migrate(next).project;
    return next;
  }
  function flushCurrentProject(){
    const guarded=window.ProfitMenteNewProject?.flushCurrentProject;
    if(typeof guarded==='function')return guarded()!==false;
    try{
      window.ProfitMenteProjectAutosave?.flush?.('importación JSON');
      if(typeof persist==='function')persist();
      return true;
    }catch(err){
      console.error('ProfitMente project import pre-save failed',err);
      if(typeof setStatus==='function')setStatus('No se pudo guardar el proyecto actual; importación cancelada');
      return false;
    }
  }
  input.onchange=async e=>{
    const f=e.target.files?.[0];if(!f)return;
    try{
      if(f.size>10*1024*1024)throw new Error('Archivo de proyecto demasiado grande (máximo 10 MB)');
      const parsed=JSON.parse(await f.text());
      // Never replace the active timeline until the current project has been
      // flushed to its draft/library entry. This matches bundle import and
      // project switching, preventing silent loss of unsaved local edits.
      if(!flushCurrentProject())return;
      project=migrateImported(engine.normalize(parsed));
      if(typeof originalPersist==='function')originalPersist();else if(typeof persist==='function')persist();
      if(typeof drawTimeline==='function')drawTimeline();
      if(typeof drawLibrary==='function')drawLibrary();
      if(typeof syncForm==='function')syncForm();
      const playhead=document.querySelector('#playhead');if(playhead)playhead.value=0;
      if(typeof renderAt==='function')await renderAt(0);
      if(typeof historyEngine!=='undefined'&&historyEngine?.seed){historyEngine.seed(project);if(typeof updateHistoryButtons==='function')updateHistoryButtons()}
      window.ProfitMenteProjectHistory?.reset?.();
      window.dispatchEvent(new CustomEvent('profitmente:project-opened',{detail:{libraryId:project.libraryId||null,name:project.name||'Sin título',imported:true}}));
      if(typeof setStatus==='function')setStatus('Proyecto JSON importado como copia nueva · proyecto anterior guardado · migrado y autoguardado seguro');
    }catch(err){console.error(err);if(typeof setStatus==='function')setStatus('No se pudo importar el proyecto: '+(err?.message||'JSON inválido'))}
    finally{e.target.value=''}
  };
})();