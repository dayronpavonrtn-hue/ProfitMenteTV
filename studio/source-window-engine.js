class ProfitMenteSourceWindowEngine{
  static number(value,fallback=null){
    if(typeof value==='number')return Number.isFinite(value)?value:fallback;
    if(typeof value!=='string')return fallback;
    const raw=value.trim();if(!raw)return fallback;
    const n=Number(raw);return Number.isFinite(n)?n:fallback;
  }
  static clamp(value,min,max){return Math.min(max,Math.max(min,value))}
  static normalize(clip={},asset={},options={}){
    const assetDuration=this.number(asset?.duration,null);
    const projectRemaining=this.number(options?.projectRemaining,Infinity);
    const requestedSpeed=this.number(clip?.speed,1);
    const requestedDuration=this.number(clip?.duration,.25);
    const requestedOffset=this.number(clip?.sourceOffset,0);
    const speed=this.clamp(requestedSpeed,.25,4);
    let duration=Math.max(.001,Math.min(Math.max(.001,projectRemaining),Math.max(.001,requestedDuration)));
    let sourceOffset=Math.max(0,requestedOffset);
    const result={speed,duration,sourceOffset,changed:false,limitedBySource:false,sourceEnd:null,availableSource:null};
    if(!(assetDuration>0)){
      result.changed=speed!==requestedSpeed||duration!==requestedDuration||sourceOffset!==requestedOffset;
      return result;
    }
    sourceOffset=Math.min(sourceOffset,assetDuration);
    const edited=options?.edited;
    if(edited==='sourceOffset'){
      const required=duration*speed;
      sourceOffset=Math.min(sourceOffset,Math.max(0,assetDuration-required));
    }
    let available=Math.max(0,assetDuration-sourceOffset);
    const maxTimelineDuration=available/speed;
    if(duration>maxTimelineDuration){
      duration=Math.max(.001,maxTimelineDuration);
      result.limitedBySource=true;
    }
    if(duration<=.001&&assetDuration>0){
      sourceOffset=Math.max(0,assetDuration-Math.min(assetDuration,.001*speed));
      available=Math.max(0,assetDuration-sourceOffset);
      duration=Math.max(.001,available/speed);
      result.limitedBySource=true;
    }
    result.speed=speed;
    result.duration=duration;
    result.sourceOffset=sourceOffset;
    result.availableSource=available;
    result.sourceEnd=Math.min(assetDuration,sourceOffset+duration*speed);
    const epsilon=1e-9;
    result.changed=Math.abs(speed-requestedSpeed)>epsilon||Math.abs(duration-requestedDuration)>epsilon||Math.abs(sourceOffset-requestedOffset)>epsilon;
    return result;
  }
}
if(typeof window!=='undefined')window.ProfitMenteSourceWindowEngine=ProfitMenteSourceWindowEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteSourceWindowEngine;
