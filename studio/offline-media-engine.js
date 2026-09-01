(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteOfflineMediaEngine=api.ProfitMenteOfflineMediaEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteOfflineMediaEngine{
  static trackState(project={},track){const all=project.trackState||project.trackStates||{};const state=all?.[track]??all?.[String(track)]??{};return state&&typeof state==='object'?state:{}}
  static clipActive(project={},clip={}){const track=Number(clip.track),state=this.trackState(project,track);if([0,1,2,3].includes(track)&&state.hidden)return false;if([4,5,6].includes(track)&&(state.muted||clip.muted))return false;return true}
  static assetUsable(asset){
    if(!asset)return false;
    if(asset.mediaReadable===false)return false;
    if(typeof document!=='undefined'){
      if(!asset.blob||typeof asset.blob.arrayBuffer!=='function')return false;
      if(asset.blob.size!=null&&Number(asset.blob.size)<=0)return false;
    }
    return true;
  }
  static audit(project={},assets=[]){
    const byId=new Map((Array.isArray(assets)?assets:[]).filter(a=>a?.id).map(a=>[a.id,a]));
    const offline=[],referenced=new Set();
    for(const clip of Array.isArray(project.clips)?project.clips:[]){
      if(!clip?.asset)continue;referenced.add(clip.asset);const asset=byId.get(clip.asset),active=this.clipActive(project,clip);
      let reason='';if(!asset)reason='missing';else if(asset.mediaReadable===false)reason='unreadable';else if(typeof document!=='undefined'&&(!asset.blob||typeof asset.blob.arrayBuffer!=='function'||(asset.blob.size!=null&&Number(asset.blob.size)<=0)))reason='unavailable';
      if(reason)offline.push({clipId:clip.id||null,clipName:clip.name||'Clip',assetId:clip.asset,assetName:asset?.name||null,track:Number(clip.track),active,reason});
    }
    const blocking=offline.filter(x=>x.active),missingAssetIds=[...new Set(offline.map(x=>x.assetId))];
    return {ok:blocking.length===0,offline,blocking,offlineClipIds:offline.map(x=>x.clipId).filter(Boolean),blockingClipIds:blocking.map(x=>x.clipId).filter(Boolean),missingAssetIds,referencedAssetIds:[...referenced],counts:{offline:offline.length,blocking:blocking.length,referenced:referenced.size}};
  }
  static label(reason){return reason==='unreadable'?'medio no decodificable':reason==='unavailable'?'archivo no disponible':'medio faltante'}
}
return {ProfitMenteOfflineMediaEngine};
});
