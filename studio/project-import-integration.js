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
  function canonicalMediaId(value){
    if(typeof value==='number')return Number.isFinite(value)?String(Object.is(value,-0)?0:value):'';
    if(typeof value==='string')return value.trim();
    return '';
  }
  function mediaLooksEquivalent(left,right){
    if(!left||!right)return false;
    const strong=['sourceContentHash','sourceFingerprint'];
    for(const key of strong){
      const a=left[key],b=right[key];
      if(a&&b)return String(a)===String(b);
    }
    const sizeA=Number(left.size??left.blob?.size),sizeB=Number(right.size??right.blob?.size);
    return String(left.name||'')===String(right.name||'')&&String(left.type||'')===String(right.type||'')&&String(left.mime||'')===String(right.mime||'')&&Number.isFinite(sizeA)&&Number.isFinite(sizeB)&&sizeA===sizeB;
  }
  let bundleMediaSequence=0;
  function freshBundleMediaId(taken){
    let id='';
    do{
      id=globalThis.crypto?.randomUUID?.()||`bundle-media-${Date.now()}-${++bundleMediaSequence}`;
    }while(taken.has(id));
    taken.add(id);return id;
  }
  function protectBundleMediaIdentity(restored,currentAssets=typeof assets!=='undefined'?assets:[]){
    const project=restored?.project;
    const incoming=Array.isArray(restored?.assets)?restored.assets:[];
    if(!project||!incoming.length)return restored;
    const existing=new Map();
    const taken=new Set();
    for(const asset of currentAssets||[]){
      const id=canonicalMediaId(asset?.id);if(!id)continue;
      if(!existing.has(id))existing.set(id,asset);taken.add(id);
    }
    for(const asset of incoming){const id=canonicalMediaId(asset?.id);if(id)taken.add(id)}
    const remap=new Map();
    for(const asset of incoming){
      const id=canonicalMediaId(asset?.id);if(!id)continue;
      const prior=existing.get(id);
      if(!prior||mediaLooksEquivalent(prior,asset))continue;
      const next=freshBundleMediaId(taken);remap.set(id,next);asset.id=next;
    }
    if(!remap.size)return restored;
    for(const meta of project.assets||[]){const id=canonicalMediaId(meta?.id);if(remap.has(id))meta.id=remap.get(id)}
    for(const clip of project.clips||[]){const id=canonicalMediaId(clip?.asset);if(remap.has(id))clip.asset=remap.get(id)}
    return restored;
  }
  function mergeRestoredAssets(currentAssets=[],restoredAssets=[]){
    const merged=[];const positions=new Map();
    for(const asset of currentAssets||[]){
      const id=canonicalMediaId(asset?.id);if(!id||positions.has(id))continue;
      positions.set(id,merged.length);merged.push(asset);
    }
    for(const asset of restoredAssets||[]){
      const id=canonicalMediaId(asset?.id);if(!id)continue;
      if(positions.has(id))merged[positions.get(id)]=asset;
      else{positions.set(id,merged.length);merged.push(asset)}
    }
    return merged;
  }
  async function rollbackBundleOpen(previousProject,previousAssets,writtenIds){
    const priorById=new Map();
    for(const asset of previousAssets||[]){const id=canonicalMediaId(asset?.id);if(id&&!priorById.has(id))priorById.set(id,asset)}
    for(const id of Array.from(writtenIds||[]).reverse()){
      try{
        const prior=priorById.get(id);
        if(prior)await putAsset(prior);
        else if(typeof mediaStore!=='undefined'&&mediaStore?.delete)await mediaStore.delete(id);
      }catch(cleanupError){console.error('ProfitMente bundle rollback media cleanup failed',cleanupError)}
    }
    project=previousProject;
    assets=previousAssets;
    try{
      if(typeof originalPersist==='function')originalPersist();
      else if(typeof persist==='function')persist();
    }catch(cleanupError){console.error('ProfitMente bundle rollback project persistence failed',cleanupError)}
    if(typeof drawLibrary==='function')drawLibrary();
    if(typeof drawTimeline==='function')drawTimeline();
    if(typeof syncForm==='function')syncForm();
    if(typeof historyEngine!=='undefined'&&historyEngine?.seed){historyEngine.seed(project);if(typeof updateHistoryButtons==='function')updateHistoryButtons()}
    try{if(typeof renderAt==='function')await renderAt(+document.querySelector('#playhead')?.value||0)}catch(cleanupError){console.error('ProfitMente bundle rollback preview restore failed',cleanupError)}
  }
  function validateRestoredBundle(restored){
    const project=restored?.project;
    if(!project||typeof project!=='object')throw new Error('El paquete no contiene un proyecto restaurable');
    const manifestAssets=Array.isArray(project.assets)?project.assets:[];
    const restoredAssets=Array.isArray(restored.assets)?restored.assets:[];
    const manifestIds=new Set(),restoredIds=new Set();
    for(const meta of manifestAssets){
      const id=canonicalMediaId(meta?.id);
      if(!id)throw new Error('Paquete con medio sin identificador válido');
      if(manifestIds.has(id))throw new Error(`Paquete con identificador de medio duplicado: ${id}`);
      meta.id=id;
      manifestIds.add(id);
    }
    for(const asset of restoredAssets){
      const id=canonicalMediaId(asset?.id);
      if(!id)throw new Error('Paquete con medio restaurado sin identificador válido');
      if(restoredIds.has(id))throw new Error(`Paquete con medio restaurado duplicado: ${id}`);
      if(!manifestIds.has(id))throw new Error(`Medio restaurado no declarado por el proyecto: ${id}`);
      if(!asset?.blob||typeof asset.blob.arrayBuffer!=='function')throw new Error(`Archivo de medio no disponible en paquete: ${id}`);
      asset.id=id;
      restoredIds.add(id);
    }
    for(const id of manifestIds){
      if(!restoredIds.has(id))throw new Error(`Medio declarado pero no restaurado por el paquete: ${id}`);
    }
    for(const clip of project.clips||[]){
      if(!clip||clip.asset===undefined||clip.asset===null)continue;
      const id=canonicalMediaId(clip.asset);
      if(!id)throw new Error(`Clip con identificador de medio inválido: ${clip.id||'sin id'}`);
      if(!manifestIds.has(id))throw new Error(`Clip referencia un medio no incluido en el paquete: ${id}`);
      clip.asset=id;
    }
    return restored;
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
      if(!flushCurrentProject())throw new Error('No se pudo guardar el proyecto actual; apertura del paquete cancelada');
      const restored=await baseParse.call(this,blob);
      if(!restored||!restored.project)throw new Error('El paquete no contiene un proyecto restaurable');
      const defaults=window.ProfitMenteProjectLibrary?.blank?.()||{};
      const normalized=new ImportEngine(defaults).normalize(restored.project);
      delete normalized.libraryId;
      restored.project=migrateImported(normalized);
      validateRestoredBundle(restored);
      protectBundleMediaIdentity(restored);
      return restored;
    };
    Bundle.__profitmenteProjectImportGuardInstalled=true;
    window.ProfitMenteBundleProjectImportGuard={enabled:true,normalized:true,migrated:true,preservesActiveProject:true,validatesMediaReferences:true,preservesMediaLibrary:true,rollsBackPartialMediaWrites:true,restoresPersistedProject:true};
    return true;
  }
  function installBundleOpenHandler(){
    const bundleInput=document.querySelector('#bundleInput');
    if(!bundleInput||bundleInput.dataset?.profitmenteSafeOpen==='1')return !!bundleInput;
    bundleInput.onchange=async e=>{
      const file=e.target.files?.[0];if(!file)return;
      const previousProject=project;
      const previousAssets=assets;
      const writtenIds=[];
      try{
        if(typeof setStatus==='function')setStatus('Abriendo paquete completo…');
        if(typeof bundler==='undefined'||typeof bundler?.parse!=='function')throw new Error('Motor de paquetes no disponible');
        const restored=await bundler.parse(file);
        for(const asset of restored.assets||[]){await putAsset(asset);const id=canonicalMediaId(asset?.id);if(id)writtenIds.push(id)}
        assets=mergeRestoredAssets(previousAssets,restored.assets||[]);
        project={...restored.project,clips:Array.isArray(restored.project.clips)?restored.project.clips:[]};
        if(typeof originalPersist==='function')originalPersist();else if(typeof persist==='function')persist();
        if(typeof drawLibrary==='function')drawLibrary();
        if(typeof drawTimeline==='function')drawTimeline();
        if(typeof syncForm==='function')syncForm();
        const playhead=document.querySelector('#playhead');if(playhead)playhead.value=0;
        if(typeof renderAt==='function')await renderAt(0);
        if(typeof historyEngine!=='undefined'&&historyEngine?.seed){historyEngine.seed(project);if(typeof updateHistoryButtons==='function')updateHistoryButtons()}
        const report=typeof qa!=='undefined'&&qa?.inspect?qa.inspect(project,assets):null;
        if(typeof setStatus==='function')setStatus(`Paquete restaurado · ${(restored.assets||[]).length} medios importados · ${assets.length} medios en biblioteca${report?` · QA ${report.score}/100`:''}`);
      }catch(err){
        console.error(err);
        if(writtenIds.length)await rollbackBundleOpen(previousProject,previousAssets,writtenIds);
        else{project=previousProject;assets=previousAssets}
        if(typeof setStatus==='function')setStatus('No se pudo abrir el paquete: '+(err?.message||err)+' · proyecto y biblioteca anteriores conservados');
      }
      finally{e.target.value=''}
    };
    if(bundleInput.dataset)bundleInput.dataset.profitmenteSafeOpen='1';
    return true;
  }
  function installImportGuards(){
    installLibraryImportGuard();
    installBundleImportGuard();
    installBundleOpenHandler();
  }
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',installImportGuards,{once:true});
  else installImportGuards();
  function flushCurrentProject(){
    const guarded=window.ProfitMenteNewProject?.flushCurrentProject;
    if(typeof guarded==='function')return guarded()!==false;
    try{
      const autosave=window.ProfitMenteProjectAutosave;
      const result=autosave?.flush?.('importación JSON/paquete');
      if(result===false&&autosave?.unsaved===true){
        if(typeof setStatus==='function')setStatus('No se pudo guardar el proyecto actual; importación cancelada');
        return false;
      }
      if(typeof persist==='function')persist();
      if(autosave?.unsaved===true){
        if(typeof setStatus==='function')setStatus('No se pudo guardar el proyecto actual; importación cancelada');
        return false;
      }
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
      const transfer=window.ProfitMenteProjectTransfer;
      if(typeof transfer?.importProjectFile==='function'){
        await transfer.importProjectFile(f);
        return;
      }
      const parsed=JSON.parse(await f.text());
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