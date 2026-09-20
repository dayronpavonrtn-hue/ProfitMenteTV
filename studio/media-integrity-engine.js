class ProfitMenteMediaIntegrityEngine{
  static finite(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value==='string'&&value.trim()!==''){const n=Number(value);return Number.isFinite(n)?n:null}
    return null;
  }
  static canonicalId(value){
    if(typeof value==='string'){const v=value.trim();return v?v:null}
    if(typeof value==='number'&&Number.isFinite(value))return String(value);
    return null;
  }
  static validateAsset(asset){
    const errors=[],warnings=[];
    if(!asset||typeof asset!=='object')return {ok:false,errors:['invalid_asset'],warnings,assetId:null};
    const assetId=this.canonicalId(asset.id??asset.assetId);
    if(!assetId)errors.push('invalid_id');
    const type=typeof asset.type==='string'?asset.type.trim().toLowerCase():'';
    if(!['video','audio','image'].includes(type))errors.push('invalid_type');
    const duration=this.finite(asset.duration);
    if(type!=='image'&&(duration===null||duration<=0))errors.push('invalid_duration');
    if(type==='image'&&duration!==null&&duration<0)errors.push('invalid_duration');
    const source=typeof (asset.src??asset.url??asset.path)==='string'?(asset.src??asset.url??asset.path).trim():'';
    if(!source)errors.push('missing_source');
    if(asset.size!=null){const size=this.finite(asset.size);if(size===null||size<0)errors.push('invalid_size');else if(size===0)warnings.push('empty_file')}
    return {ok:errors.length===0,errors,warnings,assetId,type:type||null,duration};
  }
  static validateLibrary(assets=[]){
    if(!Array.isArray(assets))return {ok:false,total:0,valid:0,invalid:1,duplicates:[],results:[],errors:['invalid_library']};
    const seen=new Set(),duplicates=[],results=[];
    for(const asset of assets){const result=this.validateAsset(asset);results.push(result);if(result.assetId){if(seen.has(result.assetId))duplicates.push(result.assetId);else seen.add(result.assetId)}}
    const duplicateIds=[...new Set(duplicates)],valid=results.filter(r=>r.ok).length;
    return {ok:valid===results.length&&duplicateIds.length===0,total:results.length,valid,invalid:results.length-valid,duplicates:duplicateIds,results,errors:duplicateIds.length?['duplicate_asset_id']:[]};
  }
  static referencedAssetIds(project){
    const ids=new Set();
    for(const clip of Array.isArray(project?.clips)?project.clips:[]){const id=this.canonicalId(clip?.asset??clip?.assetId??clip?.mediaId);if(id)ids.add(id)}
    return [...ids];
  }
  static auditProject(project,assets=[]){
    const library=this.validateLibrary(assets),available=new Set(library.results.filter(r=>r.ok&&r.assetId).map(r=>r.assetId)),referenced=this.referencedAssetIds(project),missing=referenced.filter(id=>!available.has(id));
    return {ok:library.ok&&missing.length===0,library,referenced,missingAssets:missing};
  }
}
if(typeof window!=='undefined')window.ProfitMenteMediaIntegrityEngine=ProfitMenteMediaIntegrityEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteMediaIntegrityEngine;
