(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteQALegacyTrackStateGuard{
    static mergeTrackState(project){
      const current=project?.trackState&&typeof project.trackState==='object'?project.trackState:{};
      const legacy=project?.trackStates&&typeof project.trackStates==='object'?project.trackStates:{};
      const merged={};
      const keys=new Set([...Object.keys(legacy),...Object.keys(current)]);
      for(const key of keys){
        const a=legacy[key]&&typeof legacy[key]==='object'?legacy[key]:{};
        const b=current[key]&&typeof current[key]==='object'?current[key]:{};
        merged[key]={...a,...b};
        for(const flag of ['hidden','muted','locked','solo']){
          if(a[flag]===true||b[flag]===true)merged[key][flag]=true;
        }
      }
      return merged;
    }
    static normalize(project){
      if(!project||typeof project!=='object')return project;
      return {...project,trackState:this.mergeTrackState(project)};
    }
    static install(){
      const QA=root.ProfitMenteQAEngine;
      if(!QA?.prototype||QA.prototype.__profitmenteLegacyTrackStateGuard)return false;
      const original=QA.prototype.inspect;
      if(typeof original!=='function')return false;
      QA.prototype.inspect=function(project,assets){
        return original.call(this,ProfitMenteQALegacyTrackStateGuard.normalize(project),assets);
      };
      QA.prototype.__profitmenteLegacyTrackStateGuard=true;
      return true;
    }
  }
  root.ProfitMenteQALegacyTrackStateGuard=ProfitMenteQALegacyTrackStateGuard;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteQALegacyTrackStateGuard;
  ProfitMenteQALegacyTrackStateGuard.install();
})();
