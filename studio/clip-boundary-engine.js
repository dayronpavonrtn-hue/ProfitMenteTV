(function(root){
  'use strict';
  function finite(value,fallback){
    if(typeof value==='boolean'||value===null||value==='')return fallback;
    const n=Number(value);
    return Number.isFinite(n)?n:fallback;
  }
  function normalizeClipWindow(start,duration,projectDuration,minDuration=.25){
    const total=Math.max(minDuration,finite(projectDuration,minDuration));
    const safeStart=Math.max(0,Math.min(total,finite(start,0)));
    const remaining=Math.max(0,total-safeStart);
    if(remaining<minDuration){
      return {start:Math.max(0,total-minDuration),duration:Math.min(minDuration,total)};
    }
    const safeDuration=Math.max(minDuration,Math.min(remaining,finite(duration,minDuration)));
    return {start:safeStart,duration:safeDuration};
  }
  const api={normalizeClipWindow};
  root.ProfitMenteClipBoundaryEngine=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
