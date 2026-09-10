(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteProjectImportEngine=api.ProfitMenteProjectImportEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteProjectImportEngine{
  constructor(defaults={version:'1.3',name:'Nuevo video',mode:'Manual',duration:45,format:'9:16',fps:30,clips:[]}){this.defaults=defaults}
  unwrap(input){
    if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Proyecto JSON inválido');
    if(input.kind==='profitmente-studio-project'){
      if(!input.project||typeof input.project!=='object'||Array.isArray(input.project))throw new Error('Contenido de proyecto inválido');
      return input.project;
    }
    return input;
  }
  normalize(input){
    const source=this.unwrap(input);
    if(!Array.isArray(source.clips))throw new Error('Timeline de proyecto inválida');
    if(source.clips.length>10000)throw new Error('Timeline demasiado grande para importar');
    const p=structuredClone(source),out={...structuredClone(this.defaults),...p};
    const parseFiniteNumber=(raw,label)=>{
      const type=typeof raw;
      if(type!=='number'&&type!=='string')throw new Error(`${label} inválido`);
      if(type==='string'&&!raw.trim())throw new Error(`${label} inválido`);
      const value=Number(raw);
      if(!Number.isFinite(value))throw new Error(`${label} inválido`);
      return value;
    };
    const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
    const canonicalEasing=value=>{
      const easing=typeof value==='string'?value.trim().toLowerCase():'';
      return ['linear','ease-in','ease-out','ease-in-out','hold'].includes(easing)?easing:'linear';
    };
    out.name=typeof p.name==='string'&&p.name.trim()?p.name.trim().slice(0,160):'Proyecto importado';
    out.mode=p.mode==='Automático'?'Automático':'Manual';
    const duration=parseFiniteNumber(p.duration,'Duración de proyecto');
    if(duration<=0||duration>86400)throw new Error('Duración de proyecto inválida');
    out.duration=duration;
    if(!['9:16','16:9','1:1'].includes(p.format))throw new Error('Formato de proyecto no compatible');
    out.format=p.format;
    const fpsSource=p.fps??p.frameRate??this.defaults.fps??30;
    const fpsPrimitive=typeof fpsSource==='number'||(typeof fpsSource==='string'&&fpsSource.trim());
    const fpsNumber=fpsPrimitive?Number(fpsSource):NaN;
    out.fps=Number.isFinite(fpsNumber)&&[24,30,60].includes(Math.round(fpsNumber))&&Math.abs(fpsNumber-Math.round(fpsNumber))<1e-9?Math.round(fpsNumber):30;
    delete out.frameRate;
    const ids=new Set();
    const normalizeOptionalNumber=(copy,key,min,max,label)=>{
      if(copy[key]===undefined||copy[key]===null)return;
      const value=parseFiniteNumber(copy[key],label);
      if(value<min||value>max)throw new Error(`${label} inválido`);
      copy[key]=value;
    };
    const normalizeVisualAdjustments=copy=>{
      if(copy.visualAdjustments===undefined||copy.visualAdjustments===null)return;
      if(!copy.visualAdjustments||typeof copy.visualAdjustments!=='object'||Array.isArray(copy.visualAdjustments))throw new Error('Ajustes visuales inválidos');
      const src=copy.visualAdjustments,defaults={brightness:100,contrast:100,saturation:100,grayscale:0},limits={brightness:[0,300],contrast:[0,300],saturation:[0,300],grayscale:[0,100]},next={};
      for(const [key,fallback] of Object.entries(defaults)){
        if(src[key]===undefined||src[key]===null){next[key]=fallback;continue}
        next[key]=clamp(parseFiniteNumber(src[key],`Ajuste visual ${key}`),...limits[key]);
      }
      copy.visualAdjustments=next;
    };
    const normalizeVisualKeyframes=(copy,clipDuration)=>{
      if(copy.visualKeyframes===undefined||copy.visualKeyframes===null)return;
      if(!Array.isArray(copy.visualKeyframes))throw new Error('Keyframes visuales inválidos');
      if(copy.visualKeyframes.length>2000)throw new Error('Demasiados keyframes visuales');
      const frames=[];
      for(const raw of copy.visualKeyframes){
        if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Keyframe visual inválido');
        const time=parseFiniteNumber(raw.time,'Tiempo de keyframe');
        if(time<0||time>clipDuration)throw new Error('Tiempo de keyframe fuera del clip');
        const frame={
          time:+time.toFixed(6),
          x:clamp(raw.x===undefined?0:parseFiniteNumber(raw.x,'Posición X de keyframe'),-200,200),
          y:clamp(raw.y===undefined?0:parseFiniteNumber(raw.y,'Posición Y de keyframe'),-200,200),
          scale:clamp(raw.scale===undefined?1:parseFiniteNumber(raw.scale,'Escala de keyframe'),.1,8),
          rotation:clamp(raw.rotation===undefined?0:parseFiniteNumber(raw.rotation,'Rotación de keyframe'),-3600,3600),
          opacity:clamp(raw.opacity===undefined?1:parseFiniteNumber(raw.opacity,'Opacidad de keyframe'),0,1),
          easing:canonicalEasing(raw.easing)
        };
        frames.push(frame);
      }
      frames.sort((a,b)=>a.time-b.time);
      const deduped=[];
      for(const frame of frames){
        const last=deduped[deduped.length-1];
        if(last&&Math.abs(last.time-frame.time)<=.001)deduped[deduped.length-1]={...frame,time:last.time};
        else deduped.push(frame);
      }
      copy.visualKeyframes=deduped;
    };
    out.clips=p.clips.map((c,index)=>{
      if(!c||typeof c!=='object'||Array.isArray(c))throw new Error('Clip de proyecto inválido');
      const start=parseFiniteNumber(c.start??0,'Tiempo de clip'),clipDuration=parseFiniteNumber(c.duration??0,'Tiempo de clip'),track=parseFiniteNumber(c.track??0,'Pista de clip'),end=start+clipDuration;
      if(start<0||clipDuration<=0)throw new Error('Tiempo de clip inválido');
      if(!Number.isInteger(track)||track<0||track>6)throw new Error('Pista de clip inválida');
      if(!Number.isFinite(end)||end>86400)throw new Error('Tiempo de clip fuera de rango');
      if(end>out.duration+1e-9)throw new Error('Clip excede la duración del proyecto');
      const copy=structuredClone(c);
      copy.track=track;copy.start=start;copy.duration=clipDuration;
      normalizeOptionalNumber(copy,'speed',.25,4,'Velocidad de clip');
      normalizeOptionalNumber(copy,'sourceOffset',0,Infinity,'Punto de entrada del medio');
      normalizeOptionalNumber(copy,'volume',0,2,'Volumen de clip');
      normalizeOptionalNumber(copy,'sourceVolume',0,2,'Volumen de audio original');
      normalizeOptionalNumber(copy,'positionX',-100,100,'Posición X');
      normalizeOptionalNumber(copy,'positionY',-100,100,'Posición Y');
      normalizeOptionalNumber(copy,'scale',.25,3,'Escala');
      normalizeOptionalNumber(copy,'rotation',-180,180,'Rotación');
      normalizeOptionalNumber(copy,'opacity',0,1,'Opacidad');
      normalizeOptionalNumber(copy,'fadeIn',0,clipDuration,'Fade de entrada');
      normalizeOptionalNumber(copy,'fadeOut',0,clipDuration,'Fade de salida');
      normalizeVisualAdjustments(copy);
      normalizeVisualKeyframes(copy,clipDuration);
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
