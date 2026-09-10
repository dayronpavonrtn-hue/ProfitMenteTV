(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  const Ops=root.ProfitMenteTimelineOperations;
  if(!Ops?.prototype||Ops.prototype.__profitmenteWordTimingSync)return;

  const strictNumber=value=>{
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string')return null;
    const text=value.trim();
    if(!text)return null;
    const n=Number(text);
    return Number.isFinite(n)?n:null;
  };
  const snapshotStarts=project=>new Map(
    (Array.isArray(project?.clips)?project.clips:[])
      .filter(clip=>clip&&clip.id!==undefined&&strictNumber(clip.start)!==null)
      .map(clip=>[String(clip.id),strictNumber(clip.start)])
  );
  const shiftWordTimings=(clip,delta)=>{
    if(!Array.isArray(clip?.wordTimings)||Math.abs(delta)<.000001)return 0;
    let shifted=0;
    for(const word of clip.wordTimings){
      if(!word||typeof word!=='object')continue;
      const start=strictNumber(word.start),end=strictNumber(word.end);
      let changed=false;
      if(start!==null){word.start=Math.max(0,start+delta);changed=true}
      if(end!==null){word.end=Math.max(0,end+delta);changed=true}
      if(changed){
        const nextStart=strictNumber(word.start),nextEnd=strictNumber(word.end);
        if(nextStart!==null&&nextEnd!==null)word.duration=Math.max(0,nextEnd-nextStart);
        shifted++;
      }
    }
    return shifted;
  };
  const syncMovedClips=(project,before)=>{
    let clipsShifted=0,wordsShifted=0;
    for(const clip of Array.isArray(project?.clips)?project.clips:[]){
      if(!clip||clip.id===undefined)continue;
      const previous=before.get(String(clip.id)),current=strictNumber(clip.start);
      if(previous===undefined||current===null)continue;
      const delta=current-previous;
      if(Math.abs(delta)<.000001)continue;
      clipsShifted++;
      wordsShifted+=shiftWordTimings(clip,delta);
    }
    return {clipsShifted,wordsShifted};
  };

  const baseRippleDelete=Ops.prototype.rippleDelete;
  const baseCloseGaps=Ops.prototype.closeGaps;
  if(typeof baseRippleDelete!=='function'||typeof baseCloseGaps!=='function')return;
  Object.defineProperty(Ops.prototype,'__profitmenteWordTimingSync',{value:true,configurable:false});

  Ops.prototype.rippleDelete=function(project,id){
    const before=snapshotStarts(project);
    const result=baseRippleDelete.call(this,project,id);
    if(!result)return result;
    syncMovedClips(project,before);
    return result;
  };

  Ops.prototype.closeGaps=function(project,track){
    const before=snapshotStarts(project);
    const result=baseCloseGaps.call(this,project,track);
    if(!result)return result;
    syncMovedClips(project,before);
    return result;
  };

  root.ProfitMenteTimelineWordTimingSync={syncMovedClips,shiftWordTimings};
})();
