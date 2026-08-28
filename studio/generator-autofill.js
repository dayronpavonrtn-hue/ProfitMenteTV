class ProfitMenteGeneratorAutoFill {
  constructor(engine){this.engine=engine}
  missing(project){return (project?.clips||[]).filter(c=>c.track===0&&!c.asset).length}
  importedVisuals(importedAssets=[]){return (importedAssets||[]).filter(a=>a?.type==='video'||a?.type==='image')}
  shouldRun(project,importedAssets=[]){return project?.mode==='Automático'&&this.missing(project)>0&&this.importedVisuals(importedAssets).length>0}
  fill(project,allAssets=[],importedAssets=[]){
    const before=this.missing(project);
    if(!this.shouldRun(project,importedAssets))return {changed:false,before,after:before,primary:0,broll:0,skipped:before};
    const assigned=this.engine.assignAssets(project,allAssets)||{};
    const after=this.missing(project);
    return {changed:after<before||Number(assigned.broll||0)>0,before,after,primary:Number(assigned.primary||0),broll:Number(assigned.broll||0),skipped:Number(assigned.skipped||after)};
  }
}
if(typeof window!=='undefined')window.ProfitMenteGeneratorAutoFill=ProfitMenteGeneratorAutoFill;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteGeneratorAutoFill;

(function integrateGeneratorAutoFill(){
  if(typeof document==='undefined'||typeof project==='undefined'||typeof assets==='undefined'||typeof ProfitMenteGeneratorEngine==='undefined')return;
  const helper=new ProfitMenteGeneratorAutoFill(new ProfitMenteGeneratorEngine());
  document.addEventListener('profitmente:media-imported',e=>{
    const ids=new Set(e.detail?.assetIds||[]);
    if(!ids.size)return;
    const imported=assets.filter(a=>ids.has(a.id));
    const result=helper.fill(project,assets,imported);
    if(!result.changed)return;
    save?.();
    const remaining=result.after?` Quedan ${result.after} escena(s) sin visual.`:' Todas las escenas principales ya tienen visual.';
    setStatus?.(`Automatización: ${result.primary} escena(s) completada(s) con los medios recién importados y ${result.broll} B-roll añadido(s).${remaining}`);
  });
  window.ProfitMenteGeneratorAutoFillIntegration=helper;
})();
