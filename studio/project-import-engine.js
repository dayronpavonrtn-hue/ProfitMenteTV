(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteProjectImportEngine=api.ProfitMenteProjectImportEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteProjectImportEngine{
  constructor(defaults={version:'1.3',name:'Nuevo video',mode:'Manual',duration:45,format:'9:16',clips:[]}){this.defaults=defaults}
  normalize(input){
    if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Proyecto JSON inválido');
    if(!Array.isArray(input.clips))throw new Error('Timeline de proyecto inválida');
    if(input.clips.length>10000)throw new Error('Timeline demasiado grande para importar');
    const p=structuredClone(input),out={...structuredClone(this.defaults),...p};
    out.name=typeof p.name==='string'&&p.name.trim()?p.name.trim().slice(0,160):'Proyecto importado';
    out.mode=p.mode==='Automático'?'Automático':'Manual';
    const duration=Number(p.duration);
    if(!Number.isFinite(duration)||duration<=0||duration>86400)throw new Error('Duración de proyecto inválida');
    out.duration=duration;
    if(!['9:16','16:9','1:1'].includes(p.format))throw new Error('Formato de proyecto no compatible');
    out.format=p.format;
    out.clips=p.clips.map(c=>{
      if(!c||typeof c!=='object'||Array.isArray(c))throw new Error('Clip de proyecto inválido');
      const start=Number(c.start??0),clipDuration=Number(c.duration??0),track=Number(c.track??0);
      if(!Number.isFinite(start)||start<0||!Number.isFinite(clipDuration)||clipDuration<0)throw new Error('Tiempo de clip inválido');
      if(!Number.isInteger(track)||track<0||track>6)throw new Error('Pista de clip inválida');
      if(!Number.isFinite(start+clipDuration)||start+clipDuration>86400)throw new Error('Tiempo de clip fuera de rango');
      const copy=structuredClone(c);copy.track=track;return copy;
    });
    delete out.libraryId;
    return out;
  }
}
return {ProfitMenteProjectImportEngine};
});
