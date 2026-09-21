(function(root){
  const QA=root?.ProfitMenteQAEngine;
  if(!QA||QA.prototype.__profitMenteMediaIdentityGuard)return;

  const MIN_CLIP_SPEED=0.25;
  const MAX_CLIP_SPEED=4;
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
    if(value===undefined||value===null)return value;
    if(typeof value==='string'&&!value.trim())return value;
    const numeric=Number(value);
    return Number.isFinite(numeric)?numeric:value;
  };
  const strictFiniteNumber=value=>{
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string'||!value.trim())return null;
    const numeric=Number(value);
    return Number.isFinite(numeric)?numeric:null;
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
    const duration=strictFiniteNumber(project?.duration);
    if(duration===null||duration<=0)issues.push('Duración de proyecto inválida.');
    for(const clip of Array.isArray(project?.clips)?project.clips:[]){
      if(!clip||typeof clip!=='object')continue;
      const label=clip.name||clip.id||'clip';
      const start=strictFiniteNumber(clip.start),clipDuration=strictFiniteNumber(clip.duration);
      const sourceOffset=clip.sourceOffset==null?null:strictFiniteNumber(clip.sourceOffset);
      const speed=clip.speed==null?null:strictFiniteNumber(clip.speed);
      if(start===null||start<0)issues.push(`Inicio de clip inválido: ${label}`);
      if(clipDuration===null||clipDuration<=0)issues.push(`Duración de clip inválida: ${label}`);
      if(clip.sourceOffset!=null&&(sourceOffset===null||sourceOffset<0))issues.push(`Punto de entrada inválido: ${label}`);
      if(clip.speed!=null){
        if(speed===null)issues.push(`Velocidad de clip inválida: ${label}`);
        else if(speed<MIN_CLIP_SPEED||speed>MAX_CLIP_SPEED)issues.push(`Velocidad de clip fuera de rango (${MIN_CLIP_SPEED}x-${MAX_CLIP_SPEED}x): ${label}`);
      }
      if(duration!==null&&duration>0&&start!==null&&start>=0&&clipDuration!==null&&clipDuration>0&&start+clipDuration>duration+1e-6){
        issues.push(`Clip fuera de la duración del proyecto: ${label}`);
      }
    }
    return issues;
  }

  function mediaBoundsIssues(project,assets){
    const issues=[];
    const byId=new Map();
    for(const asset of Array.isArray(assets)?assets:[]){
      if(!asset||typeof asset!=='object'||asset.type==='image')continue;
      const key=mediaIdKey(asset.id),duration=strictFiniteNumber(asset.duration);
      if(key!==null&&duration!==null&&duration>0&&!byId.has(key))byId.set(key,{asset,duration});
    }
    for(const clip of Array.isArray(project?.clips)?project.clips:[]){
      if(!clip||typeof clip!=='object')continue;
      const key=mediaIdKey(clip.asset),source=key===null?null:byId.get(key);
      if(!source)continue;
      const clipDuration=strictFiniteNumber(clip.duration);
      const sourceOffset=clip.sourceOffset==null?0:strictFiniteNumber(clip.sourceOffset);
      const speed=clip.speed==null?1:strictFiniteNumber(clip.speed);
      if(clipDuration===null||clipDuration<=0||sourceOffset===null||sourceOffset<0||speed===null||speed<MIN_CLIP_SPEED||speed>MAX_CLIP_SPEED)continue;
      const sourceEnd=sourceOffset+clipDuration*speed;
      if(sourceEnd>source.duration+1e-6){
        const label=clip.name||clip.id||source.asset.name||'clip';
        issues.push(`Clip excede la duración del medio fuente: ${label} requiere ${sourceEnd.toFixed(2)}s y el medio tiene ${source.duration.toFixed(2)}s.`);
      }
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
    const sourceBounds=mediaBoundsIssues(project,assets);
    if(!collisions.length&&!malformedTiming.length&&!sourceBounds.length)return result;

    const issues=Array.isArray(result.issues)?result.issues.slice():[];
    for(const issue of [...malformedTiming,...sourceBounds])if(!issues.includes(issue))issues.push(issue);
    for(const collision of collisions){
      const first=assets[collision.firstIndex]||{},second=assets[collision.secondIndex]||{};
      issues.push(`IDs de medio ambiguos: ${first.name||`medio ${collision.firstIndex+1}`} y ${second.name||`medio ${collision.secondIndex+1}`} comparten el ID canónico "${collision.key}".`);
    }
    const added=collisions.length+malformedTiming.length+sourceBounds.length;
    return {
      ...result,
      ok:false,
      issues,
      score:Math.max(0,Number(result.score||0)-added*25),
      metrics:{
        ...(result.metrics||{}),
        ...(collisions.length?{mediaIdentityCollisions:collisions.length}:{}),
        ...(malformedTiming.length?{invalidTimingFields:malformedTiming.length}:{}),
        ...(sourceBounds.length?{sourceBoundsErrors:sourceBounds.length}:{})
      }
    };
  };
  QA.prototype.__profitMenteMediaIdentityGuard=true;

  root.ProfitMenteMediaIdentityGuard={MIN_CLIP_SPEED,MAX_CLIP_SPEED,mediaIdKey,finiteNumber,strictFiniteNumber,normalizeTimingProject,normalizeMediaIdentity,timingIssues,mediaBoundsIssues,findCanonicalMediaCollisions};
  if(typeof module!=='undefined'&&module.exports)module.exports={MIN_CLIP_SPEED,MAX_CLIP_SPEED,mediaIdKey,finiteNumber,strictFiniteNumber,normalizeTimingProject,normalizeMediaIdentity,timingIssues,mediaBoundsIssues,findCanonicalMediaCollisions};
})(typeof window!=='undefined'?window:globalThis);
if(typeof document!=='undefined'&&document.readyState==='loading'&&!globalThis.ProfitMenteQAStrictProjectGuard){document.write('<script src="qa-strict-project-guard.js"></scr'+'ipt>')}