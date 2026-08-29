(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteProjectImportEngine=api.ProfitMenteProjectImportEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteProjectImportEngine{
  constructor(defaults={version:'1.3',name:'Nuevo video',mode:'Manual',duration:45,format:'9:16',clips:[]}){this.defaults=defaults}
  normalize(input){
    if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Proyecto JSON inválido');
    const p=structuredClone(input),out={...structuredClone(this.defaults),...p};
    out.name=typeof p.name==='string'&&p.name.trim()?p.name.trim():'Proyecto importado';
    out.mode=p.mode==='Automático'?'Automático':'Manual';
    out.duration=Math.max(1,Number(p.duration)||45);
    out.format=['9:16','16:9','1:1'].includes(p.format)?p.format:'9:16';
    out.clips=Array.isArray(p.clips)?p.clips.filter(c=>c&&typeof c==='object').map(c=>structuredClone(c)):[];
    delete out.libraryId;
    return out;
  }
}
return {ProfitMenteProjectImportEngine};
});
