(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteEditLockGuard{
    static clipLocked(clip){return !!clip?.locked}
    static trackLocked(project,clip){
      const track=clip?.track,state=project?.trackState?.[track]??project?.trackState?.[String(track)]??{};
      return !!(state&&typeof state==='object'&&state.locked);
    }
    static isLocked(project,clip){return !!clip&&(this.clipLocked(clip)||this.trackLocked(project,clip))}
    static anyLocked(project,clips){return (clips||[]).some(c=>this.isLocked(project,c))}
  }
  root.ProfitMenteEditLockGuard=ProfitMenteEditLockGuard;
  if(typeof module!=='undefined')module.exports={ProfitMenteEditLockGuard};
})();
