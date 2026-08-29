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
  migrateCurrent();
  if(typeof persist==='function'&&!persist.__profitmenteMigrationWrapped){
    const oldPersist=persist;
    const wrapped=function(){oldPersist();try{normalizeAndStore()}catch(err){console.error('ProfitMente persist migration failed',err)}};
    wrapped.__profitmenteMigrationWrapped=true;
    persist=wrapped;
  }
  window.ProfitMenteProjectMigration={engine,migrateCurrent,normalizeAndStore};
})();
