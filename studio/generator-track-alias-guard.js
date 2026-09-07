(()=>{
  const Engine=globalThis.ProfitMenteGeneratorEngine;
  if(!Engine?.prototype)return;

  const scalarText=value=>{
    if(typeof value==='number')return Number.isFinite(value)?String(value):null;
    if(typeof value!=='string')return null;
    const raw=value.trim();
    return raw||null;
  };
  const canonicalTrack=value=>{
    const raw=scalarText(value);
    if(raw===null)return null;
    const n=Number(raw);
    return Number.isInteger(n)&&n>=0&&n<=6?(Object.is(n,-0)?0:n):null;
  };

  const originalTrackLocked=Engine.prototype.trackLocked;
  Engine.prototype.trackLocked=function(project,track){
    if(typeof originalTrackLocked==='function'&&originalTrackLocked.call(this,project,track))return true;
    const target=canonicalTrack(track);
    if(target===null)return false;
    for(const map of [project?.trackState,project?.trackStates]){
      if(!map||typeof map!=='object'||Array.isArray(map))continue;
      for(const [key,state] of Object.entries(map)){
        if(canonicalTrack(key)===target&&state&&typeof state==='object'&&!Array.isArray(state)&&state.locked===true)return true;
      }
    }
    return false;
  };

  const originalClipLocked=Engine.prototype.clipLocked;
  Engine.prototype.clipLocked=function(project,clip){
    const locked=(typeof originalClipLocked==='function'&&originalClipLocked.call(this,project,clip))||this.trackLocked(project,clip?.track)||clip?.locked===true;
    const normalized=canonicalTrack(clip?.track);
    if(locked&&clip&&normalized!==null)clip.track=normalized;
    return !!locked;
  };

  globalThis.ProfitMenteGeneratorTrackAliasGuard={canonicalTrack};
})();
