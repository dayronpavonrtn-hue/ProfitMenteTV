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
    const ids=new Set();
    const normalizeOptionalNumber=(copy,key,min,max,label)=>{
      if(copy[key]===undefined||copy[key]===null)return;
      const value=Number(copy[key]);
      if(!Number.isFinite(value)||value<min||value>max)throw new Error(`${label} inválido`);
      copy[key]=value;
    };
    out.clips=p.clips.map((c,index)=>{
      if(!c||typeof c!=='object'||Array.isArray(c))throw new Error('Clip de proyecto inválido');
      const start=Number(c.start??0),clipDuration=Number(c.duration??0),track=Number(c.track??0),end=start+clipDuration;
      if(!Number.isFinite(start)||start<0||!Number.isFinite(clipDuration)||clipDuration<=0)throw new Error('Tiempo de clip inválido');
      if(!Number.isInteger(track)||track<0||track>6)throw new Error('Pista de clip inválida');
      if(!Number.isFinite(end)||end>86400)throw new Error('Tiempo de clip fuera de rango');
      if(start>=out.duration||end>out.duration+1e-6)throw new Error('Clip fuera de la duración del proyecto');
      const copy=structuredClone(c);
      // Imported/legacy JSON commonly serializes editor numbers as strings. Persist a
      // canonical numeric project model so preview, timeline tools and render arithmetic
      // cannot disagree (for example sourceOffset + localTime must never concatenate).
      copy.track=track;copy.start=start;copy.duration=clipDuration;
      normalizeOptionalNumber(copy,'speed',.25,4,'Velocidad de clip');
      normalizeOptionalNumber(copy,'sourceOffset',0,86400,'Punto de entrada del medio');
      normalizeOptionalNumber(copy,'volume',0,2,'Volumen de clip');
      normalizeOptionalNumber(copy,'sourceVolume',0,2,'Volumen de audio original');
      normalizeOptionalNumber(copy,'positionX',-100,100,'Posición X');
      normalizeOptionalNumber(copy,'positionY',-100,100,'Posición Y');
      normalizeOptionalNumber(copy,'scale',.25,3,'Escala');
      normalizeOptionalNumber(copy,'rotation',-180,180,'Rotación');
      normalizeOptionalNumber(copy,'opacity',0,1,'Opacidad');
      normalizeOptionalNumber(copy,'fadeIn',0,clipDuration,'Fade de entrada');
      normalizeOptionalNumber(copy,'fadeOut',0,clipDuration,'Fade de salida');
      let id=typeof copy.id==='string'&&copy.id.trim()?copy.id.trim():`imported-clip-${index+1}`;
      if(ids.has(id))throw new Error('ID de clip duplicado');ids.add(id);copy.id=id;
      return copy;
    });
    delete out.libraryId;
    return out;
  }
}
return {ProfitMenteProjectImportEngine};
});
