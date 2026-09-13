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
    if(!Library.__profitmenteStoredProjectGuardInstalled){
      const baseLoad=Library.prototype.load;
      Library.prototype.load=function(id){
        const stored=baseLoad.call(this,id);
        if(!stored)return null;
        const libraryId=stored.libraryId;
        try{
          const normalized=new ImportEngine(Library.blank()).normalize(stored);
          if(libraryId!==undefined&&libraryId!==null)normalized.libraryId=libraryId;
          return normalized;
        }catch(err){
          console.error('ProfitMente saved project validation failed',err);
          return null;
        }
      };
      Library.prototype.duplicate=function(id){
        const source=this.load(id);
        if(!source)return null;
        const copy=structuredClone(source);
        delete copy.libraryId;
        copy.name=`${copy.name||'Sin título'} · copia`;
        return this.save(copy);
      };
      Library.__profitmenteStoredProjectGuardInstalled=true;
    }
    window.ProfitMenteProjectLibraryImportGuard={enabled:true,storedProjectGuard:true};
    return true;
  }
  function installBundleImportGuard(){
    const Bundle=window.ProfitMenteBundleEngine,ImportEngine=window.ProfitMenteProjectImportEngine;
    if(!Bundle||!ImportEngine||Bundle.__profitmenteProjectImportGuardInstalled)return !!Bundle?.__profitmenteProjectImportGuardInstalled;
    const baseParse=Bundle.prototype.parse;
    if(typeof baseParse!=='function')return false;
    Bundle.prototype.parse=async function(blob){
      const restored=await baseParse.call(this,blob);
      if(!restored||!restored.project)throw new Error('El paquete no contiene un proyecto restaurable');
      const defaults=window.ProfitMenteProjectLibrary?.blank?.()||{};
      const normalized=new ImportEngine(defaults).normalize(restored.project);
      delete normalized.libraryId;
      restored.project=migrateImported(normalized);
      return restored;
    };
    Bundle.__profitmenteProjectImportGuardInstalled=true;
    window.ProfitMenteBundleProjectImportGuard={enabled:true,normalized:true,migrated:true};
    return true;
  }
  function installImportGuards(){
    installLibraryImportGuard();
    installBundleImportGuard();
  }
  // project-library.js and bundle-engine.js are loaded independently from this
  // integration. Install the shared validator once all parser scripts have
  // finished so JSON imports, saved projects and full packages converge on the
  // same canonical project model before they touch timeline/preview/render.
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',installImportGuards,{once:true});
  else installImportGuards();
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