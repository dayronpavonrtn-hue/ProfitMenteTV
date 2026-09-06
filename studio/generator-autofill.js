(function installNarrationCoverageGuard(){
  const Engine=typeof globalThis!=='undefined'?globalThis.ProfitMenteGeneratorEngine:null;
  if(!Engine?.prototype||Engine.prototype.__profitmenteNarrationCoverageGuard)return;
  const original=Engine.prototype.narrationScore;
  if(typeof original!=='function')return;
  Engine.prototype.narrationScore=function(asset,projectDuration=45){
    const score=original.call(this,asset,projectDuration);
    if(!Number.isFinite(score))return score;
    const duration=Number(asset?.duration)||0,target=Math.max(.25,Number(projectDuration)||45);
    // Automatic narration must cover most of the project. Previously a clearly
    // named but very short voice clip could win scoring and leave a long silent
    // tail. Unknown-duration assets remain eligible because Studio cannot prove
    // they are too short until media metadata is available.
    if(duration>0&&duration+.25<target*.72)return -Infinity;
    return score;
  };
  try{Object.defineProperty(Engine.prototype,'__profitmenteNarrationCoverageGuard',{value:true,configurable:true})}catch{Engine.prototype.__profitmenteNarrationCoverageGuard=true}
})();

class ProfitMenteGeneratorAutoFill {
  constructor(engine){this.engine=engine}
  canonicalTrack(value){
    if(value==null||typeof value==='boolean'||(typeof value==='string'&&!value.trim()))return null;
    const number=Number(value);
    if(!Number.isFinite(number)||!Number.isInteger(number)||number<0||number>6)return null;
    return String(Object.is(number,-0)?0:number);
  }
  trackLocked(project,track){
    const target=this.canonicalTrack(track);
    if(target==null)return false;
    const maps=[project?.trackState,project?.trackStates];
    return maps.some(map=>Object.entries(map||{}).some(([key,state])=>{
      if(!state||typeof state!=='object'||!state.locked)return false;
      return this.canonicalTrack(key)===target;
    }));
  }
  locked(project,clip){
    const guard=typeof globalThis!=='undefined'?globalThis.ProfitMenteEditLockGuard:null;
    if(guard?.isLocked)return guard.isLocked(project,clip);
    return !!clip?.locked||this.trackLocked(project,clip?.track);
  }
  mediaKey(value){
    if(value==null||typeof value==='boolean'||(typeof value!=='string'&&typeof value!=='number'))return null;
    if(typeof value==='number'){
      if(!Number.isFinite(value))return null;
      return `n:${Object.is(value,-0)?0:value}`;
    }
    const text=value.trim();
    if(!text)return null;
    if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(text)){
      const number=Number(text);
      if(Number.isFinite(number))return `n:${Object.is(number,-0)?0:number}`;
    }
    return `s:${text}`;
  }
  hasAsset(clip){return this.mediaKey(clip?.asset)!=null}
  assetsFromIds(allAssets=[],ids=[]){
    const wanted=new Set((Array.isArray(ids)?ids:[]).map(id=>this.mediaKey(id)).filter(id=>id!=null));
    return (Array.isArray(allAssets)?allAssets:[]).filter(asset=>wanted.has(this.mediaKey(asset?.id)));
  }
  assetUsable(asset){
    if(!asset||asset.mediaReadable===false)return false;
    const offline=typeof globalThis!=='undefined'?globalThis.ProfitMenteOfflineMediaEngine:null;
    if(offline?.assetUsable)return offline.assetUsable(asset);
    if(typeof document!=='undefined'){
      if(!asset.blob||typeof asset.blob.arrayBuffer!=='function')return false;
      if(asset.blob.size!=null&&Number(asset.blob.size)<=0)return false;
    }
    return true;
  }
  usableAssets(list=[]){return (Array.isArray(list)?list:[]).filter(asset=>this.assetUsable(asset))}
  missing(project){return (Array.isArray(project?.clips)?project.clips:[]).filter(c=>this.canonicalTrack(c?.track)==='0'&&!this.hasAsset(c)&&!this.locked(project,c)).length}
  importedVisuals(importedAssets=[]){return this.usableAssets(importedAssets).filter(a=>a?.type==='video'||a?.type==='image')}
  importedAudio(importedAssets=[]){return this.usableAssets(importedAssets).filter(a=>a?.type==='audio')}
  needsAudio(project){
    const clips=Array.isArray(project?.clips)?project.clips:[];
    const narration=clips.some(c=>this.canonicalTrack(c?.track)==='6'&&!this.hasAsset(c)&&!this.locked(project,c));
    const music=!this.trackLocked(project,5)&&!clips.some(c=>this.canonicalTrack(c?.track)==='5'&&this.hasAsset(c));
    const scenes=clips.filter(c=>this.canonicalTrack(c?.track)==='0').length;
    const sfx=!this.trackLocked(project,4)&&scenes>1&&!clips.some(c=>this.canonicalTrack(c?.track)==='4'&&this.hasAsset(c));
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
    const usable=this.usableAssets(allAssets);
    const hasNewVisual=this.importedVisuals(importedAssets).length>0;
    let assigned={};
    if(hasNewVisual&&before>0){
      // Keep compatibility with older/custom assignment engines that still use
      // truthiness for media references. Numeric ID 0 is valid in Studio, so
      // temporarily shield it while those engines fill other empty scenes.
      const protectedZero=new Map();
      for(const clip of Array.isArray(project?.clips)?project.clips:[])if(clip?.asset===0){protectedZero.set(clip,0);clip.asset='__profitmente_asset_zero__'}
      try{assigned=this.engine.assignAssets(project,usable)||{}}
      finally{for(const [clip,value] of protectedZero)if(clip.asset==='__profitmente_asset_zero__')clip.asset=value}
    }else{
      assigned={
        primary:0,broll:0,skipped:before,
        narration:Number(this.engine.assignNarration?.(project,usable)||0),
        music:Number(this.engine.assignSoundtrack?.(project,usable)||0),
        sfx:Number(this.engine.assignTransitionSfx?.(project,usable)||0)
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
    const imported=helper.assetsFromIds(assets,e.detail?.assetIds||[]);
    if(!imported.length)return;
    const result=helper.fill(project,assets,imported);
    if(!result.changed)return;
    save?.();
    const parts=[];
    if(result.primary||result.broll)parts.push(`${result.primary} escena(s) completada(s) y ${result.broll} B-roll añadido(s).`);
    if(result.narration)parts.push('Narración local conectada automáticamente.');
    if(result.music)parts.push('Música local añadida con ducking para voz.');
    if(result.sfx)parts.push(`${result.sfx} SFX local(es) colocado(s) en transiciones.`);
    if(result.after)parts.push(`Quedan ${result.after} escena(s) sin visual.`);else if(result.before>0)parts.push('Todas las escenas principales editables ya tienen visual.');
    setStatus?.(`Automatización: ${parts.join(' ')}`);
  });
  window.ProfitMenteGeneratorAutoFillIntegration=helper;
})();
