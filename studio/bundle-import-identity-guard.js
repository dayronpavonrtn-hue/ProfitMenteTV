(function(root){
  'use strict';

  function canonicalMediaId(value){
    if(typeof value==='number')return Number.isSafeInteger(value)?String(Object.is(value,-0)?0:value):'';
    if(typeof value!=='string')return '';
    const raw=value.trim();
    if(!raw)return '';
    const numeric=Number(raw);
    return Number.isFinite(numeric)&&Number.isSafeInteger(numeric)?String(Object.is(numeric,-0)?0:numeric):raw;
  }

  function validateRestoredBundle(restored){
    if(!restored||typeof restored!=='object')throw new Error('Paquete restaurado inválido');
    const project=restored.project;
    const assets=restored.assets;
    if(!project||typeof project!=='object'||!Array.isArray(project.clips)||!Array.isArray(assets))throw new Error('Paquete restaurado incompleto');

    const ids=new Set();
    for(const asset of assets){
      const id=canonicalMediaId(asset&&asset.id);
      if(!id)throw new Error(`Medio restaurado sin identificador válido: ${asset&&asset.name||'sin nombre'}`);
      if(ids.has(id))throw new Error(`Identificador de medio duplicado o ambiguo al restaurar paquete: ${id}`);
      ids.add(id);
      asset.id=id;
    }

    if(Array.isArray(project.assets)){
      const manifestIds=new Set();
      for(const meta of project.assets){
        const id=canonicalMediaId(meta&&meta.id);
        if(!id)throw new Error(`Medio del manifiesto sin identificador válido: ${meta&&meta.name||'sin nombre'}`);
        if(manifestIds.has(id))throw new Error(`Identificador de medio duplicado o ambiguo en manifiesto: ${id}`);
        if(!ids.has(id))throw new Error(`Medio del manifiesto no restaurado: ${id}`);
        manifestIds.add(id);
        meta.id=id;
      }
    }

    for(const clip of project.clips){
      if(!clip||clip.asset==null)continue;
      const id=canonicalMediaId(clip.asset);
      if(!id)throw new Error(`Clip con identificador de medio inválido al restaurar: ${clip.id||'sin id'}`);
      if(!ids.has(id))throw new Error(`Medio requerido por clip no existe en paquete restaurado: ${id}`);
      clip.asset=id;
    }
    return restored;
  }

  function install(BundleEngine){
    if(!BundleEngine||!BundleEngine.prototype||BundleEngine.prototype.__profitmenteBundleImportIdentityGuard)return false;
    const original=BundleEngine.prototype.parse;
    if(typeof original!=='function')return false;
    BundleEngine.prototype.parse=async function(blob){
      return validateRestoredBundle(await original.call(this,blob));
    };
    Object.defineProperty(BundleEngine.prototype,'__profitmenteBundleImportIdentityGuard',{value:true});
    return true;
  }

  const api={canonicalMediaId,validateRestoredBundle,install};
  if(root&&root.ProfitMenteBundleEngine)install(root.ProfitMenteBundleEngine);
  if(typeof module!=='undefined')module.exports=api;
  if(root)root.ProfitMenteBundleImportIdentityGuard=api;
})(typeof window!=='undefined'?window:globalThis);