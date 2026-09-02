class ProfitMenteMediaReplaceEngine{
  static MIN_CLIP_DURATION=.25;
  static trackKind(track){
    const t=Number(track);
    if(t===0||t===1)return 'visual';
    if(t===4||t===5||t===6)return 'audio';
    return 'other';
  }
  static assetKind(asset){
    if(asset?.type==='video'||asset?.type==='image')return 'visual';
    if(asset?.type==='audio')return 'audio';
    return 'other';
  }
  static trackLocked(project,track){
    const key=String(track);
    const modern=project?.trackState?.[track]??project?.trackState?.[key];
    const legacy=project?.trackStates?.[track]??project?.trackStates?.[key];
    return !!(
      (modern&&typeof modern==='object'&&modern.locked)||
      (legacy&&typeof legacy==='object'&&legacy.locked)
    );
  }
  static isLocked(project,clip){return !!clip&&(!!clip.locked||this.trackLocked(project,clip.track))}
  static canReplace(clip,asset){return !!clip&&!!asset&&this.trackKind(clip.track)===this.assetKind(asset)&&this.assetKind(asset)!=='other'}
  static sourceWindow(clip,asset){
    if(asset?.type==='image')return {known:false,offset:0,maxDuration:Infinity};
    const raw=Number(asset?.duration),known=Number.isFinite(raw)&&raw>0;
    const native=known?raw:0,speed=Math.max(.01,Number(clip?.speed)||1);
    let offset=Math.max(0,Number(clip?.sourceOffset)||0);
    if(known)offset=Math.min(offset,Math.max(0,native-.05));
    return {known,native,speed,offset,maxDuration:known?Math.max(0,(native-offset)/speed):Infinity};
  }
  static maxTimelineDuration(clip,asset){return this.sourceWindow(clip,asset).maxDuration}
  static replace(project,clipId,asset){
    const clip=(project?.clips||[]).find(c=>c?.id===clipId);
    if(!clip)return {ok:false,reason:'clip-missing'};
    if(!asset?.id)return {ok:false,reason:'asset-missing'};
    if(this.isLocked(project,clip))return {ok:false,reason:'locked'};
    if(!this.canReplace(clip,asset))return {ok:false,reason:'incompatible'};
    const window=this.sourceWindow(clip,asset);
    if(window.known&&window.maxDuration<this.MIN_CLIP_DURATION-.001)return {ok:false,reason:'source-too-short',available:window.maxDuration,required:this.MIN_CLIP_DURATION};
    const before={asset:clip.asset,name:clip.name,duration:clip.duration,sourceOffset:clip.sourceOffset};
    clip.asset=asset.id;clip.name=asset.name||clip.name||'Clip';
    if(asset.type==='image')clip.sourceOffset=0;
    else{
      clip.sourceOffset=window.offset;
      if(Number.isFinite(window.maxDuration)&&Number(clip.duration)>window.maxDuration)clip.duration=Math.max(this.MIN_CLIP_DURATION,window.maxDuration);
    }
    if(Number(clip.fadeIn)>Number(clip.duration))clip.fadeIn=Number(clip.duration);
    if(Number(clip.fadeOut)>Number(clip.duration))clip.fadeOut=Number(clip.duration);
    return {ok:true,clip,before,trimmed:Number(clip.duration)<Number(before.duration)};
  }
}
if(typeof window!=='undefined')window.ProfitMenteMediaReplaceEngine=ProfitMenteMediaReplaceEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteMediaReplaceEngine;
