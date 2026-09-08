(()=>{
  class ProfitMenteRenderMediaPruner{
    static canonicalMediaId(value){
      if(typeof value==='number')return Number.isFinite(value)?String(Object.is(value,-0)?0:value):'';
      if(typeof value==='string')return value.trim();
      return '';
    }
    static referencedIds(project){
      const ids=[];
      const seen=new Set();
      for(const clip of Array.isArray(project?.clips)?project.clips:[]){
        if(clip?.asset===null||clip?.asset===undefined)continue;
        const id=this.canonicalMediaId(clip.asset);
        if(!id)throw new Error(`Clip con identificador de medio inválido: ${clip?.id||'sin id'}`);
        if(!seen.has(id)){seen.add(id);ids.push(id)}
      }
      return ids;
    }
    static select(project,assets=[]){
      const requested=this.referencedIds(project);
      if(!requested.length)return [];
      const wanted=new Set(requested),matches=new Map();
      for(const asset of Array.isArray(assets)?assets:[]){
        const id=this.canonicalMediaId(asset?.id);
        if(!id||!wanted.has(id))continue;
        const list=matches.get(id)||[];list.push(asset);matches.set(id,list);
      }
      const selected=[];
      for(const id of requested){
        const list=matches.get(id)||[];
        if(!list.length)throw new Error(`Medio requerido por clip no disponible para render: ${id}`);
        if(list.length>1)throw new Error(`Identificador de medio ambiguo para render: ${id}`);
        selected.push(list[0]);
      }
      return selected;
    }
    static install(BundleCtor=globalThis.ProfitMenteBundleEngine){
      const proto=BundleCtor?.prototype;
      if(!proto||typeof proto.renderLocal!=='function'||proto.__renderMediaPrunerInstalled)return false;
      const original=proto.renderLocal;
      proto.renderLocal=async function(project,assets,onStatus=()=>{}){
        const all=Array.isArray(assets)?assets:[];
        const selected=ProfitMenteRenderMediaPruner.select(project,all);
        if(selected.length<all.length)onStatus(`Optimizando render · ${selected.length} de ${all.length} medios necesarios`);
        return original.call(this,project,selected,onStatus);
      };
      proto.__renderMediaPrunerInstalled=true;
      return true;
    }
  }
  if(typeof window!=='undefined')window.ProfitMenteRenderMediaPruner=ProfitMenteRenderMediaPruner;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteRenderMediaPruner;
  ProfitMenteRenderMediaPruner.install();
})();