class ProfitMenteMediaPlacementEngine{
  static range(project,at,duration){
    const total=Math.max(.25,Number(project?.duration)||.25),start=Math.max(0,Math.min(total,Number(at)||0));
    const requested=Math.max(.25,Number(duration)||.25),available=Math.max(0,total-start),length=Math.min(available,requested);
    return {start,end:start+length,duration:length,total,available,valid:length>=.25-.001};
  }
  static trackLocked(project,track){
    const states=[project?.trackState,project?.trackStates];
    return states.some(state=>{
      if(!state||typeof state!=='object')return false;
      const value=state[track]??state[String(track)];
      return !!(value&&typeof value==='object'&&value.locked);
    });
  }
  static clipLocked(clip){return !!clip?.locked}
  static onTrack(project,track){return (project?.clips||[]).filter(c=>Number(c?.track)===Number(track))}
  static insertSpace(project,track,at,duration,ops){
    if(!project||!Array.isArray(project.clips)||!ops?.split)return {ok:false,reason:'missing-engine',shifted:0};
    if(this.trackLocked(project,track))return {ok:false,reason:'locked-track',shifted:0};
    const r=this.range(project,at,duration);if(!r.valid)return {ok:false,reason:'out-of-range',shifted:0,required:.25,total:r.total,available:r.available};
    const clips=this.onTrack(project,track),after=clips.filter(c=>(Number(c.start)||0)>=r.start-.001),crossing=clips.find(c=>(Number(c.start)||0)<r.start-.001&&(Number(c.start)||0)+(Number(c.duration)||0)>r.start+.001);
    const movable=[...after];if(crossing)movable.push(crossing);
    if(movable.some(c=>this.clipLocked(c)))return {ok:false,reason:'locked-clip',shifted:0,lockedIds:movable.filter(c=>this.clipLocked(c)).map(c=>c.id)};
    const maxEnd=movable.reduce((m,c)=>Math.max(m,(Number(c.start)||0)+(Number(c.duration)||0)),0);
    if(maxEnd+r.duration>r.total+.001)return {ok:false,reason:'out-of-range',shifted:0,required:maxEnd+r.duration,total:r.total};
    let split=null;
    if(crossing){split=ops.split(project,crossing.id,r.start,.001);if(!split)return {ok:false,reason:'split-failed',shifted:0};}
    const targets=this.onTrack(project,track).filter(c=>(Number(c.start)||0)>=r.start-.001&&(!split||c.id!==split.left.id));
    for(const c of targets)c.start=(Number(c.start)||0)+r.duration;
    return {ok:true,reason:null,shifted:targets.length,split:!!split,start:r.start,duration:r.duration};
  }
  static overwriteRange(project,track,at,duration,ops){
    if(!project||!Array.isArray(project.clips)||!ops?.split||!ops?.trimLeft||!ops?.trimRight)return {ok:false,reason:'missing-engine',removed:0,trimmed:0};
    if(this.trackLocked(project,track))return {ok:false,reason:'locked-track',removed:0,trimmed:0};
    const r=this.range(project,at,duration);if(!r.valid)return {ok:false,reason:'out-of-range',removed:0,trimmed:0,total:r.total,available:r.available};
    const affected=this.onTrack(project,track).filter(c=>{const s=Number(c.start)||0,e=s+(Number(c.duration)||0);return s<r.end-.001&&e>r.start+.001});
    const locked=affected.filter(c=>this.clipLocked(c));if(locked.length)return {ok:false,reason:'locked-clip',removed:0,trimmed:0,lockedIds:locked.map(c=>c.id)};
    const ids=affected.map(c=>c.id);
    let removed=0,trimmed=0,splitCount=0;
    const remove=id=>{const before=project.clips.length;project.clips=project.clips.filter(c=>c.id!==id);if(project.clips.length<before)removed++};
    for(const id of ids){
      const c=project.clips.find(x=>x.id===id);if(!c)continue;const s=Number(c.start)||0,e=s+(Number(c.duration)||0);
      const left=s<r.start-.001,right=e>r.end+.001;
      if(left&&right){
        const endSplit=ops.split(project,id,r.end,.001);if(!endSplit){remove(id);continue}splitCount++;
        const startSplit=ops.split(project,endSplit.left.id,r.start,.001);if(!startSplit){remove(endSplit.left.id);continue}splitCount++;
        remove(startSplit.right.id);continue;
      }
      if(left){const remain=r.start-s;if(remain<.25-.001)remove(id);else if(ops.trimRight(project,id,r.start)){trimmed++}else remove(id);continue}
      if(right){const remain=e-r.end;if(remain<.25-.001)remove(id);else if(ops.trimLeft(project,id,r.end)){trimmed++}else remove(id);continue}
      remove(id);
    }
    return {ok:true,reason:null,removed,trimmed,split:splitCount,start:r.start,end:r.end,duration:r.duration};
  }
}
if(typeof window!=='undefined')window.ProfitMenteMediaPlacementEngine=ProfitMenteMediaPlacementEngine;
if(typeof globalThis!=='undefined')globalThis.ProfitMenteMediaPlacementEngine=ProfitMenteMediaPlacementEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteMediaPlacementEngine;
