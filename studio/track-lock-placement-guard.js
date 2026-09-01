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
  function state(project,track){
    const states=project?.trackState||project?.trackStates;
    if(!states||typeof states!=='object')return null;
    return states[track]??states[String(track)]??null;
  }
  function trackLocked(project,track){return !!state(project,track)?.locked}
  function canCreate(project,track){return !trackLocked(project,track)}
  return {state,trackLocked,canCreate};
});
