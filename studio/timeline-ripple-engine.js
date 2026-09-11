(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ProfitMenteTimelineRippleEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const EPS=1e-6;
  function scalarNumber(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string'||!value.trim())return null;
    const n=Number(value);
    return Number.isFinite(n)?n:null;
  }
  function idKey(value){
    if(value===null||value===undefined||typeof value==='boolean'||(typeof value!=='string'&&typeof value!=='number'))return null;
    const text=String(value).trim();
    if(!text)return null;
    if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(text)){
      const n=Number(text);if(Number.isFinite(n))return `n:${Object.is(n,-0)?0:n}`;
    }
    return `s:${text}`;
  }
  function sameId(a,b){const x=idKey(a),y=idKey(b);return x!==null&&x===y}
  function trackKey(value){
    const n=scalarNumber(value);
    return Number.isInteger(n)&&n>=0?String(n):null;
  }
  function locked(project,track){
    const key=trackKey(track);if(key===null)return true;
    const state=project&&project.trackState&&typeof project.trackState==='object'?project.trackState:{};
    for(const [candidate,meta] of Object.entries(state)){
      if(trackKey(candidate)===key&&meta&&meta.locked===true)return true;
    }
    return false;
  }
  function windowOf(clip){
    const start=scalarNumber(clip&&clip.start),duration=scalarNumber(clip&&clip.duration);
    return start!==null&&start>=0&&duration!==null&&duration>0?{start,duration,end:start+duration}:null;
  }
  function previousEnd(clips,track,beforeStart,excludeId){
    let end=0;
    for(const clip of clips){
      if(!clip||sameId(clip.id,excludeId)||trackKey(clip.track)!==track)continue;
      const w=windowOf(clip);if(!w||w.start>=beforeStart-EPS)continue;
      end=Math.max(end,w.end);
    }
    return end;
  }
  function rippleDelete(project,clipId,options={}){
    if(!project||!Array.isArray(project.clips))return {changed:false,reason:'invalid-project',shifted:0};
    const index=project.clips.findIndex(c=>c&&sameId(c.id,clipId));
    if(index<0)return {changed:false,reason:'missing-clip',shifted:0};
    const target=project.clips[index],track=trackKey(target.track),w=windowOf(target);
    if(track===null||!w)return {changed:false,reason:'invalid-clip',shifted:0};
    if(locked(project,target.track))return {changed:false,reason:'locked-track',shifted:0};
    const allTracks=options.scope==='all';
    const affectedTracks=new Set(allTracks?project.clips.map(c=>trackKey(c&&c.track)).filter(Boolean):[track]);
    for(const key of [...affectedTracks]){
      if(locked(project,key))affectedTracks.delete(key);
    }
    const source=project.clips;
    const priorEnd=previousEnd(source,track,w.start,target.id);
    const removableGap=Math.max(0,w.end-Math.max(priorEnd,w.start));
    const delta=Math.min(w.duration,removableGap||w.duration);
    const next=[];let shifted=0;
    for(let i=0;i<source.length;i++){
      const clip=source[i];
      if(i===index)continue;
      const key=trackKey(clip&&clip.track),cw=windowOf(clip);
      if(!cw||!affectedTracks.has(key)||cw.start<w.end-EPS){next.push(clip);continue}
      const floor=allTracks?0:priorEnd;
      const newStart=Math.max(floor,cw.start-delta);
      if(Math.abs(newStart-cw.start)>EPS){clip.start=Number(newStart.toFixed(6));shifted++}
      next.push(clip);
    }
    project.clips=next;
    return {changed:true,deletedId:target.id,track:Number(track),delta,shifted,scope:allTracks?'all':'track'};
  }
  return {rippleDelete,windowOf,trackKey,idKey,sameId,locked};
});
