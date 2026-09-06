(function(g){
  const Library=g.ProfitMenteProjectLibrary;
  const ImportEngine=g.ProfitMenteProjectImportEngine;
  if(!Library||!ImportEngine)return;

  Library.normalizeImportedProject=function(value){
    const engine=new ImportEngine(Library.blank());
    const normalized=engine.normalize(value);
    delete normalized.libraryId;
    return normalized;
  };

  g.ProfitMenteProjectLibraryImportGuard={enabled:true};
})(globalThis);
