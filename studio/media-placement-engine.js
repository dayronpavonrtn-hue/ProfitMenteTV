class ProfitMenteMediaPlacementEngine{
  static strictFinite(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string')return null;
    const raw=value.trim();if(!raw)return null;
    if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw))return null;
    const numeric=Number(raw);return Number.isFinite(numeric)?numeric:null;
  }
  static trackKey(track){
    const n=this.strictFinite(track);if(n===null||!Number.isInteger(n)||n<0||n>6)return null;
    return String(Object.is(n,-0)?0:n);
  }
  static range(project,at,duration){
    const rawTotal=this.strictFinite(project?.duration),rawAt=this.strictFinite(at),rawDuration=this.strictFinite(duration);
    const total=Math.max(.25,rawTotal??.25),start=Math.max(0,Math.min(total,rawAt??0));
    const requested=Math.max(.25,rawDuration??.25),available=Math.max(0,total-start),length=Math.min(available,requested);
    return {start,end:start+length,duration:length,total,available,valid:rawAt!==null&&rawDuration!==null&&length>=.25-.001};
  }
  static trackLocked(project,track){
    const key=this.trackKey(track);if(key===null)return false;
    const states=[project?.trackState,project?.trackStates];
    return states.some(state=>{
      if(!state||typeof state!=='object'||Array.isArray(state))return false;
      return Object.entries(state).some(([candidate,value])=>this.trackKey(candidate)===key&&!!(value&&typeof value==='object'&&!Array.isArray(value)&&value.locked===true));
    });
  }
  static clipLocked(clip){return clip?.locked===true}
  static onTrack(project,track){
    const key=this.trackKey(track);if(key===null)return [];
    return (Array.isArray(project?.clips)?project.clips:[]).filter(c=>this.trackKey(c?.track)===key);
  }
  static snapshot(project){return structuredClone(project.clips)}
  static rollback(project,snapshot){project.clips=snapshot;return false}
  static insertSpace(project,track,at,duration,ops){
    if(!project||!Array.isArray(project.clips)||!ops?.split)return {ok:false,reason:'missing-engine',shifted:0};
    if(this.trackKey(track)===null)return {ok:false,reason:'invalid-track',shifted:0};
    if(this.trackLocked(project,track))return {ok:false,reason:'locked-track',shifted:0};
    const r=this.range(project,at,duration);if(!r.valid)return {ok:false,reason:'out-of-range',shifted:0,required:.25,total:r.total,available:r.available};
    const clips=this.onTrack(project,track),after=clips.filter(c=>(this.strictFinite(c?.start)??0)>=r.start-.001),crossing=clips.find(c=>{const s=this.strictFinite(c?.start),d=this.strictFinite(c?.duration);return s!==null&&d!==null&&s<r.start-.001&&s+d>r.start+.001});
    const movable=[...after];if(crossing)movable.push(crossing);
    if(movable.some(c=>this.clipLocked(c)))return {ok:false,reason:'locked-clip',shifted:0,lockedIds:movable.filter(c=>this.clipLocked(c)).map(c=>c.id)};
    if(movable.some(c=>this.strictFinite(c?.start)===null||this.strictFinite(c?.duration)===null))return {ok:false,reason:'invalid-clip',shifted:0};
    const maxEnd=movable.reduce((m,c)=>Math.max(m,this.strictFinite(c.start)+Math.max(0,this.strictFinite(c.duration))),0);
    if(maxEnd+r.duration>r.total+.001)return {ok:false,reason:'out-of-range',shifted:0,required:maxEnd+r.duration,total:r.total};
    const before=this.snapshot(project);
    try{
      let split=null;
      if(crossing){split=ops.split(project,crossing.id,r.start,.001);if(!split){this.rollback(project,before);return {ok:false,reason:'split-failed',shifted:0}}}
      const targets=this.onTrack(project,track).filter(c=>(this.strictFinite(c?.start)??-Infinity)>=r.start-.001&&(!split||c.id!==split.left.id));
      if(targets.some(c=>this.strictFinite(c?.start)===null)){this.rollback(project,before);return {ok:false,reason:'invalid-clip',shifted:0}}
      for(const c of targets)c.start=this.strictFinite(c.start)+r.duration;
      return {ok:true,reason:null,shifted:targets.length,split:!!split,start:r.start,duration:r.duration};
    }catch(error){this.rollback(project,before);return {ok:false,reason:'operation-failed',shifted:0,error}}
  }
  static overwriteRange(project,track,at,duration,ops){
    if(!project||!Array.isArray(project.clips)||!ops?.split||!ops?.trimLeft||!ops?.trimRight)return {ok:false,reason:'missing-engine',removed:0,trimmed:0};
    if(this.trackKey(track)===null)return {ok:false,reason:'invalid-track',removed:0,trimmed:0};
    if(this.trackLocked(project,track))return {ok:false,reason:'locked-track',removed:0,trimmed:0};
    const r=this.range(project,at,duration);if(!r.valid)return {ok:false,reason:'out-of-range',removed:0,trimmed:0,total:r.total,available:r.available};
    const affected=this.onTrack(project,track).filter(c=>{const s=this.strictFinite(c?.start),d=this.strictFinite(c?.duration);return s!==null&&d!==null&&s<r.end-.001&&s+d>r.start+.001});
    if(affected.some(c=>this.strictFinite(c?.start)===null||this.strictFinite(c?.duration)===null))return {ok:false,reason:'invalid-clip',removed:0,trimmed:0};
    const locked=affected.filter(c=>this.clipLocked(c));if(locked.length)return {ok:false,reason:'locked-clip',removed:0,trimmed:0,lockedIds:locked.map(c=>c.id)};
    const ids=affected.map(c=>c.id),before=this.snapshot(project);
    let removed=0,trimmed=0,splitCount=0;
    const remove=id=>{const index=project.clips.findIndex(c=>c.id===id);if(index<0)return false;project.clips.splice(index,1);removed++;return true};
    const fail=reason=>{this.rollback(project,before);return {ok:false,reason,removed:0,trimmed:0,split:0}};
    try{
      for(const id of ids){
        const c=project.clips.find(x=>x.id===id);if(!c)continue;const s=this.strictFinite(c.start),d=this.strictFinite(c.duration);if(s===null||d===null)return fail('invalid-clip');const e=s+d;
        const left=s<r.start-.001,right=e>r.end+.001;
        if(left&&right){
          const endSplit=ops.split(project,id,r.end,.001);if(!endSplit)return fail('split-failed');splitCount++;
          const startSplit=ops.split(project,endSplit.left.id,r.start,.001);if(!startSplit)return fail('split-failed');splitCount++;
          if(!remove(startSplit.right.id))return fail('operation-failed');continue;
        }
        if(left){const remain=r.start-s;if(remain<.25-.001){if(!remove(id))return fail('operation-failed')}else if(ops.trimRight(project,id,r.start)){trimmed++}else return fail('trim-failed');continue}
        if(right){const remain=e-r.end;if(remain<.25-.001){if(!remove(id))return fail('operation-failed')}else if(ops.trimLeft(project,id,r.end)){trimmed++}else return fail('trim-failed');continue}
        if(!remove(id))return fail('operation-failed');
      }
      return {ok:true,reason:null,removed,trimmed,split:splitCount,start:r.start,end:r.end,duration:r.duration};
    }catch(error){this.rollback(project,before);return {ok:false,reason:'operation-failed',removed:0,trimmed:0,split:0,error}}
  }
}
if(typeof window!=='undefined')window.ProfitMenteMediaPlacementEngine=ProfitMenteMediaPlacementEngine;
if(typeof globalThis!=='undefined')globalThis.ProfitMenteMediaPlacementEngine=ProfitMenteMediaPlacementEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteMediaPlacementEngine;
