(function(root){
  const QA=root?.ProfitMenteQAEngine;
  if(!QA||QA.prototype.__profitMenteMediaIdentityGuard)return;

  const mediaIdKey=value=>{
    if(value===undefined||value===null)return null;
    const raw=String(value).trim();
    if(!raw)return null;
    if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(raw)){
      const numeric=Number(raw);
      if(Number.isFinite(numeric))return `n:${numeric}`;
    }
    return `s:${raw}`;
  };
  const finiteNumber=value=>{
    if(value===undefined||value===null||value==='')return value;
    const numeric=Number(value);
    return Number.isFinite(numeric)?numeric:value;
  };

  function normalizeTimingProject(project){
    if(!project||typeof project!=='object')return project;
    return {
      ...project,
      duration:finiteNumber(project.duration),
      clips:(Array.isArray(project.clips)?project.clips:[]).map(clip=>{
        if(!clip||typeof clip!=='object')return clip;
        return {
          ...clip,
          start:finiteNumber(clip.start),
          duration:finiteNumber(clip.duration),
          sourceOffset:finiteNumber(clip.sourceOffset),
          speed:finiteNumber(clip.speed)
        };
      })
    };
  }

  function normalizeMediaIdentity(project,assets){
    const normalizedAssets=(Array.isArray(assets)?assets:[]).map(asset=>{
      if(!asset||typeof asset!=='object')return asset;
      const key=mediaIdKey(asset.id);
      return key===null?{...asset}:{...asset,id:key};
    });
    if(!project||typeof project!=='object')return {project,assets:normalizedAssets};
    const normalizedProject={
      ...project,
      clips:(Array.isArray(project.clips)?project.clips:[]).map(clip=>{
        if(!clip||typeof clip!=='object')return clip;
        const key=mediaIdKey(clip.asset);
        return key===null?{...clip}:{...clip,asset:key};
      })
    };
    return {project:normalizedProject,assets:normalizedAssets};
  }

  function timingIssues(project){
    const issues=[];
    const duration=Number(project?.duration);
    if(!Number.isFinite(duration)||duration<=0)issues.push('Duración de proyecto inválida.');
    for(const clip of Array.isArray(project?.clips)?project.clips:[]){
      if(!clip||typeof clip!=='object')continue;
      const label=clip.name||clip.id||'clip';
      const start=Number(clip.start),clipDuration=Number(clip.duration);
      if(!Number.isFinite(start))issues.push(`Inicio de clip inválido: ${label}`);
      if(!Number.isFinite(clipDuration))issues.push(`Duración de clip inválida: ${label}`);
      if(clip.sourceOffset!=null&&!Number.isFinite(Number(clip.sourceOffset)))issues.push(`Punto de entrada inválido: ${label}`);
      if(clip.speed!=null&&!Number.isFinite(Number(clip.speed)))issues.push(`Velocidad de clip inválida: ${label}`);
    }
    return issues;
  }

  function findCanonicalMediaCollisions(assets){
    const seen=new Map(),collisions=[];
    for(let index=0;index<(Array.isArray(assets)?assets.length:0);index++){
      const asset=assets[index];
      if(!asset||typeof asset!=='object')continue;
      const key=mediaIdKey(asset.id);
      if(key===null)continue;
      if(seen.has(key))collisions.push({key,firstIndex:seen.get(key),secondIndex:index});
      else seen.set(key,index);
    }
    return collisions;
  }

  const originalInspect=QA.prototype.inspect;
  QA.prototype.inspect=function(project,assets){
    const timingProject=normalizeTimingProject(project);
    const normalized=normalizeMediaIdentity(timingProject,assets);
    const result=originalInspect.call(this,normalized.project,normalized.assets);
    const collisions=findCanonicalMediaCollisions(assets);
    const malformedTiming=timingIssues(project);
    if(!collisions.length&&!malformedTiming.length)return result;

    const issues=Array.isArray(result.issues)?result.issues.slice():[];
    for(const issue of malformedTiming)if(!issues.includes(issue))issues.push(issue);
    for(const collision of collisions){
      const first=assets[collision.firstIndex]||{},second=assets[collision.secondIndex]||{};
      issues.push(`IDs de medio ambiguos: ${first.name||`medio ${collision.firstIndex+1}`} y ${second.name||`medio ${collision.secondIndex+1}`} comparten el ID canónico "${collision.key}".`);
    }
    const added=collisions.length+malformedTiming.length;
    return {
      ...result,
      ok:false,
      issues,
      score:Math.max(0,Number(result.score||0)-added*25),
      metrics:{
        ...(result.metrics||{}),
        ...(collisions.length?{mediaIdentityCollisions:collisions.length}:{}),
        ...(malformedTiming.length?{invalidTimingFields:malformedTiming.length}:{})
      }
    };
  };
  QA.prototype.__profitMenteMediaIdentityGuard=true;

  root.ProfitMenteMediaIdentityGuard={mediaIdKey,finiteNumber,normalizeTimingProject,normalizeMediaIdentity,timingIssues,findCanonicalMediaCollisions};
  if(typeof module!=='undefined'&&module.exports)module.exports={mediaIdKey,finiteNumber,normalizeTimingProject,normalizeMediaIdentity,timingIssues,findCanonicalMediaCollisions};
})(typeof window!=='undefined'?window:globalThis);