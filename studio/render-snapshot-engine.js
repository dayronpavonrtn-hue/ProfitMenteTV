(()=>{
  const root=typeof window!=='undefined'?window:globalThis;

  function isBlobLike(value){
    return typeof Blob!=='undefined'&&value instanceof Blob;
  }

  function cloneRenderValue(value,seen=new WeakMap()){
    if(value===null||typeof value!=='object')return value;
    if(isBlobLike(value))return value;
    if(value instanceof Date)return new Date(value.getTime());
    if(seen.has(value))return seen.get(value);
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
      const original=proto.renderLocal;
      proto.renderLocal=async function(project,assets,onStatus=()=>{}){
        const snapshot=ProfitMenteRenderSnapshotEngine.capture(project,assets);
        return original.call(this,snapshot.project,snapshot.assets,onStatus);
      };
      proto.__renderSnapshotInstalled=true;
      return true;
    }
  }

  root.ProfitMenteRenderSnapshotEngine=ProfitMenteRenderSnapshotEngine;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteRenderSnapshotEngine;
  ProfitMenteRenderSnapshotEngine.install();
})();
