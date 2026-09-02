(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteQASourceWindowGuard{
    static inspect(project,assets){
      project=project||{};assets=Array.isArray(assets)?assets:[];
      const issues=[];const byId=new Map(assets.map(a=>[a?.id,a]));
      const trackState=track=>{
        const read=states=>{const value=states?.[track]??states?.[String(track)]??{};return value&&typeof value==='object'?value:{}};
        const modern=read(project.trackState),legacy=read(project.trackStates);
        return {hidden:!!(modern.hidden||legacy.hidden),muted:!!(modern.muted||legacy.muted)};
      };
      const inactive=clip=>{const track=Number(clip?.track),s=trackState(track);return ([0,1,2,3].includes(track)&&s.hidden)||([4,5,6].includes(track)&&s.muted)};
      for(const clip of project.clips||[]){
        if(inactive(clip)||!clip?.asset)continue;
        const asset=byId.get(clip.asset);if(!asset||!['video','audio'].includes(asset.type))continue;
        const label=clip.name||asset.name||clip.id||'clip';
        const offset=clip.sourceOffset==null?0:Number(clip.sourceOffset);
        const speed=clip.speed==null?1:Number(clip.speed);
        if(!Number.isFinite(offset)||offset<0){issues.push(`Punto de entrada inválido: ${label}`);continue}
        if(!Number.isFinite(speed)||speed<0.25||speed>4){issues.push(`Velocidad fuera de rango (0.25×–4×): ${label}`);continue}
        const sourceDuration=Number(asset.duration);
        if(!Number.isFinite(sourceDuration)||sourceDuration<=0)continue;
        const needed=Math.max(0,Number(clip.duration)||0)*speed;
        if(offset>sourceDuration+.01)issues.push(`Punto de entrada fuera del archivo fuente: ${label}`);
        else if(offset+needed>sourceDuration+.15)issues.push(`Recorte supera el final del archivo fuente: ${label} · requiere ${(offset+needed).toFixed(2)}s de ${sourceDuration.toFixed(2)}s`);
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
