(function(root){
  const QA=root?.ProfitMenteQAEngine;
  if(!QA||QA.prototype.__profitMenteStrictProjectGuard)return;

  const numericPattern=/^[+-]?(?:\d+\.?\d*|\.\d+)$/;
  const finiteNumber=(value,fallback=null)=>{
    if(typeof value==='number')return Number.isFinite(value)?value:fallback;
    if(typeof value==='string'){
      const raw=value.trim();
      if(!raw||!numericPattern.test(raw))return fallback;
      const numeric=Number(raw);
      return Number.isFinite(numeric)?numeric:fallback;
    }
    return fallback;
  };
  const canonicalTrack=value=>{
    const numeric=finiteNumber(value,null);
    return numeric!==null&&Number.isInteger(numeric)&&numeric>=0&&numeric<=6?numeric:null;
  };
  const strictFlag=value=>value===true;

  function invalidProjectFields(project){
    const issues=[];
    const duration=finiteNumber(project?.duration,null);
    if(duration===null||duration<=0)issues.push('Duración de proyecto inválida.');
    const clips=Array.isArray(project?.clips)?project.clips:[];
    for(const clip of clips){
      if(!clip||typeof clip!=='object'){issues.push('Clip inválido en timeline.');continue}
      const label=String(clip.name||clip.id||'clip');
      if(canonicalTrack(clip.track)===null)issues.push(`Pista inválida: ${label}`);
      for(const [field,caption] of [['start','Inicio'],['duration','Duración']]){
        const value=finiteNumber(clip[field],null);
        if(value===null)issues.push(`${caption} de clip inválido: ${label}`);
      }
      for(const [field,caption] of [['sourceOffset','Punto de entrada'],['speed','Velocidad'],['volume','Volumen'],['fadeIn','Fade de entrada'],['fadeOut','Fade de salida']]){
        if(clip[field]!=null&&finiteNumber(clip[field],null)===null)issues.push(`${caption} inválido: ${label}`);
      }
    }
    for(const states of [project?.trackState,project?.trackStates]){
      if(states==null)continue;
      if(typeof states!=='object'||Array.isArray(states)){issues.push('Estado de pistas inválido.');continue}
      for(const [key,state] of Object.entries(states)){
        if(canonicalTrack(key)===null){issues.push(`Identidad de pista inválida en estado: ${key}`);continue}
        if(!state||typeof state!=='object'||Array.isArray(state)){issues.push(`Estado de pista inválido: ${key}`);continue}
        for(const flag of ['hidden','muted','locked','solo'])if(state[flag]!=null&&typeof state[flag]!=='boolean')issues.push(`Bandera ${flag} inválida en pista ${key}.`);
      }
    }
    return [...new Set(issues)];
  }

  function sanitizeProject(project){
    if(!project||typeof project!=='object')return project;
    const sanitizeStates=states=>{
      if(!states||typeof states!=='object'||Array.isArray(states))return {};
      const out={};
      for(const [key,state] of Object.entries(states)){
        const track=canonicalTrack(key);
        if(track===null||!state||typeof state!=='object'||Array.isArray(state))continue;
        const current=out[track]||{hidden:false,muted:false,locked:false,solo:false};
        out[track]={
          hidden:current.hidden||strictFlag(state.hidden),
          muted:current.muted||strictFlag(state.muted),
          locked:current.locked||strictFlag(state.locked),
          solo:current.solo||strictFlag(state.solo)
        };
      }
      return out;
    };
    return {
      ...project,
      duration:finiteNumber(project.duration,0),
      trackState:sanitizeStates(project.trackState),
      trackStates:sanitizeStates(project.trackStates),
      clips:(Array.isArray(project.clips)?project.clips:[]).map(clip=>{
        if(!clip||typeof clip!=='object')return clip;
        return {
          ...clip,
          track:canonicalTrack(clip.track),
          start:finiteNumber(clip.start,0),
          duration:finiteNumber(clip.duration,0),
          ...(clip.sourceOffset!=null?{sourceOffset:finiteNumber(clip.sourceOffset,0)}:{}),
          ...(clip.speed!=null?{speed:finiteNumber(clip.speed,1)}:{}),
          ...(clip.volume!=null?{volume:finiteNumber(clip.volume,1)}:{}),
          ...(clip.fadeIn!=null?{fadeIn:finiteNumber(clip.fadeIn,0)}:{}),
          ...(clip.fadeOut!=null?{fadeOut:finiteNumber(clip.fadeOut,0)}:{})
        };
      })
    };
  }

  const originalInspect=QA.prototype.inspect;
  QA.prototype.inspect=function(project,assets){
    const strictIssues=invalidProjectFields(project);
    const result=originalInspect.call(this,sanitizeProject(project),assets);
    if(!strictIssues.length)return result;
    const issues=Array.isArray(result.issues)?result.issues.slice():[];
    for(const issue of strictIssues)if(!issues.includes(issue))issues.push(issue);
    return {
      ...result,
      ok:false,
      issues,
      score:Math.max(0,Number(result.score||0)-strictIssues.length*25),
      metrics:{...(result.metrics||{}),invalidProjectFields:strictIssues.length}
    };
  };
  QA.prototype.__profitMenteStrictProjectGuard=true;
  root.ProfitMenteQAStrictProjectGuard={finiteNumber,canonicalTrack,strictFlag,invalidProjectFields,sanitizeProject};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.ProfitMenteQAStrictProjectGuard;
})(typeof window!=='undefined'?window:globalThis);