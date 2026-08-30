(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ProfitMenteMediaPriorityEngine=api.ProfitMenteMediaPriorityEngine;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  class ProfitMenteMediaPriorityEngine{
    static isPreferred(asset){return !!asset?.preferred}
    static setPreferred(asset,value=true){if(!asset||typeof asset!=='object')return false;asset.preferred=!!value;return asset.preferred}
    static toggle(asset){return this.setPreferred(asset,!this.isPreferred(asset))}
    static bonus(asset){return this.isPreferred(asset)?5:0}
    static preferred(assets=[]){return (assets||[]).filter(a=>this.isPreferred(a))}
    static sort(assets=[]){return [...(assets||[])].sort((a,b)=>Number(this.isPreferred(b))-Number(this.isPreferred(a))||String(a?.name||'').localeCompare(String(b?.name||'')))}
  }
  return {ProfitMenteMediaPriorityEngine};
});
