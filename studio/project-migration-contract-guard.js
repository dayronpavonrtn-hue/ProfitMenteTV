(()=>{
  function validateProject(project){
    const ImportEngine=window.ProfitMenteProjectImportEngine;
    if(typeof ImportEngine!=='function')throw new Error('Motor de validación de proyectos no disponible');
    const defaults=window.ProfitMenteProjectLibrary?.blank?.()||{};
    const normalized=new ImportEngine(defaults).normalize(project);
    if(project&&Object.prototype.hasOwnProperty.call(project,'libraryId'))normalized.libraryId=project.libraryId;
    return normalized;
  }
  function wrapEngine(engine){
    if(!engine||typeof engine.migrate!=='function'||engine.__profitmenteContractGuard)return false;
    const base=engine.migrate;
    engine.migrate=function(...args){
      const result=base.apply(this,args);
      if(!result||typeof result!=='object'||!result.project)throw new Error('La migración no produjo un proyecto válido');
      return {...result,project:validateProject(result.project)};
    };
    engine.__profitmenteContractGuard=true;
    return true;
  }
  function install(){
    let installed=false;
    installed=wrapEngine(window.ProfitMenteProjectMigration?.engine)||installed;
    const MigrationEngine=window.ProfitMenteProjectMigrationEngine;
    if(typeof MigrationEngine==='function'&&MigrationEngine.prototype&&!MigrationEngine.prototype.__profitmenteContractGuard){
      const base=MigrationEngine.prototype.migrate;
      if(typeof base==='function'){
        MigrationEngine.prototype.migrate=function(...args){
          const result=base.apply(this,args);
          if(!result||typeof result!=='object'||!result.project)throw new Error('La migración no produjo un proyecto válido');
          return {...result,project:validateProject(result.project)};
        };
        MigrationEngine.prototype.__profitmenteContractGuard=true;
        installed=true;
      }
    }
    window.ProfitMenteProjectMigrationContractGuard={enabled:installed,validateProject};
    return installed;
  }
  install();
})();