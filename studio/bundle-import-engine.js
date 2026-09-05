(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteBundleImportEngine=api.ProfitMenteBundleImportEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteBundleImportEngine{
  constructor({idFactory}={}){this.idFactory=idFactory||(()=>crypto.randomUUID())}
  mediaIdKey(value){
    if(value===undefined||value===null)return null;
    const raw=String(value).trim();if(!raw)return null;
    const numeric=Number(raw);
    return Number.isFinite(numeric)&&Number.isInteger(numeric)?String(numeric):raw;
  }
  identity(asset={}){
    const hash=String(asset.sourceContentHash||'').trim();if(hash)return `hash:${hash}`;
    const fingerprint=String(asset.sourceFingerprint||'').trim();if(fingerprint)return `fingerprint:${fingerprint}`;
    return `meta:${String(asset.name||'')}|${Number(asset.size)||0}|${String(asset.mime||'')}|${Number(asset.sourceLastModified)||0}`;
  }
  cloneAsset(asset={}){const copy={...asset};if(asset.blob)copy.blob=asset.blob;return copy}
  assetBytes(asset={}){const blobSize=Number(asset?.blob?.size);if(Number.isFinite(blobSize)&&blobSize>=0)return blobSize;const declared=Number(asset?.size);return Number.isFinite(declared)&&declared>=0?declared:0}
  requiredPersistBytes(assets=[]){return (Array.isArray(assets)?assets:[]).reduce((sum,asset)=>sum+this.assetBytes(asset),0)}
  storagePreflight(assets=[],estimate={}){
    const required=this.requiredPersistBytes(assets),quota=Number(estimate?.quota),usage=Number(estimate?.usage);
    if(!required||!Number.isFinite(quota)||quota<=0||!Number.isFinite(usage)||usage<0)return {ok:true,required,available:null,reserve:0,checked:false};
    const available=Math.max(0,quota-usage),reserve=Math.max(1024*1024,Math.ceil(required*.05)),ok=available>=required+reserve;
    return {ok,required,available,reserve,checked:true};
  }
  assertStorageCapacity(assets=[],estimate={}){
    const result=this.storagePreflight(assets,estimate);if(result.ok)return result;
    const mb=n=>Math.max(0,n/1048576).toFixed(1);
    throw new Error(`Espacio local insuficiente para restaurar los medios: se requieren ${mb(result.required+result.reserve)} MB y hay ${mb(result.available)} MB disponibles`);
  }
  readTarString(bytes,start,len){return new TextDecoder().decode(bytes.slice(start,start+len)).replace(/\0.*$/s,'').trim()}
  isSafeTarPath(name){
    const value=String(name||'');if(!value||value.length>180||value.includes('\\')||value.startsWith('/')||value.includes('\0'))return false;
    const parts=value.split('/');if(parts.some(part=>!part||part==='.'||part==='..'))return false;
    if(value==='project.json')return true;
    return parts.length===2&&parts[0]==='assets'&&parts[1]!=='project.json';
  }
  async assertSafeTar(blob){
    if(!blob||typeof blob.arrayBuffer!=='function')throw new Error('Paquete TAR inválido');
    const bytes=new Uint8Array(await blob.arrayBuffer()),seen=new Set();let offset=0,entries=0,projectCount=0;
    while(offset+512<=bytes.length){
      const header=bytes.slice(offset,offset+512);if(header.every(x=>x===0))break;
      const name=this.readTarString(header,0,100),sizeRaw=this.readTarString(header,124,12),size=parseInt(sizeRaw||'0',8),type=header[156];
      if(!name||!Number.isFinite(size)||size<0)throw new Error('Paquete TAR inválido');
      if(type&&type!==48)throw new Error(`Entrada TAR no soportada: ${name}`);
      if(!this.isSafeTarPath(name))throw new Error(`Ruta insegura en paquete: ${name}`);
      if(seen.has(name))throw new Error(`Entrada TAR duplicada: ${name}`);seen.add(name);
      entries++;if(entries>10000)throw new Error('Paquete TAR con demasiadas entradas');
      if(name==='project.json'){projectCount++;if(size>16*1024*1024)throw new Error('project.json excede el límite seguro de 16 MB')}
      offset+=512;if(offset+size>bytes.length)throw new Error('Paquete TAR truncado');offset+=Math.ceil(size/512)*512;
    }
    if(projectCount!==1)throw new Error('El paquete debe contener exactamente un project.json');
    return {ok:true,entries};
  }
  rewriteProjectAssetIds(project,idMap){
    const next=structuredClone(project||{});delete next.libraryId;
    const mapped=value=>{const key=this.mediaIdKey(value);return key!==null&&idMap.has(key)?idMap.get(key):value};
    if(Array.isArray(next.clips))for(const clip of next.clips){if(clip?.asset!==undefined&&clip?.asset!==null)clip.asset=mapped(clip.asset)}
    if(Array.isArray(next.assets))for(const asset of next.assets){if(asset?.id!==undefined&&asset?.id!==null)asset.id=mapped(asset.id)}
    return next;
  }
  prepare(project,incomingAssets=[],existingAssets=[]){
    if(!project||typeof project!=='object'||Array.isArray(project))throw new Error('Proyecto del paquete inválido');
    if(!Array.isArray(project.clips))throw new Error('El paquete no contiene una timeline válida');
    const existing=Array.isArray(existingAssets)?existingAssets:[],incoming=Array.isArray(incomingAssets)?incomingAssets:[];
    const byId=new Map();
    for(const asset of existing){const key=this.mediaIdKey(asset?.id);if(key!==null&&!byId.has(key))byId.set(key,asset)}
    const merged=existing.map(a=>this.cloneAsset(a)),toPersist=[],idMap=new Map();let reused=0,remapped=0,added=0;
    for(const source of incoming){
      const sourceKey=this.mediaIdKey(source?.id);if(sourceKey===null)throw new Error('Medio del paquete sin identificador');
      const local=byId.get(sourceKey);
      if(local&&this.identity(local)===this.identity(source)){
        const localId=local.id;if(String(localId)!==String(source.id))idMap.set(sourceKey,localId);
        reused++;continue
      }
      let next=this.cloneAsset(source),nextKey=sourceKey;
      if(local){
        const newId=this.idFactory(),newKey=this.mediaIdKey(newId);
        if(newKey===null||byId.has(newKey))throw new Error('No se pudo crear un identificador seguro para el medio importado');
        next.id=newId;nextKey=newKey;idMap.set(sourceKey,newId);remapped++
      }else added++;
      merged.push(next);toPersist.push(next);byId.set(nextKey,next);
    }
    const nextProject=this.rewriteProjectAssetIds(project,idMap);
    return {project:nextProject,assets:merged,assetsToPersist:toPersist,stats:{added,reused,remapped,totalIncoming:incoming.length}};
  }
}
return {ProfitMenteBundleImportEngine};
});
