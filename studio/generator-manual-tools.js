(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteGeneratorManualTools{
    constructor(engine){if(!engine)throw new TypeError('Generator engine requerido');this.engine=engine}
    canonicalTrack(value){return typeof this.engine.canonicalTrack==='function'?this.engine.canonicalTrack(value):null}
    trackLocked(project,track){return typeof this.engine.trackLocked==='function'&&this.engine.trackLocked(project,track)}
    mediaKey(value){return typeof this.engine.mediaKey==='function'?this.engine.mediaKey(value):null}
    sameMedia(a,b){const left=this.mediaKey(a),right=this.mediaKey(b);return left!=null&&left===right}
    clipEnd(clip){return (Number(clip?.start)||0)+Math.max(0,Number(clip?.duration)||0)}
    overlaps(a,b){const epsilon=1e-6;return (Number(a?.start)||0)<this.clipEnd(b)-epsilon&&(Number(b?.start)||0)<this.clipEnd(a)-epsilon}
    id(prefix='manual'){const uuid=root.crypto?.randomUUID?.();return uuid?`${prefix}_${uuid}`:`${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}`}
    assetUsable(asset){
      if(!asset||asset.mediaReadable===false||!['video','image'].includes(asset.type)||this.mediaKey(asset.id)==null)return false;
      const offline=root.ProfitMenteOfflineMediaEngine;
      if(offline?.assetUsable&&!offline.assetUsable(asset))return false;
      return true;
    }
    addMissingCaptions(project){
      if(!project||!Array.isArray(project.clips))return {added:0,skipped:0,locked:false};
      if(this.trackLocked(project,3))return {added:0,skipped:0,locked:true};
      const scenes=project.clips.filter(c=>this.canonicalTrack(c?.track)==='0').sort((a,b)=>(Number(a.start)||0)-(Number(b.start)||0));
      const captions=project.clips.filter(c=>this.canonicalTrack(c?.track)==='3');
      let added=0,skipped=0;
      for(const scene of scenes){
        const text=String(scene?.sceneText||scene?.script||'').trim();
        const start=Number(scene?.start)||0,duration=Math.max(0,Number(scene?.duration)||0);
        if(!text||duration<=.1||captions.some(c=>this.overlaps(c,scene))){skipped++;continue}
        const inset=Math.min(.15,duration*.08),capStart=start+inset,capDuration=Math.max(.1,duration-inset*2);
        const wordTimings=typeof this.engine.captionWords==='function'?this.engine.captionWords(text,capStart,capDuration):[];
        const clip={id:this.id('caption'),track:3,name:text,start:capStart,duration:capDuration,asset:null,style:'dynamic',animation:'word-by-word',wordTimings};
        project.clips.push(clip);captions.push(clip);added++;
      }
      return {added,skipped,locked:false};
    }
    addBroll(project,assets=[],options={}){
      if(!project||!Array.isArray(project.clips))return {added:0,skipped:0,locked:false,available:0};
      if(this.trackLocked(project,1))return {added:0,skipped:0,locked:true,available:0};
      const visual=(Array.isArray(assets)?assets:[]).filter(a=>this.assetUsable(a));
      if(!visual.length)return {added:0,skipped:0,locked:false,available:0};
      const max=Math.max(1,Math.min(12,Number(options.maxClips)||4));
      const format=project.format||'9:16',seed=typeof this.engine.hash==='function'?this.engine.hash(project.name||project.title||'ProfitMente'):1;
      const scenes=project.clips.filter(c=>this.canonicalTrack(c?.track)==='0').sort((a,b)=>(Number(a.start)||0)-(Number(b.start)||0));
      const broll=project.clips.filter(c=>this.canonicalTrack(c?.track)==='1');
      let added=0,skipped=0;
      for(const scene of scenes){
        if(added>=max)break;
        const sceneDuration=Math.max(0,Number(scene?.duration)||0);if(sceneDuration<.5||broll.some(c=>this.overlaps(c,scene))){skipped++;continue}
        let desired=Math.min(3,Math.max(.75,sceneDuration*.32));
        const alternatives=visual.filter(a=>!this.sameMedia(a.id,scene.asset));
        const pool=alternatives.length?alternatives:visual;
        const candidates=pool.map(asset=>{
          const known=Number(asset.duration)||0;
          const duration=asset.type==='video'&&known>0?Math.min(desired,known):desired;
          if(duration<.2)return null;
          const score=typeof this.engine.scoreAsset==='function'?this.engine.scoreAsset(asset,scene.keywords||[],format,duration):0;
          return {asset,duration,score};
        }).filter(Boolean).sort((a,b)=>b.score-a.score||String(a.asset.name||'').localeCompare(String(b.asset.name||'')));
        const chosen=candidates[0];if(!chosen){skipped++;continue}
        const duration=Math.min(chosen.duration,sceneDuration),room=Math.max(0,sceneDuration-duration),start=(Number(scene.start)||0)+Math.min(room,sceneDuration*.5);
        const probe={duration};const sourceOffset=typeof this.engine.sourceOffset==='function'?this.engine.sourceOffset(chosen.asset,probe,seed+added*37):0;
        const clip={id:this.id('broll'),track:1,name:`B-roll · ${chosen.asset.name||'medio'}`,start:+start.toFixed(3),duration:+duration.toFixed(3),asset:chosen.asset.id,sourceOffset:Number(sourceOffset)||0,volume:0,transition:'fade'};
        project.clips.push(clip);broll.push(clip);added++;
      }
      return {added,skipped,locked:false,available:visual.length};
    }
  }
  root.ProfitMenteGeneratorManualTools=ProfitMenteGeneratorManualTools;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteGeneratorManualTools;
})();
