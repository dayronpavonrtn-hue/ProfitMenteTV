(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteProjectExportEngine=api.ProfitMenteProjectExportEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteProjectExportEngine{
  idKey(value){
    if(value===null||value===undefined||typeof value==='boolean')return null;
    if(typeof value==='number')return Number.isFinite(value)?`n:${Object.is(value,-0)?0:value}`:null;
    if(typeof value!=='string')return null;
    const raw=value.trim();if(!raw)return null;
    if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(raw)){const n=Number(raw);if(Number.isFinite(n))return `n:${Object.is(n,-0)?0:n}`}
    return `s:${raw}`;
  }
  metadata(asset={}){
    const id=asset?.id;if(this.idKey(id)===null)return null;
    const out={id};
    for(const key of ['name','type','mime']){const v=typeof asset[key]==='string'?asset[key].trim():'';if(v)out[key]=v}
    for(const key of ['size','duration','width','height','metadataVersion','sourceLastModified']){const v=Number(asset[key]);if(Number.isFinite(v)&&v>=0)out[key]=v}
    for(const key of ['sourceFingerprint','sourceContentHash','sourceLegacyContentHash','sourceHashVersion','sourceRelativePath','importOrigin']){const v=typeof asset[key]==='string'?asset[key].trim():'';if(v)out[key]=v}
    return out;
  }
  referencedAssets(project={}){
    const refs=new Map();
    for(const clip of Array.isArray(project?.clips)?project.clips:[]){const id=clip?.asset,key=this.idKey(id);if(key!==null&&!refs.has(key))refs.set(key,id)}
    return refs;
  }
  projectMedia(project={},assets=[]){
    const refs=this.referencedAssets(project),stored=new Map(),live=new Map();
    for(const asset of Array.isArray(project?.assets)?project.assets:[]){const key=this.idKey(asset?.id);if(key!==null&&!stored.has(key))stored.set(key,asset)}
    for(const asset of Array.isArray(assets)?assets:[]){const key=this.idKey(asset?.id);if(key===null)continue;if(live.has(key))throw new Error(`Identificador de medio duplicado o ambiguo: ${String(asset.id)}`);live.set(key,asset)}
    const result=[];
    for(const [key,rawId] of refs){const oldMeta=this.metadata(stored.get(key)||{id:rawId})||{id:rawId},newMeta=this.metadata(live.get(key)||{id:rawId})||{id:rawId};result.push({...oldMeta,...newMeta,id:newMeta.id??oldMeta.id??rawId})}
    return result;
  }
  build(project={},assets=[],exportedAt=new Date().toISOString()){
    if(!project||typeof project!=='object'||Array.isArray(project))throw new Error('Proyecto inválido para exportar');
    const copy=structuredClone(project);delete copy.libraryId;copy.assets=this.projectMedia(project,assets);
    return {kind:'profitmente-studio-project',schemaVersion:2,exportedAt:String(exportedAt),project:copy};
  }
  serialize(project,assets,exportedAt){return JSON.stringify(this.build(project,assets,exportedAt),null,2)}
  safeFileName(name='profitmente-project'){return String(name||'profitmente-project').normalize('NFKD').replace(/[^\w\-. ]+/g,'').trim().replace(/\s+/g,'-').slice(0,80)||'profitmente-project'}
}
return {ProfitMenteProjectExportEngine};
});
