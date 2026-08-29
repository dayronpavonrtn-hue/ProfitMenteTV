(()=>{
  if(typeof window==='undefined'||!window.ProfitMenteProjectMigrationEngine)return;
  const engine=new window.ProfitMenteProjectMigrationEngine();
  function migrateCurrent(label='Proyecto actualizado al formato actual'){
    try{
      if(typeof project==='undefined'||!project)return false;
      const result=engine.migrate(project);
      if(!result.changed)return false;
      project=result.project;
      localStorage.setItem('profitmente-project',JSON.stringify(project));
      syncForm?.();drawTimeline?.();renderAt?.(+document.querySelector('#playhead')?.value||0);
      setStatus?.(`${label} · v${result.toVersion}`);
      window.dispatchEvent(new CustomEvent('profitmente:project-migrated',{detail:{fromVersion:result.fromVersion,toVersion:result.toVersion}}));
      return true;
    }catch(err){console.error('ProfitMente project migration failed',err);setStatus?.('No se pudo migrar el proyecto guardado');return false}
  }
  migrateCurrent();
  window.ProfitMenteProjectMigration={engine,migrateCurrent};
})();
