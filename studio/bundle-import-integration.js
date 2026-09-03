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
  async function importBundleFile(file){
    if(!file)return false;
    if(file.size>2*1024*1024*1024){status('Paquete demasiado grande para abrirlo de forma segura en el navegador (máximo 2 GB)');return false}
    try{
      if(window.ProfitMenteNewProject?.flushCurrentProject&&!window.ProfitMenteNewProject.flushCurrentProject())return false;
      stopPlayback();status('Verificando y restaurando paquete completo…');
      const restored=await bundler.parse(file);
      const normalized=migrateRestoredProject(restored.project);
      const prepared=importer.prepare(normalized,restored.assets,typeof assets!=='undefined'?assets:[]);
      for(const asset of prepared.assetsToPersist){if(typeof putAsset!=='function')throw new Error('El almacén local de medios no está disponible');await putAsset(asset)}
      assets=prepared.assets;
      project=window.profitMenteProjectLibrary?.save?window.profitMenteProjectLibrary.save(prepared.project):prepared.project;
      if(typeof originalPersist==='function')originalPersist();else if(typeof persist==='function')persist();
      document.querySelector('#libraryRefreshBtn')?.click();await syncStudio();resetHistory();
      window.dispatchEvent(new CustomEvent('profitmente:project-opened',{detail:{libraryId:project.libraryId||null,name:project.name||'Sin título',bundleImported:true}}));
      const q=typeof qa!=='undefined'&&qa?.inspect?qa.inspect(project,assets):null,s=prepared.stats;
      status(`Paquete restaurado como proyecto independiente · ${s.added} medios nuevos · ${s.reused} reutilizados${s.remapped?` · ${s.remapped} conflictos aislados`:''}${q?` · QA ${q.score}/100`:''}`);return true;
    }catch(err){console.error('ProfitMente safe bundle import failed',err);status('No se pudo abrir el paquete: '+(err?.message||'archivo inválido'));return false}
  }
  button.onclick=()=>input.click();input.onchange=e=>{const file=e.target.files?.[0];e.target.value='';void importBundleFile(file)};
  window.ProfitMenteBundleImport={importBundleFile,importer};
})();
