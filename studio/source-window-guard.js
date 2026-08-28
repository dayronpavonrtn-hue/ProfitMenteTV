(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteSourceWindowGuard{
    static trackState(project,track){const state=project?.trackState?.[track]??project?.trackState?.[String(track)]??{};return state&&typeof state==='object'?state:{}}
    static disabled(project,clip){const track=Number(clip?.track),state=this.trackState(project,track);return ([0,1,2,3].includes(track)&&!!state.hidden)||([4,5,6].includes(track)&&!!state.muted)}
    static relevant(clip,asset){const track=Number(clip?.track);return !!asset?.duration&&['video','audio'].includes(asset.type)&&([4,5,6].includes(track)||([0,1].includes(track)&&asset.type==='video'))}
    static inspect(project,assets=[]){
      const byId=new Map((assets||[]).filter(a=>a?.id).map(a=>[a.id,a])),violations=[];
      for(const clip of project?.clips||[]){
        if(!clip||this.disabled(project,clip)||!clip.asset)continue;
        const asset=byId.get(clip.asset);if(!this.relevant(clip,asset))continue;
        const native=Math.max(0,Number(asset.duration)||0),speed=Math.max(.25,Math.min(4,Number(clip.speed)||1)),offset=Math.max(0,Number(clip.sourceOffset)||0),timelineDuration=Math.max(0,Number(clip.duration)||0),needed=timelineDuration*speed,end=offset+needed;
        if(offset>native+.01||end>native+.15)violations.push({clip,asset,native,speed,offset,needed,end,canShift:needed<=native+.01});
      }
      return violations;
    }
    static message(v){return `Fuente insuficiente para render: ${v.clip.name||v.asset.name||v.clip.id} · necesita ${v.end.toFixed(2)}s de ${v.native.toFixed(2)}s${v.canShift?' · Reparar seguro puede recolocar el punto de entrada':' · reduce duración/velocidad o usa un medio más largo'}`}
    static repair(project,assets=[]){
      let changed=0;const shifted=[],unresolved=[];
      for(const v of this.inspect(project,assets)){
        if(!v.canShift){unresolved.push(v);continue}
        const next=Math.max(0,v.native-v.needed);
        if(Math.abs((Number(v.clip.sourceOffset)||0)-next)>.001){v.clip.sourceOffset=Number(next.toFixed(3));changed++;shifted.push(v.clip.id)}
      }
      return {changed,shifted,unresolved};
    }
    static patchQA(){
      const QA=root.ProfitMenteQAEngine;if(!QA?.prototype||QA.prototype.__sourceWindowGuard)return false;
      const original=QA.prototype.inspect;
      QA.prototype.inspect=function(project,assets){
        const result=original.call(this,project,assets),violations=ProfitMenteSourceWindowGuard.inspect(project,assets);
        result.warnings=(result.warnings||[]).filter(x=>!String(x).startsWith('Recorte supera el final del archivo fuente:'));
        result.issues=result.issues||[];
        for(const v of violations){const msg=ProfitMenteSourceWindowGuard.message(v);if(!result.issues.includes(msg))result.issues.push(msg)}
        result.ok=result.issues.length===0;
        if(violations.length)result.score=Math.max(0,Number(result.score||0)-violations.length*18);
        result.metrics=result.metrics||{};result.metrics.sourceWindowViolations=violations.length;
        return result;
      };
      QA.prototype.__sourceWindowGuard=true;return true;
    }
    static patchAutofix(){
      const Fix=root.ProfitMenteQAAutofix;if(!Fix||Fix.__sourceWindowGuard)return false;
      const original=Fix.repair.bind(Fix);
      Fix.repair=function(project,assets=[]){
        const base=original(project,assets),source=ProfitMenteSourceWindowGuard.repair(project,assets);
        return {...base,changed:(Number(base.changed)||0)+source.changed,sourceWindow:source,fixes:[...(base.fixes||[]),...(source.changed?['Puntos de entrada recolocados para caber en el archivo fuente']:[])]};
      };
      Fix.__sourceWindowGuard=true;return true;
    }
  }
  root.ProfitMenteSourceWindowGuard=ProfitMenteSourceWindowGuard;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteSourceWindowGuard;
  if(typeof document==='undefined')return;
  ProfitMenteSourceWindowGuard.patchQA();ProfitMenteSourceWindowGuard.patchAutofix();
})();
