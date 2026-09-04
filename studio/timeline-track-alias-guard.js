(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  const Ops=root.ProfitMenteTimelineOperations;
  if(!Ops||Ops.prototype.__profitMenteTrackAliasGuard)return;
  const proto=Ops.prototype;
  const canonicalTrack=value=>{
    if(value===undefined||value===null||String(value).trim()==='')return null;
    const n=Number(value);
    return Number.isFinite(n)&&Number.isInteger(n)&&n>=0&&n<=6?n:null;
  };
  const normalizeProjectTracks=project=>{
    if(!project||!Array.isArray(project.clips))return project;
    for(const clip of project.clips){
      if(!clip||typeof clip!=='object')continue;
      const track=canonicalTrack(clip.track);
      if(track!==null)clip.track=track;
    }
    return project;
  };
  const stateLocked=(states,track)=>{
    if(!states||typeof states!=='object')return false;
    const target=canonicalTrack(track);
    if(target===null)return false;
    return Object.entries(states).some(([key,state])=>canonicalTrack(key)===target&&state&&typeof state==='object'&&state.locked===true);
  };
  proto.trackLocked=function(project,track){
    return stateLocked(project?.trackState,track)||stateLocked(project?.trackStates,track);
  };
  const wrapNormalize=name=>{
    const original=proto[name];
    if(typeof original!=='function')return;
    proto[name]=function(project,...args){
      normalizeProjectTracks(project);
      const result=original.call(this,project,...args);
      normalizeProjectTracks(project);
      return result;
    };
  };
  ['paste','trimLeft','trimRight','split','rippleDelete','closeGaps','insertGap','insertTime'].forEach(wrapNormalize);
  proto.__profitMenteTrackAliasGuard=true;
  root.ProfitMenteTimelineTrackAliasGuard={canonicalTrack,normalizeProjectTracks,stateLocked};
  if(typeof module!=='undefined'&&module.exports)module.exports={canonicalTrack,normalizeProjectTracks,stateLocked};
})();
