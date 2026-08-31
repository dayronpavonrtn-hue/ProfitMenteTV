(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteClipLockEngine{
    trackLocked(project,clip){
      const track=clip?.track;
      return !!project?.trackState?.[track]?.locked||!!project?.trackState?.[String(track)]?.locked;
    }
    clipLocked(clip){return !!clip?.locked}
    isLocked(project,clip){return this.clipLocked(clip)||this.trackLocked(project,clip)}
    setLocked(clip,value=true){if(!clip)return false;clip.locked=!!value;return clip.locked}
    toggle(clip){return this.setLocked(clip,!this.clipLocked(clip))}
    groupMembers(project,anchor){
      const clips=Array.isArray(project?.clips)?project.clips:[];
      if(!anchor)return [];
      const groupId=String(anchor.groupId||'').trim();
      return groupId?clips.filter(c=>String(c.groupId||'').trim()===groupId):[anchor];
    }
    lockedMembers(project,anchor){return this.groupMembers(project,anchor).filter(c=>this.isLocked(project,c))}
    canMutate(project,anchor){return !!anchor&&!this.lockedMembers(project,anchor).length}
  }
  root.ProfitMenteClipLockEngine=ProfitMenteClipLockEngine;
  if(typeof module!=='undefined')module.exports={ProfitMenteClipLockEngine};
})();
