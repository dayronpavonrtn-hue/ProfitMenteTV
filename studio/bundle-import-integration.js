(function installSafeBundleImport(){
  if(typeof document==='undefined'||typeof ProfitMenteBundleEngine==='undefined'||typeof ProfitMenteBundleImportEngine==='undefined')return;
  const input=document.querySelector('#bundleInput'),button=document.querySelector('#importBundleBtn');if(!input||!button)return;
  const bundler=new ProfitMenteBundleEngine(),importer=new ProfitMenteBundleImportEngine();
  const status=t=>{if(typeof setStatus==='function')setStatus(t)};
  function normalizeRestoredProject(value){
    const ImportEngine=window.ProfitMenteProjectImportEngine;
    if(typeof ImportEngine==='function')return new ImportEngine().normalize(value);
    const Library=window.ProfitMenteProjectLibrary;
    if(Library?.normalizeImportedProject)return Library.normalizeImportedProject(value);
    return value;
  }
  function migrateRestoredProject(value){
    const normalized=normalizeRestoredProject(value);
    const migration=window.ProfitMenteProjectMigration?.engine;
    if(migration?.migrate)return migration.migrate(normalized).project;
    const MigrationEngine=window.ProfitMenteProjectMigrationEngine;
    if(typeof MigrationEngine==='function')return new MigrationEngine().migrate(normalized).project;
    return normalized;
  }
  function stopPlayback(){
    try{if(typeof playing!=='undefined')playing=false}catch{}
    try{if(typeof audio!=='undefined'&&audio?.stop)audio.stop()}catch{}
    try{if(typeof playTimer!=='undefined'&&playTimer)cancelAnimationFrame(playTimer)}catch{}
    const play=document.querySelector('#playBtn');if(play)play.textContent='▶ Preview';
  }
  function resetHistory(){
    try{if(window.ProfitMenteProjectHistory?.reset)window.ProfitMenteProjectHistory.reset();else if(typeof historyEngine!=='undefined'&&historyEngine?.seed)historyEngine.seed(project)}catch{}
    try{if(typeof updateHistoryButtons==='function')updateHistoryButtons()}catch{}
  }
  async function syncStudio(){
    if(typeof drawLibrary==='function')drawLibrary();if(typeof drawTimeline==='function')drawTimeline();if(typeof syncForm==='function')syncForm();
    const ph=document.querySelector('#playhead');if(ph)ph.value=0;
    if(typeof renderAt==='function')await renderAt(0);
  }
  async function storageEstimate(){
    try{if(typeof navigator!=='undefined'&&navigator.storage?.estimate)return await navigator.storage.estimate()}catch(err){console.warn('ProfitMente storage estimate unavailable',err)}
    return null;
  }
  async function assertImportStorageCapacity(persistAssets=[]){
    if(!persistAssets.length)return {ok:true,checked:false,required:0};
    const estimate=await storageEstimate();if(!estimate)return {ok:true,checked:false,required:importer.requiredPersistBytes?.(persistAssets)||0};
    return importer.assertStorageCapacity?importer.assertStorageCapacity(persistAssets,estimate):{ok:true,checked:false};
  }
  async function removePersistedAsset(id){
    const resilient=window.ProfitMenteMediaStorageResilience;
    if(resilient?.resilientDelete)return resilient.resilientDelete(id);
    if(typeof db!=='function'||typeof STORE==='undefined')return false;
    const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error)});
  }
  async function rollbackPersistedAssets(ids=[]){
    let removed=0;for(const id of [...ids].reverse()){try{if(await removePersistedAsset(id))removed++}catch(err){console.error('ProfitMente bundle asset rollback failed',id,err)}}return removed;
  }
  async function importBundleFile(file){
    if(!file)return false;
    if(file.size>2*1024*1024*1024){status('Paquete demasiado grande para abrirlo de forma segura en el navegador (máximo 2 GB)');return false}
    const previousAssets=typeof assets!=='undefined'?assets:null,previousProject=typeof project!=='undefined'?project:null,persistedIds=[];
    let createdLibraryId=null,activated=false;
    try{
      if(window.ProfitMenteNewProject?.flushCurrentProject&&!window.ProfitMenteNewProject.flushCurrentProject())return false;
      stopPlayback();status('Verificando y restaurando paquete completo…');
      const restored=await bundler.parse(file);
      const normalized=migrateRestoredProject(restored.project);
      const prepared=importer.prepare(normalized,restored.assets,Array.isArray(previousAssets)?previousAssets:[]);
      const storage=await assertImportStorageCapacity(prepared.assetsToPersist);
      if(storage?.checked&&storage.required)status(`Espacio local verificado · restaurando ${(storage.required/1048576).toFixed(1)} MB de medios…`);
      for(const asset of prepared.assetsToPersist){if(typeof putAsset!=='function')throw new Error('El almacén local de medios no está disponible');await putAsset(asset);persistedIds.push(asset.id)}
      const library=window.profitMenteProjectLibrary,nextProject=library?.save?library.save(prepared.project):prepared.project;
      createdLibraryId=nextProject?.libraryId||null;
      project=nextProject;assets=prepared.assets;activated=true;
      if(typeof originalPersist==='function')originalPersist();else if(typeof persist==='function')persist();
      document.querySelector('#libraryRefreshBtn')?.click();await syncStudio();resetHistory();
      window.dispatchEvent(new CustomEvent('profitmente:project-opened',{detail:{libraryId:project.libraryId||null,name:project.name||'Sin título',bundleImported:true}}));
      const q=typeof qa!=='undefined'&&qa?.inspect?qa.inspect(project,assets):null,s=prepared.stats;
      status(`Paquete restaurado como proyecto independiente · ${s.added} medios nuevos · ${s.reused} reutilizados${s.remapped?` · ${s.remapped} conflictos aislados`:''}${q?` · QA ${q.score}/100`:''}`);return true;
    }catch(err){
      console.error('ProfitMente safe bundle import failed',err);
      const library=window.profitMenteProjectLibrary;
      if(createdLibraryId&&library?.remove){try{library.remove(createdLibraryId)}catch(removeErr){console.error('ProfitMente bundle project rollback failed',removeErr)}}
      if(activated){if(previousProject)project=previousProject;if(previousAssets)assets=previousAssets;try{if(typeof originalPersist==='function')originalPersist();else if(typeof persist==='function')persist()}catch(restoreErr){console.error('ProfitMente bundle state rollback failed',restoreErr)}try{await syncStudio();resetHistory()}catch(syncErr){console.error('ProfitMente bundle UI rollback failed',syncErr)}}
      const rolledBack=await rollbackPersistedAssets(persistedIds);
      status('No se pudo abrir el paquete: '+(err?.message||'archivo inválido')+(rolledBack?` · ${rolledBack} medio(s) revertidos`:''));return false
    }
  }
  button.onclick=()=>input.click();input.onchange=e=>{const file=e.target.files?.[0];e.target.value='';void importBundleFile(file)};
  window.ProfitMenteBundleImport={importBundleFile,importer,rollbackPersistedAssets,assertImportStorageCapacity};
})();
