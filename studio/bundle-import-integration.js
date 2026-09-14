(function installSafeBundleImport(){
  if(typeof document==='undefined'||typeof ProfitMenteBundleEngine==='undefined'||typeof ProfitMenteBundleImportEngine==='undefined')return;
  const input=document.querySelector('#bundleInput'),button=document.querySelector('#importBundleBtn');if(!input||!button)return;
  const bundler=new ProfitMenteBundleEngine(),importer=new ProfitMenteBundleImportEngine();
  const status=t=>{if(typeof setStatus==='function')setStatus(t)};
  function ensureIdentityGuard(){
    if(window.ProfitMenteBundleImportIdentityGuard)return Promise.resolve(window.ProfitMenteBundleImportIdentityGuard);
    return new Promise((resolve,reject)=>{const existing=[...document.scripts].find(s=>s.src.endsWith('/bundle-import-identity-guard.js')||s.src.endsWith('bundle-import-identity-guard.js'));if(existing){existing.addEventListener('load',()=>resolve(window.ProfitMenteBundleImportIdentityGuard),{once:true});existing.addEventListener('error',()=>reject(new Error('No se pudo cargar la validación de identidad del paquete')),{once:true});return}const s=document.createElement('script');s.src='bundle-import-identity-guard.js';s.async=false;s.onload=()=>window.ProfitMenteBundleImportIdentityGuard?resolve(window.ProfitMenteBundleImportIdentityGuard):reject(new Error('La validación de identidad del paquete no se activó'));s.onerror=()=>reject(new Error('No se pudo cargar la validación de identidad del paquete'));document.body.appendChild(s)})
  }
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
  function persistActivatedProject(){
    if(typeof persist==='function')persist();
    else if(typeof originalPersist==='function')originalPersist();
    else throw new Error('No hay un mecanismo disponible para guardar el proyecto restaurado');
    const guard=window.ProfitMenteStartupProjectGuard;
    const serialized=guard?.serializeProject&&guard?.PRIMARY_KEY?{key:guard.PRIMARY_KEY,raw:guard.serializeProject(project).raw}:{key:'profitmente-project',raw:JSON.stringify(project)};
    let actual;
    try{
      const storage=globalThis.localStorage;
      if(!storage?.getItem)throw new Error('localStorage no disponible');
      actual=storage.getItem(serialized.key);
    }catch(err){throw new Error('No se pudo verificar el proyecto restaurado en el almacenamiento local',{cause:err})}
    if(actual!==serialized.raw)throw new Error('El proyecto restaurado no quedó confirmado en el almacenamiento persistente');
    return true;
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
  function mediaKey(value){
    if(typeof value==='number')return Number.isSafeInteger(value)&&value>=0?String(value):null;
    if(typeof value!=='string')return null;
    const text=value.trim();return text||null;
  }
  function identityText(value){return typeof value==='string'&&value.trim()?value.trim():null}
  function mediaIdentity(asset){
    if(!asset||typeof asset!=='object')return null;
    const contentHash=identityText(asset.sourceContentHash);if(contentHash)return `hash:${contentHash}`;
    const fingerprint=identityText(asset.sourceFingerprint);if(fingerprint)return `fingerprint:${fingerprint}`;
    const signature=identityText(asset.metadataBlobSignature);if(!signature)return null;
    const size=Number(asset.metadataBlobSize),safeSize=Number.isFinite(size)&&size>=0?size:'';
    const type=identityText(asset.metadataBlobType)||identityText(asset.blob?.type)||'';
    return `sample:${signature}|${safeSize}|${type}`;
  }
  async function verifyPersistedAssets(expected=[]){
    const list=Array.from(expected||[]);if(!list.length)return true;
    const expectedKeys=new Set(list.map(asset=>mediaKey(asset?.id)).filter(Boolean));
    if(expectedKeys.size!==list.length)throw new Error('No se pudo verificar un medio restaurado porque su id no es válido');
    let stored=null;
    try{
      if(typeof mediaStore!=='undefined'&&mediaStore){
        const flushed=typeof mediaStore.flush==='function'?await mediaStore.flush():mediaStore.storageAvailable!==false;
        if(flushed===false||mediaStore.storageAvailable===false)throw mediaStore.lastError||new Error('IndexedDB no confirmó el guardado de medios');
        if(mediaStore.backend?.loadAll)stored=await mediaStore.backend.loadAll();
      }
      if(stored===null&&typeof db==='function'&&typeof STORE!=='undefined'){
        const d=await db();stored=await new Promise((resolve,reject)=>{let req;try{req=d.transaction(STORE,'readonly').objectStore(STORE).getAll()}catch(error){d.close?.();reject(error);return}req.onsuccess=()=>{d.close?.();resolve(Array.isArray(req.result)?req.result:[])};req.onerror=()=>{d.close?.();reject(req.error||new Error('No se pudieron verificar los medios restaurados'))}});
      }
    }catch(err){throw new Error('Los medios del paquete no quedaron confirmados en el almacenamiento persistente',{cause:err})}
    if(!Array.isArray(stored))throw new Error('No hay un mecanismo disponible para verificar los medios restaurados');
    const storedByKey=new Map();for(const asset of stored){const key=mediaKey(asset?.id);if(key!==null&&!storedByKey.has(key))storedByKey.set(key,asset)}
    const missing=[...expectedKeys].filter(key=>!storedByKey.has(key));
    if(missing.length)throw new Error(`Los medios del paquete no quedaron confirmados en el almacenamiento persistente (${missing.length} faltante${missing.length===1?'':'s'})`);
    const mismatched=[];
    for(const asset of list){const key=mediaKey(asset?.id),expectedIdentity=mediaIdentity(asset);if(!expectedIdentity)continue;const actualIdentity=mediaIdentity(storedByKey.get(key));if(actualIdentity!==expectedIdentity)mismatched.push(key)}
    if(mismatched.length)throw new Error(`Los medios del paquete no coinciden con el contenido persistido (${mismatched.length} identidad${mismatched.length===1?'':'es'} incorrecta${mismatched.length===1?'':'s'})`);
    return true;
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
      if(importer.assertSafeTar)await importer.assertSafeTar(file);
      const identityGuard=await ensureIdentityGuard();
      const restored=identityGuard.validateRestoredBundle(await bundler.parse(file));
      const normalized=migrateRestoredProject(restored.project);
      const prepared=importer.prepare(normalized,restored.assets,Array.isArray(previousAssets)?previousAssets:[]);
      const storage=await assertImportStorageCapacity(prepared.assetsToPersist);
      if(storage?.checked&&storage.required)status(`Espacio local verificado · restaurando ${(storage.required/1048576).toFixed(1)} MB de medios…`);
      for(const asset of prepared.assetsToPersist){if(typeof putAsset!=='function')throw new Error('El almacén local de medios no está disponible');persistedIds.push(asset.id);await putAsset(asset)}
      await verifyPersistedAssets(prepared.assetsToPersist);
      const library=window.profitMenteProjectLibrary,nextProject=library?.save?library.save(prepared.project):prepared.project;
      createdLibraryId=nextProject?.libraryId||null;
      project=nextProject;assets=prepared.assets;activated=true;
      persistActivatedProject();
      document.querySelector('#libraryRefreshBtn')?.click();await syncStudio();resetHistory();
      window.dispatchEvent(new CustomEvent('profitmente:project-opened',{detail:{libraryId:project.libraryId||null,name:project.name||'Sin título',bundleImported:true}}));
      const q=typeof qa!=='undefined'&&qa?.inspect?qa.inspect(project,assets):null,s=prepared.stats;
      status(`Paquete restaurado como proyecto independiente · ${s.added} medios nuevos · ${s.reused} reutilizados${s.remapped?` · ${s.remapped} conflictos aislados`:''}${q?` · QA ${q.score}/100`:''}`);return true;
    }catch(err){
      console.error('ProfitMente safe bundle import failed',err);
      const library=window.profitMenteProjectLibrary;
      if(createdLibraryId&&library?.remove){try{library.remove(createdLibraryId)}catch(removeErr){console.error('ProfitMente bundle project rollback failed',removeErr)}}
      if(activated){if(previousProject)project=previousProject;if(previousAssets)assets=previousAssets;try{persistActivatedProject()}catch(restoreErr){console.error('ProfitMente bundle state rollback failed',restoreErr)}try{await syncStudio();resetHistory()}catch(syncErr){console.error('ProfitMente bundle UI rollback failed',syncErr)}}
      const rolledBack=await rollbackPersistedAssets(persistedIds);
      status('No se pudo abrir el paquete: '+(err?.message||'archivo inválido')+(rolledBack?` · ${rolledBack} medio(s) revertidos`:''));return false
    }
  }
  button.onclick=()=>input.click();input.onchange=e=>{const file=e.target.files?.[0];e.target.value='';void importBundleFile(file)};
  window.ProfitMenteBundleImport={importBundleFile,importer,rollbackPersistedAssets,assertImportStorageCapacity,persistActivatedProject,verifyPersistedAssets};
})();