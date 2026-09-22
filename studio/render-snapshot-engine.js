(()=>{
  const root=typeof window!=='undefined'?window:globalThis;

  function isBlobLike(value){
    return typeof Blob!=='undefined'&&value instanceof Blob;
  }

  function cloneRenderValue(value,seen=new WeakMap()){
    if(value===null||typeof value!=='object')return value;
    // Blob/File objects are immutable byte containers and can safely be shared.
    if(isBlobLike(value))return value;
    if(value instanceof Date)return new Date(value.getTime());
    if(seen.has(value))return seen.get(value);
    if(typeof ArrayBuffer!=='undefined'&&value instanceof ArrayBuffer){
      const copy=value.slice(0);seen.set(value,copy);return copy;
    }
    if(typeof ArrayBuffer!=='undefined'&&ArrayBuffer.isView?.(value)){
      if(value instanceof DataView){
        const buffer=cloneRenderValue(value.buffer,seen);
        const copy=new DataView(buffer,value.byteOffset,value.byteLength);seen.set(value,copy);return copy;
      }
      const copy=new value.constructor(value);seen.set(value,copy);return copy;
    }
    if(value instanceof Map){
      const copy=new Map();seen.set(value,copy);
      for(const [key,item] of value)copy.set(cloneRenderValue(key,seen),cloneRenderValue(item,seen));
      return copy;
    }
    if(value instanceof Set){
      const copy=new Set();seen.set(value,copy);
      for(const item of value)copy.add(cloneRenderValue(item,seen));
      return copy;
    }
    if(Array.isArray(value)){
      const copy=[];seen.set(value,copy);
      for(const item of value)copy.push(cloneRenderValue(item,seen));
      return copy;
    }
    const proto=Object.getPrototypeOf(value);
    if(proto!==Object.prototype&&proto!==null)return value;
    const copy={};seen.set(value,copy);
    for(const [key,item] of Object.entries(value))copy[key]=cloneRenderValue(item,seen);
    return copy;
  }

  class ProfitMenteRenderSnapshotEngine{
    static clone(value){return cloneRenderValue(value)}

    static capture(project,assets=[]){
      if(!project||typeof project!=='object'||Array.isArray(project))throw new Error('Proyecto inválido para crear instantánea de render');
      return {
        project:this.clone(project),
        assets:Array.isArray(assets)?this.clone(assets):[]
      };
    }

    static install(BundleCtor=root.ProfitMenteBundleEngine){
      const proto=BundleCtor?.prototype;
      if(!proto||typeof proto.renderLocal!=='function'||proto.__renderSnapshotInstalled)return false;
      const originalRender=proto.renderLocal;
      proto.renderLocal=async function(project,assets,onStatus=()=>{}){
        const snapshot=ProfitMenteRenderSnapshotEngine.capture(project,assets);
        return originalRender.call(this,snapshot.project,snapshot.assets,onStatus);
      };
      if(typeof proto.download==='function'){
        const originalDownload=proto.download;
        proto.download=async function(project,assets){
          const snapshot=ProfitMenteRenderSnapshotEngine.capture(project,assets);
          return originalDownload.call(this,snapshot.project,snapshot.assets);
        };
      }
      if(typeof proto.save==='function'){
        const originalSave=proto.save;
        proto.save=async function(project,assets,options={}){
          const snapshot=ProfitMenteRenderSnapshotEngine.capture(project,assets);
          const optionSnapshot=ProfitMenteRenderSnapshotEngine.clone(options);
          return originalSave.call(this,snapshot.project,snapshot.assets,optionSnapshot);
        };
      }
      proto.__renderSnapshotInstalled=true;
      return true;
    }
  }

  root.ProfitMenteRenderSnapshotEngine=ProfitMenteRenderSnapshotEngine;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteRenderSnapshotEngine;
  ProfitMenteRenderSnapshotEngine.install();
})();
