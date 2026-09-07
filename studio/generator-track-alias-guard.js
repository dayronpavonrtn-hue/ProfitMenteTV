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

  Engine.prototype.trackLocked=function(project,track){
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

  Engine.prototype.clipLocked=function(project,clip){
    if(!clip||typeof clip!=='object'||Array.isArray(clip))return false;
    const locked=clip.locked===true||this.trackLocked(project,clip.track);
    const normalized=canonicalTrack(clip.track);
    if(locked&&normalized!==null)clip.track=normalized;
    return locked;
  };

  globalThis.ProfitMenteGeneratorTrackAliasGuard={canonicalTrack};
})();
