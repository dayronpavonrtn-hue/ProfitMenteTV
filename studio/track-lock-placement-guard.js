(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.ProfitMenteTrackLockPlacementGuard=api;
  if(typeof document==='undefined'||typeof project==='undefined')return;

  const baseAdd=typeof addClip==='function'?addClip:null;
  if(!baseAdd||baseAdd.__profitmenteTrackLockGuard)return;

  function status(text){if(typeof setStatus==='function')setStatus(text)}
  function guardedAddClip(track,...args){
    if(api.trackLocked(project,track)){
      status('Pista bloqueada 🔒 · desbloquéala antes de crear clips');
      return null;
    }
    return baseAdd.call(this,track,...args);
  }
  guardedAddClip.__profitmenteTrackLockGuard=true;
  guardedAddClip.__profitmenteOriginal=baseAdd;
  addClip=guardedAddClip;
  root.addClip=guardedAddClip;
  root.ProfitMenteTrackLockPlacementGuard={...api,installed:true};
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function stateValue(map,track){
    if(!map||typeof map!=='object')return null;
    const value=map[track]??map[String(track)];
    return value&&typeof value==='object'?value:null;
  }
  function states(project,track){
    return {
      current:stateValue(project?.trackState,track),
      legacy:stateValue(project?.trackStates,track)
    };
  }
  function state(project,track){
    const {current,legacy}=states(project,track);
    if(!current&&!legacy)return null;
    return {...(legacy||{}),...(current||{}),locked:!!(current?.locked||legacy?.locked)};
  }
  function trackLocked(project,track){
    const {current,legacy}=states(project,track);
    return !!(current?.locked||legacy?.locked);
  }
  function canCreate(project,track){return !trackLocked(project,track)}
  return {state,states,trackLocked,canCreate};
});
