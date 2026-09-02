(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteOfflineMediaEngine=api.ProfitMenteOfflineMediaEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteOfflineMediaEngine{
  static trackState(project={},track){
    const keys=[track,String(track)],maps=[project?.trackState,project?.trackStates],states=[];
    for(const map of maps)for(const key of keys){const state=map?.[key];if(state&&typeof state==='object')states.push(state)}
    if(!states.length)return {};
    const merged=Object.assign({},...states);
    for(const key of ['locked','hidden','muted','solo'])merged[key]=states.some(state=>state?.[key]===true);
    return merged;
  }
  static clipActive(project={},clip={}){
    const track=Number(clip.track),state=this.trackState(project,track),visual=[0,1,2,3].includes(track),audio=[4,5,6].includes(track);
    if(visual&&state.hidden)return false;
    if(audio&&(state.muted||clip.muted))return false;
    if(visual){const hasSolo=[0,1,2,3].some(t=>this.trackState(project,t).solo);if(hasSolo&&!state.solo)return false}
    if(audio){const hasSolo=[4,5,6].some(t=>this.trackState(project,t).solo);if(hasSolo&&!state.solo)return false}
    return true;
  }
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
