(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteEditLockGuard{
    static canonicalTrack(value){
      if(value===undefined||value===null)return null;
      if(typeof value==='string'&&!value.trim())return null;
      const n=Number(value);
      if(!Number.isFinite(n)||!Number.isInteger(n)||n<0||n>6)return null;
      return String(n);
    }
    static clipLocked(clip){return !!clip?.locked}
    static trackLocked(project,clip){
      const canonical=this.canonicalTrack(clip?.track);
      if(canonical===null)return false;
      const maps=[project?.trackState,project?.trackStates];
      return maps.some(map=>{
        if(!map||typeof map!=='object')return false;
        return Object.entries(map).some(([key,state])=>
          this.canonicalTrack(key)===canonical&&!!(state&&typeof state==='object'&&state.locked)
        );
      });
    }
    static isLocked(project,clip){return !!clip&&(this.clipLocked(clip)||this.trackLocked(project,clip))}
    static anyLocked(project,clips){return (clips||[]).some(c=>this.isLocked(project,c))}
  }
  root.ProfitMenteEditLockGuard=ProfitMenteEditLockGuard;
  if(typeof module!=='undefined')module.exports={ProfitMenteEditLockGuard};
})();
