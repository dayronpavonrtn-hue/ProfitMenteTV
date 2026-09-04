(function(root){
  const QA=root?.ProfitMenteQAEngine;
  if(!QA||QA.prototype.__profitMenteMediaIdentityGuard)return;

  const mediaIdKey=value=>{
    if(value===undefined||value===null)return null;
    const key=String(value).trim();
    return key||null;
  };

  function findCanonicalMediaCollisions(assets){
    const seen=new Map(),collisions=[];
    for(let index=0;index<(Array.isArray(assets)?assets.length:0);index++){
      const asset=assets[index];
      if(!asset||typeof asset!=='object')continue;
      const key=mediaIdKey(asset.id);
      if(key===null)continue;
      if(seen.has(key)){
        collisions.push({key,firstIndex:seen.get(key),secondIndex:index});
      }else seen.set(key,index);
    }
    return collisions;
  }

  const originalInspect=QA.prototype.inspect;
  QA.prototype.inspect=function(project,assets){
    const result=originalInspect.call(this,project,assets);
    const collisions=findCanonicalMediaCollisions(assets);
    if(!collisions.length)return result;

    const issues=Array.isArray(result.issues)?result.issues.slice():[];
    for(const collision of collisions){
      const first=assets[collision.firstIndex]||{},second=assets[collision.secondIndex]||{};
      issues.push(`IDs de medio ambiguos: ${first.name||`medio ${collision.firstIndex+1}`} y ${second.name||`medio ${collision.secondIndex+1}`} comparten el ID canónico "${collision.key}".`);
    }
    const added=collisions.length;
    return {
      ...result,
      ok:false,
      issues,
      score:Math.max(0,Number(result.score||0)-added*25),
      metrics:{...(result.metrics||{}),mediaIdentityCollisions:added}
    };
  };
  QA.prototype.__profitMenteMediaIdentityGuard=true;

  root.ProfitMenteMediaIdentityGuard={mediaIdKey,findCanonicalMediaCollisions};
  if(typeof module!=='undefined'&&module.exports)module.exports={mediaIdKey,findCanonicalMediaCollisions};
})(typeof window!=='undefined'?window:globalThis);
