(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  const NUMERIC=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
  const strictFinite=value=>{
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string')return null;
    const raw=value.trim();
    if(!raw||!NUMERIC.test(raw))return null;
    const number=Number(raw);
    return Number.isFinite(number)?number:null;
  };
  class ProfitMenteQANumericScalarGuard{
    static strictFinite(value){return strictFinite(value)}
    static inspect(project){
      project=project&&typeof project==='object'?project:{};
      const issues=[];
      const duration=strictFinite(project.duration);
      if(duration===null||duration<=0)issues.push('Duración de proyecto inválida: usa un número mayor que 0.');
      for(const clip of Array.isArray(project.clips)?project.clips:[]){
        const label=String(clip?.name||clip?.id||'clip');
        const start=strictFinite(clip?.start),clipDuration=strictFinite(clip?.duration);
        if(start===null||start<0)issues.push(`Inicio de clip inválido: ${label}`);
        if(clipDuration===null||clipDuration<=0)issues.push(`Duración de clip inválida: ${label}`);
        if(duration!==null&&duration>0&&start!==null&&start>=0&&clipDuration!==null&&clipDuration>0&&start+clipDuration>duration+.01){
          issues.push(`Clip fuera de rango: ${label}`);
        }
        if(clip?.sourceOffset!=null){
          const offset=strictFinite(clip.sourceOffset);
          if(offset===null||offset<0)issues.push(`Punto de entrada inválido: ${label}`);
        }
        if(clip?.speed!=null){
          const speed=strictFinite(clip.speed);
          if(speed===null||speed<.25||speed>4)issues.push(`Velocidad fuera de rango (0.25×–4×): ${label}`);
        }
      }
      return issues;
    }
    static install(Engine){
      if(!Engine?.prototype||Engine.prototype.__profitmenteNumericScalarGuard)return false;
      const original=Engine.prototype.inspect;
      if(typeof original!=='function')return false;
      Engine.prototype.inspect=function(project,assets){
        const result=original.call(this,project,assets)||{};
        const issues=[...(result.issues||[])];
        for(const issue of ProfitMenteQANumericScalarGuard.inspect(project))if(!issues.includes(issue))issues.push(issue);
        return {...result,ok:issues.length===0,issues};
      };
      Engine.prototype.__profitmenteNumericScalarGuard=true;
      return true;
    }
  }
  root.ProfitMenteQANumericScalarGuard=ProfitMenteQANumericScalarGuard;
  let Engine=root.ProfitMenteQAEngine;
  if(!Engine&&typeof require==='function'){try{Engine=require('./qa-engine.js').ProfitMenteQAEngine}catch{}}
  if(Engine)ProfitMenteQANumericScalarGuard.install(Engine);
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteQANumericScalarGuard;
})();
