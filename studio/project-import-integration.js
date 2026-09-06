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
  function installLibraryImportGuard(){
    const Library=window.ProfitMenteProjectLibrary,ImportEngine=window.ProfitMenteProjectImportEngine;
    if(!Library||!ImportEngine)return false;
    Library.normalizeImportedProject=function(value){
      const normalized=new ImportEngine(Library.blank()).normalize(value);
      delete normalized.libraryId;
      return normalized;
    };
    window.ProfitMenteProjectLibraryImportGuard={enabled:true};
    return true;
  }
  // project-library.js is loaded after this integration. Install the shared
  // validator once all parser scripts have finished so both Importar JSON and
  // Mis proyectos accept exactly the same canonical project model.
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',installLibraryImportGuard,{once:true});
  else installLibraryImportGuard();
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
      // Keep the primary Importar proyecto JSON action on the same guarded,
      // persistent path as Mis proyectos. ProjectTransfer flushes the current
      // edit, validates the JSON, saves the imported copy in the project
      // library, and dispatches project-opened. Its library importer is also
      // migration-wrapped once advanced features are ready.
      const transfer=window.ProfitMenteProjectTransfer;
      if(typeof transfer?.importProjectFile==='function'){
        await transfer.importProjectFile(f);
        return;
      }
      const parsed=JSON.parse(await f.text());
      // Fallback for partial/module-load failures: never replace the active
      // timeline until the current project has been flushed safely.
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