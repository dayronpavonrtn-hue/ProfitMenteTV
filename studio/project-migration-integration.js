(()=>{
  if(typeof window==='undefined'||!window.ProfitMenteProjectMigrationEngine)return;
  const engine=new window.ProfitMenteProjectMigrationEngine();
  function normalizeAndStore(label='',announce=false){
    if(typeof project==='undefined'||!project)return {changed:false};
    const result=engine.migrate(project);
    project=result.project;
    localStorage.setItem('profitmente-project',JSON.stringify(project));
    if(announce&&result.changed)setStatus?.(`${label||'Proyecto actualizado al formato actual'} · v${result.toVersion}`);
    return result;
  }
  function migrateCurrent(label='Proyecto actualizado al formato actual'){
    try{
      const result=normalizeAndStore(label,true);
      if(!result.changed)return false;
      syncForm?.();drawTimeline?.();renderAt?.(+document.querySelector('#playhead')?.value||0);
      window.dispatchEvent(new CustomEvent('profitmente:project-migrated',{detail:{fromVersion:result.fromVersion,toVersion:result.toVersion}}));
      return true;
    }catch(err){console.error('ProfitMente project migration failed',err);setStatus?.('No se pudo migrar el proyecto guardado');return false}
  }
  function migrateImportedProject(value){
    return engine.migrate(value).project;
  }
  function primitiveFinite(value){
    if(typeof value!=='number'&&typeof value!=='string')return null;
    if(typeof value==='string'&&!value.trim())return null;
    const number=Number(value);
    return Number.isFinite(number)?number:null;
  }
  function extendStaleImportedDuration(source){
    if(!source||typeof source!=='object'||Array.isArray(source)||!Array.isArray(source.clips))return source;
    const declared=primitiveFinite(source.duration);
    if(declared===null||declared<=0||declared>86400)return source;
    let required=declared;
    for(const clip of source.clips){
      if(!clip||typeof clip!=='object'||Array.isArray(clip))continue;
      const start=primitiveFinite(clip.start??0),duration=primitiveFinite(clip.duration??0);
      if(start===null||duration===null||start<0||duration<=0)continue;
      const end=start+duration;
      if(Number.isFinite(end)&&end<=86400)required=Math.max(required,end);
    }
    return required>declared+1e-9?{...source,duration:required}:source;
  }
  function normalizeImportedProject(Library,value){
    const ImportEngine=window.ProfitMenteProjectImportEngine;
    if(typeof ImportEngine==='function'){
      const importer=new ImportEngine();
      const source=typeof importer.unwrap==='function'?importer.unwrap(value):value;
      return importer.normalize(extendStaleImportedDuration(source));
    }
    return Library.normalizeImportedProject(value);
  }
  function installProjectLibraryImportMigration(){
    const Library=window.ProfitMenteProjectLibrary,proto=Library?.prototype;
    if(!proto||typeof proto.importSerialized!=='function'||proto.importSerialized.__profitmenteMigrationWrapped)return false;
    const wrapped=function(text){
      let parsed;
      try{parsed=JSON.parse(text)}catch{throw new Error('El archivo no contiene JSON válido')}
      const normalized=normalizeImportedProject(Library,parsed);
      return this.save(migrateImportedProject(normalized));
    };
    wrapped.__profitmenteMigrationWrapped=true;
    proto.importSerialized=wrapped;
    return true;
  }
  migrateCurrent();
  installProjectLibraryImportMigration();
  if(typeof persist==='function'&&!persist.__profitmenteMigrationWrapped){
    const oldPersist=persist;
    const wrapped=function(){oldPersist();try{normalizeAndStore()}catch(err){console.error('ProfitMente persist migration failed',err)}};
    wrapped.__profitmenteMigrationWrapped=true;
    persist=wrapped;
  }
  window.ProfitMenteProjectMigration={engine,migrateCurrent,normalizeAndStore,migrateImportedProject,installProjectLibraryImportMigration};
})();
