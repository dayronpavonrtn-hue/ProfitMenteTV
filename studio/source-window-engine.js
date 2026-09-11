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
  static idKey(value){
    if(typeof value==='number')return Number.isSafeInteger(value)&&value>=0?`n:${Object.is(value,-0)?0:value}`:null;
    if(typeof value!=='string')return null;
    const raw=value.trim();if(!raw)return null;
    if(/^(0|[1-9]\d*)$/.test(raw)){const n=Number(raw);return Number.isSafeInteger(n)?`n:${n}`:null}
    return `s:${raw}`;
  }
  static sameId(a,b){const x=this.idKey(a),y=this.idKey(b);return x!==null&&x===y}
  static locked(project,clip){
    if(!clip)return true;
    try{if(globalThis.ProfitMenteClipLock?.isLocked)return !!globalThis.ProfitMenteClipLock.isLocked(clip)}catch{}
    if(clip.locked)return true;
    const track=String(clip.track);
    for(const states of [project?.trackState,project?.trackStates])if(states?.[track]?.locked)return true;
    return false;
  }
  static cropWordTimings(clip){
    if(!Array.isArray(clip?.wordTimings))return;
    const start=this.number(clip.start,0),end=start+Math.max(0,this.number(clip.duration,0));
    clip.wordTimings=clip.wordTimings.flatMap(item=>{
      if(!item||typeof item!=='object'||Array.isArray(item))return [];
      const ws=this.number(item.start,null),we=this.number(item.end,null);if(ws===null||we===null||we<=ws||we<=start||ws>=end)return [];
      const next={...item,start:Math.max(start,ws),end:Math.min(end,we)};next.duration=Math.max(0,next.end-next.start);return next.duration>0?[next]:[];
    }).map((item,index)=>Object.prototype.hasOwnProperty.call(item,'index')?{...item,index}:item);
  }
  static reconcileSelected(edited){
    const project=globalThis.project,assets=globalThis.assets;
    const selectedId=globalThis.ProfitMenteEditTools?.selectedId;
    if(selectedId==null||!Array.isArray(project?.clips)||!Array.isArray(assets))return {changed:false};
    const clip=project.clips.find(c=>this.sameId(c?.id,selectedId));if(!clip||this.locked(project,clip))return {changed:false,locked:!!clip};
    const asset=assets.find(a=>this.sameId(a?.id,clip.asset));if(!asset||!['video','audio'].includes(asset.type)||!(this.number(asset.duration,0)>0))return {changed:false};
    const beforeDuration=this.number(clip.duration,0);
    const remaining=Math.max(.001,this.number(project.duration,0)-Math.max(0,this.number(clip.start,0)));
    const result=this.normalize(clip,asset,{projectRemaining:remaining,edited});
    if(!result.changed)return result;
    clip.speed=result.speed;clip.duration=result.duration;clip.sourceOffset=result.sourceOffset;
    if(result.duration<beforeDuration-1e-9)this.cropWordTimings(clip);
    globalThis.persist?.();globalThis.drawTimeline?.();globalThis.renderAt?.(+document.querySelector('#playhead')?.value||0);
    if(result.limitedBySource)globalThis.setStatus?.(`Clip ajustado al final real del medio · ${result.duration.toFixed(2)}s`);
    return result;
  }
  static installInspector(){
    if(typeof document==='undefined'||globalThis.__profitmenteSourceWindowInspector)return false;
    globalThis.__profitmenteSourceWindowInspector=true;
    document.addEventListener('change',event=>{
      const field={ciSpeed:'speed',ciDuration:'duration',ciSourceOffset:'sourceOffset'}[event.target?.id];
      if(!field)return;
      queueMicrotask(()=>this.reconcileSelected(field));
    });
    return true;
  }
}
if(typeof window!=='undefined'){window.ProfitMenteSourceWindowEngine=ProfitMenteSourceWindowEngine;ProfitMenteSourceWindowEngine.installInspector()}
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteSourceWindowEngine;
