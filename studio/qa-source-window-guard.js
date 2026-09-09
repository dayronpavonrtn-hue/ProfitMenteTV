(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  let Identity=root.ProfitMenteMediaIdentityEngine;
  if(!Identity&&typeof require==='function'){try{Identity=require('./media-identity-engine.js').ProfitMenteMediaIdentityEngine}catch{}}
  const fallbackKey=value=>{
    if(typeof value==='number')return Number.isSafeInteger(value)&&value>=0?`n:${Object.is(value,-0)?0:value}`:null;
    if(typeof value!=='string')return null;
    const text=value.trim();if(!text)return null;
    if(/^(0|[1-9]\d*)$/.test(text)){
      const number=Number(text);
      return Number.isSafeInteger(number)?`n:${number}`:null;
    }
    return `s:${text}`;
  };
  const idKey=value=>Identity?.key?Identity.key(value):fallbackKey(value);
  const uniqueIndex=items=>Identity?.uniqueIndex?Identity.uniqueIndex(items):(()=>{
    const map=new Map(),ambiguous=new Set();
    for(const item of items||[]){
      const key=idKey(item?.id);if(key==null||ambiguous.has(key))continue;
      if(map.has(key)){map.delete(key);ambiguous.add(key)}else map.set(key,item);
    }
    return {map,ambiguous};
  })();
  class ProfitMenteQASourceWindowGuard{
    static inspect(project,assets){
      project=project||{};assets=Array.isArray(assets)?assets:[];
      const issues=[];const assetIndex=uniqueIndex(assets);const trackIndex=uniqueIndex(project.tracks);
      const trackState=track=>{
        const key=idKey(track);if(key==null)return {};
        const read=states=>{
          if(!states||typeof states!=='object'||Array.isArray(states))return {};
          const merged={hidden:false,muted:false};
          for(const [candidate,value] of Object.entries(states)){
            if(idKey(candidate)!==key||!value||typeof value!=='object'||Array.isArray(value))continue;
            merged.hidden=merged.hidden||!!value.hidden;merged.muted=merged.muted||!!value.muted;
          }
          return merged;
        };
        const modern=read(project.trackState),legacy=read(project.trackStates);
        const declared=trackIndex.map.get(key)||{};
        return {hidden:!!(declared.hidden||modern.hidden||legacy.hidden),muted:!!(declared.muted||modern.muted||legacy.muted)};
      };
      const inactive=clip=>{const track=Number(clip?.track),s=trackState(clip?.track);return ([0,1,2,3].includes(track)&&s.hidden)||([4,5,6].includes(track)&&s.muted)};
      for(const clip of project.clips||[]){
        if(clip?.asset==null)continue;
        const assetKey=idKey(clip.asset);const label=clip.name||clip.id||'clip';
        if(assetKey==null){issues.push(`Referencia de medio inválida: ${label}`);continue}
        if(assetIndex.ambiguous.has(assetKey)){issues.push(`Referencia de medio ambigua: ${label}`);continue}
        const asset=assetIndex.map.get(assetKey);
        if(!asset){issues.push(`Medio faltante: ${label}`);continue}
        if(inactive(clip)||!['video','audio'].includes(asset.type))continue;
        const assetLabel=clip.name||asset.name||clip.id||'clip';
        const offset=clip.sourceOffset==null?0:Number(clip.sourceOffset);
        const speed=clip.speed==null?1:Number(clip.speed);
        if(!Number.isFinite(offset)||offset<0){issues.push(`Punto de entrada inválido: ${assetLabel}`);continue}
        if(!Number.isFinite(speed)||speed<0.25||speed>4){issues.push(`Velocidad fuera de rango (0.25×–4×): ${assetLabel}`);continue}
        const sourceDuration=Number(asset.duration);
        if(!Number.isFinite(sourceDuration)||sourceDuration<=0)continue;
        const needed=Math.max(0,Number(clip.duration)||0)*speed;
        if(offset>sourceDuration+.01)issues.push(`Punto de entrada fuera del archivo fuente: ${assetLabel}`);
        else if(offset+needed>sourceDuration+.15)issues.push(`Recorte supera el final del archivo fuente: ${assetLabel} · requiere ${(offset+needed).toFixed(2)}s de ${sourceDuration.toFixed(2)}s`);
      }
      return issues;
    }
    static install(Engine){
      if(!Engine?.prototype||Engine.prototype.__profitmenteSourceWindowGuard)return false;
      const original=Engine.prototype.inspect;if(typeof original!=='function')return false;
      Engine.prototype.inspect=function(project,assets){
        const result=original.call(this,project,assets)||{};
        const added=ProfitMenteQASourceWindowGuard.inspect(project,assets);
        const issues=[...(result.issues||[])];
        for(const issue of added)if(!issues.includes(issue))issues.push(issue);
        const warnings=(result.warnings||[]).filter(w=>!String(w).startsWith('Recorte supera el final del archivo fuente:'));
        return {...result,ok:issues.length===0,issues,warnings};
      };
      Engine.prototype.__profitmenteSourceWindowGuard=true;return true;
    }
  }
  root.ProfitMenteQASourceWindowGuard=ProfitMenteQASourceWindowGuard;
  let Engine=root.ProfitMenteQAEngine;
  if(!Engine&&typeof require==='function'){try{Engine=require('./qa-engine.js').ProfitMenteQAEngine}catch{}}
  if(Engine)ProfitMenteQASourceWindowGuard.install(Engine);
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteQASourceWindowGuard;
})();
