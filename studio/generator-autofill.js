class ProfitMenteGeneratorAutoFill {
  constructor(engine){this.engine=engine}
  missing(project){return (project?.clips||[]).filter(c=>c.track===0&&!c.asset).length}
  importedVisuals(importedAssets=[]){return (importedAssets||[]).filter(a=>a?.type==='video'||a?.type==='image')}
  importedAudio(importedAssets=[]){return (importedAssets||[]).filter(a=>a?.type==='audio')}
  needsAudio(project){
    const clips=project?.clips||[];
    const narration=clips.some(c=>Number(c.track)===6&&!c.asset);
    const music=!clips.some(c=>Number(c.track)===5&&c.asset);
    const scenes=clips.filter(c=>Number(c.track)===0).length;
    const sfx=scenes>1&&!clips.some(c=>Number(c.track)===4&&c.asset);
    return narration||music||sfx;
  }
  shouldRun(project,importedAssets=[]){
    if(project?.mode!=='Automático')return false;
    const visualReady=this.missing(project)>0&&this.importedVisuals(importedAssets).length>0;
    const audioReady=this.importedAudio(importedAssets).length>0&&this.needsAudio(project);
    return visualReady||audioReady;
  }
  fill(project,allAssets=[],importedAssets=[]){
    const before=this.missing(project);
    if(!this.shouldRun(project,importedAssets))return {changed:false,before,after:before,primary:0,broll:0,skipped:before,narration:0,music:0,sfx:0};
    const hasNewVisual=this.importedVisuals(importedAssets).length>0;
    let assigned={};
    if(hasNewVisual&&before>0){
      assigned=this.engine.assignAssets(project,allAssets)||{};
    }else{
      assigned={
        primary:0,broll:0,skipped:before,
        narration:Number(this.engine.assignNarration?.(project,allAssets)||0),
        music:Number(this.engine.assignSoundtrack?.(project,allAssets)||0),
        sfx:Number(this.engine.assignTransitionSfx?.(project,allAssets)||0)
      };
    }
    const after=this.missing(project),narration=Number(assigned.narration||0),music=Number(assigned.music||0),sfx=Number(assigned.sfx||0);
    return {changed:after<before||Number(assigned.broll||0)>0||narration>0||music>0||sfx>0,before,after,primary:Number(assigned.primary||0),broll:Number(assigned.broll||0),skipped:Number(assigned.skipped||after),narration,music,sfx};
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
    const parts=[];
    if(result.primary||result.broll)parts.push(`${result.primary} escena(s) completada(s) y ${result.broll} B-roll añadido(s).`);
    if(result.narration)parts.push('Narración local conectada automáticamente.');
    if(result.music)parts.push('Música local añadida con ducking para voz.');
    if(result.sfx)parts.push(`${result.sfx} SFX local(es) colocado(s) en transiciones.`);
    if(result.after)parts.push(`Quedan ${result.after} escena(s) sin visual.`);else if(result.before>0)parts.push('Todas las escenas principales ya tienen visual.');
    setStatus?.(`Automatización: ${parts.join(' ')}`);
  });
  window.ProfitMenteGeneratorAutoFillIntegration=helper;
})();
