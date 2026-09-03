(()=>{
  const Engine=globalThis.ProfitMenteGeneratorEngine;
  if(!Engine?.prototype)return;

  const canonicalTrack=value=>{
    const raw=String(value??'').trim();
    if(!raw)return null;
    const n=Number(raw);
    return Number.isInteger(n)&&n>=0&&n<=6?n:null;
  };

  const originalTrackLocked=Engine.prototype.trackLocked;
  Engine.prototype.trackLocked=function(project,track){
    if(typeof originalTrackLocked==='function'&&originalTrackLocked.call(this,project,track))return true;
    const target=canonicalTrack(track);
    if(target===null)return false;
    for(const map of [project?.trackState,project?.trackStates]){
      if(!map||typeof map!=='object')continue;
      for(const [key,state] of Object.entries(map)){
        if(canonicalTrack(key)===target&&state&&typeof state==='object'&&state.locked)return true;
      }
    }
    return false;
  };

  const originalClipLocked=Engine.prototype.clipLocked;
  Engine.prototype.clipLocked=function(project,clip){
    const locked=(typeof originalClipLocked==='function'&&originalClipLocked.call(this,project,clip))||this.trackLocked(project,clip?.track)||!!clip?.locked;
    const normalized=canonicalTrack(clip?.track);
    if(locked&&clip&&normalized!==null)clip.track=normalized;
    return !!locked;
  };

  globalThis.ProfitMenteGeneratorTrackAliasGuard={canonicalTrack};
})();