(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteClipLockEngine{
    canonicalTrackKey(value){
      if(value===null||value===undefined)return null;
      const raw=String(value).trim();
      if(!raw)return null;
      const n=Number(raw);
      return Number.isFinite(n)&&Number.isInteger(n)&&n>=0&&n<=6?String(n):null;
    }
    trackLocked(project,clip){
      const track=clip?.track;
      if(track===null||track===undefined)return false;
      const raw=String(track).trim();
      if(!raw)return false;
      const canonical=this.canonicalTrackKey(track);
      const states=[project?.trackState,project?.trackStates].filter(v=>v&&typeof v==='object');
      for(const state of states){
        if(state[raw]?.locked)return true;
        if(canonical&&state[canonical]?.locked)return true;
        if(canonical){
          for(const [key,value] of Object.entries(state)){
            if(value?.locked&&this.canonicalTrackKey(key)===canonical)return true;
          }
        }
      }
      return false;
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
