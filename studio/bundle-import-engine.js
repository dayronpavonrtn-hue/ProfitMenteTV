(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteBundleImportEngine=api.ProfitMenteBundleImportEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteBundleImportEngine{
  constructor({idFactory}={}){this.idFactory=idFactory||(()=>crypto.randomUUID())}
  identity(asset={}){
    const hash=String(asset.sourceContentHash||'').trim();if(hash)return `hash:${hash}`;
    const fingerprint=String(asset.sourceFingerprint||'').trim();if(fingerprint)return `fingerprint:${fingerprint}`;
    return `meta:${String(asset.name||'')}|${Number(asset.size)||0}|${String(asset.mime||'')}|${Number(asset.sourceLastModified)||0}`;
  }
  cloneAsset(asset={}){const copy={...asset};if(asset.blob)copy.blob=asset.blob;return copy}
  rewriteProjectAssetIds(project,idMap){
    const next=structuredClone(project||{});delete next.libraryId;
    if(Array.isArray(next.clips))for(const clip of next.clips){if(clip?.asset&&idMap.has(clip.asset))clip.asset=idMap.get(clip.asset)}
    if(Array.isArray(next.assets))for(const asset of next.assets){if(asset?.id&&idMap.has(asset.id))asset.id=idMap.get(asset.id)}
    return next;
  }
  prepare(project,incomingAssets=[],existingAssets=[]){
    if(!project||typeof project!=='object'||Array.isArray(project))throw new Error('Proyecto del paquete inválido');
    if(!Array.isArray(project.clips))throw new Error('El paquete no contiene una timeline válida');
    const existing=Array.isArray(existingAssets)?existingAssets:[],incoming=Array.isArray(incomingAssets)?incomingAssets:[];
    const byId=new Map(existing.filter(a=>a?.id).map(a=>[a.id,a]));
    const merged=existing.map(a=>this.cloneAsset(a)),toPersist=[],idMap=new Map();let reused=0,remapped=0,added=0;
    for(const source of incoming){
      if(!source?.id)throw new Error('Medio del paquete sin identificador');
      const local=byId.get(source.id);
      if(local&&this.identity(local)===this.identity(source)){reused++;continue}
      let next=this.cloneAsset(source);
      if(local){const oldId=next.id,newId=this.idFactory();if(!newId||byId.has(newId))throw new Error('No se pudo crear un identificador seguro para el medio importado');next.id=newId;idMap.set(oldId,newId);remapped++}
      else added++;
      merged.push(next);toPersist.push(next);byId.set(next.id,next);
    }
    const nextProject=this.rewriteProjectAssetIds(project,idMap);
    return {project:nextProject,assets:merged,assetsToPersist:toPersist,stats:{added,reused,remapped,totalIncoming:incoming.length}};
  }
}
return {ProfitMenteBundleImportEngine};
});
