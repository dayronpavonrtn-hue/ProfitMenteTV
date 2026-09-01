(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteEditLockGuard{
    static clipLocked(clip){return !!clip?.locked}
    static trackLocked(project,clip){
      const track=clip?.track;
      if(track===undefined||track===null)return false;
      const keys=[track,String(track)];
      const maps=[project?.trackState,project?.trackStates];
      return maps.some(map=>map&&keys.some(key=>{
        const state=map[key];
        return !!(state&&typeof state==='object'&&state.locked);
      }));
    }
    static isLocked(project,clip){return !!clip&&(this.clipLocked(clip)||this.trackLocked(project,clip))}
    static anyLocked(project,clips){return (clips||[]).some(c=>this.isLocked(project,c))}
  }
  root.ProfitMenteEditLockGuard=ProfitMenteEditLockGuard;
  if(typeof module!=='undefined')module.exports={ProfitMenteEditLockGuard};
})();
