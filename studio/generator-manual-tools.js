(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteGeneratorManualTools{
    constructor(engine){if(!engine)throw new TypeError('Generator engine requerido');this.engine=engine}
    canonicalTrack(value){return typeof this.engine.canonicalTrack==='function'?this.engine.canonicalTrack(value):null}
    trackLocked(project,track){return typeof this.engine.trackLocked==='function'&&this.engine.trackLocked(project,track)}
    mediaKey(value){return typeof this.engine.mediaKey==='function'?this.engine.mediaKey(value):null}
    sameMedia(a,b){const left=this.mediaKey(a),right=this.mediaKey(b);return left!=null&&left===right}
    finiteNumber(value,fallback=0){
      if(value==null||typeof value==='boolean'||(typeof value!=='string'&&typeof value!=='number'))return fallback;
      const raw=typeof value==='string'?value.trim():value;if(raw==='')return fallback;
      const number=Number(raw);return Number.isFinite(number)?number:fallback;
    }
    nonNegative(value,fallback=0){return Math.max(0,this.finiteNumber(value,fallback))}
    text(value,fallback=''){return typeof value==='string'?value.trim():fallback}
    clipEnd(clip){return this.nonNegative(clip?.start,0)+this.nonNegative(clip?.duration,0)}
    overlaps(a,b){const epsilon=1e-6;return this.nonNegative(a?.start,0)<this.clipEnd(b)-epsilon&&this.nonNegative(b?.start,0)<this.clipEnd(a)-epsilon}
    id(prefix='manual'){const uuid=root.crypto?.randomUUID?.();return uuid?`${prefix}_${uuid}`:`${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}`}
    assetUsable(asset){
      if(!asset||asset.mediaReadable===false||!['video','image'].includes(asset.type)||this.mediaKey(asset.id)==null)return false;
      const offline=root.ProfitMenteOfflineMediaEngine;
      if(offline?.assetUsable&&!offline.assetUsable(asset))return false;
      return true;
    }
    captionUsable(clip){
      if(this.nonNegative(clip?.duration,0)<=.05)return false;
      if(this.text(clip?.name)||this.text(clip?.text)||this.text(clip?.sceneText)||this.text(clip?.script))return true;
      return Array.isArray(clip?.wordTimings)&&clip.wordTimings.some(item=>(this.text(item?.word)||this.text(item?.text))&&this.nonNegative(item?.duration,0)>.001);
    }
    brollUsable(clip,visualKeys){
      const key=this.mediaKey(clip?.asset);
      return this.nonNegative(clip?.duration,0)>.05&&key!=null&&visualKeys.has(key);
    }
    addMissingCaptions(project){
      if(!project||!Array.isArray(project.clips))return {added:0,skipped:0,locked:false};
      if(this.trackLocked(project,3))return {added:0,skipped:0,locked:true};
      const scenes=project.clips.filter(c=>this.canonicalTrack(c?.track)==='0').sort((a,b)=>this.nonNegative(a?.start,0)-this.nonNegative(b?.start,0));
      const captions=project.clips.filter(c=>this.canonicalTrack(c?.track)==='3'&&this.captionUsable(c));
      let added=0,skipped=0;
      for(const scene of scenes){
        const text=this.text(scene?.sceneText)||this.text(scene?.script);
        const start=this.nonNegative(scene?.start,0),duration=this.nonNegative(scene?.duration,0);
        if(!text||duration<=.1||captions.some(c=>this.overlaps(c,scene))){skipped++;continue}
        const inset=Math.min(.15,duration*.08),capStart=start+inset,capDuration=Math.max(.1,duration-inset*2);
        const rawWordTimings=typeof this.engine.captionWords==='function'?this.engine.captionWords(text,capStart,capDuration):[];
        const wordTimings=Array.isArray(rawWordTimings)?rawWordTimings:[];
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
      const visualKeys=new Set(visual.map(asset=>this.mediaKey(asset.id)).filter(Boolean));
      const requestedMax=this.finiteNumber(options?.maxClips,4),max=Math.max(1,Math.min(12,Math.trunc(requestedMax)||4));
      const format=['9:16','16:9','1:1'].includes(this.text(project?.format))?this.text(project.format):'9:16';
      const seedText=this.text(project?.name)||this.text(project?.title)||'ProfitMente';
      const seed=typeof this.engine.hash==='function'?this.engine.hash(seedText):1;
      const scenes=project.clips.filter(c=>this.canonicalTrack(c?.track)==='0').sort((a,b)=>this.nonNegative(a?.start,0)-this.nonNegative(b?.start,0));
      const broll=project.clips.filter(c=>this.canonicalTrack(c?.track)==='1'&&this.brollUsable(c,visualKeys));
      let added=0,skipped=0;
      for(const scene of scenes){
        if(added>=max)break;
        const sceneDuration=this.nonNegative(scene?.duration,0);if(sceneDuration<.5||broll.some(c=>this.overlaps(c,scene))){skipped++;continue}
        const desired=Math.min(3,Math.max(.75,sceneDuration*.32));
        const alternatives=visual.filter(a=>!this.sameMedia(a.id,scene.asset));
        const pool=alternatives.length?alternatives:visual;
        const keywords=(Array.isArray(scene?.keywords)?scene.keywords:[]).map(value=>this.text(value)).filter(Boolean);
        const candidates=pool.map(asset=>{
          const known=this.nonNegative(asset?.duration,0);
          const duration=asset.type==='video'&&known>0?Math.min(desired,known):desired;
          if(duration<.2)return null;
          const rawScore=typeof this.engine.scoreAsset==='function'?this.engine.scoreAsset(asset,keywords,format,duration):0;
          const score=this.finiteNumber(rawScore,0);
          return {asset,duration,score};
        }).filter(Boolean).sort((a,b)=>b.score-a.score||this.text(a.asset?.name,'medio').localeCompare(this.text(b.asset?.name,'medio')));
        const chosen=candidates[0];if(!chosen){skipped++;continue}
        const duration=Math.min(chosen.duration,sceneDuration),room=Math.max(0,sceneDuration-duration),start=this.nonNegative(scene?.start,0)+Math.min(room,sceneDuration*.5);
        const knownDuration=this.nonNegative(chosen.asset?.duration,0);
        let sourceOffset=0;
        if(chosen.asset?.type==='video'&&knownDuration>0){
          const probe={duration};
          const rawSourceOffset=typeof this.engine.sourceOffset==='function'?this.engine.sourceOffset(chosen.asset,probe,seed+added*37):0;
          sourceOffset=Math.min(Math.max(0,knownDuration-duration),this.nonNegative(rawSourceOffset,0));
        }
        const clip={id:this.id('broll'),track:1,name:`B-roll · ${this.text(chosen.asset?.name,'medio')}`,start:+start.toFixed(3),duration:+duration.toFixed(3),asset:chosen.asset.id,sourceOffset:Number.isFinite(sourceOffset)?+sourceOffset.toFixed(3):0,volume:0,transition:'fade'};
        project.clips.push(clip);broll.push(clip);added++;
      }
      return {added,skipped,locked:false,available:visual.length};
    }
  }
  root.ProfitMenteGeneratorManualTools=ProfitMenteGeneratorManualTools;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteGeneratorManualTools;
})();
