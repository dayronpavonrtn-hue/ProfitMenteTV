(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports){module.exports=api;return}
  root.ProfitMenteFrameNudgeEngine=api.ProfitMenteFrameNudgeEngine;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  class ProfitMenteFrameNudgeEngine{
    static finiteNumber(value,fallback=null){
      if(typeof value==='number')return Number.isFinite(value)?value:fallback;
      if(typeof value==='string'&&value.trim()!==''){
        const n=Number(value);return Number.isFinite(n)?n:fallback;
      }
      return fallback;
    }
    static scalarId(value){
      if(typeof value==='string')return value;
      if(typeof value==='number'&&Number.isFinite(value))return Object.is(value,-0)?'0':String(value);
      return null;
    }
    static fps(project){
      const raw=this.finiteNumber(project?.fps,null);
      if(raw===null)return 30;
      const n=Math.round(raw);return [24,30,60].includes(n)?n:30;
    }
    static frame(project){return 1/this.fps(project)}
    static canonicalTrack(value){
      const n=this.finiteNumber(value,null);
      return n!==null&&Number.isInteger(n)&&n>=0&&n<=6?String(Object.is(n,-0)?0:n):null;
    }
    static locked(project,clip){
      if(clip?.locked===true)return true;
      const canonical=this.canonicalTrack(clip?.track);if(canonical===null)return false;
      const maps=[project?.trackState,project?.trackStates];
      return maps.some(map=>map&&typeof map==='object'&&!Array.isArray(map)&&Object.entries(map).some(([key,state])=>this.canonicalTrack(key)===canonical&&state?.locked===true));
    }
    static members(project,clipId){
      const clips=Array.isArray(project?.clips)?project.clips:[],wanted=this.scalarId(clipId);if(wanted===null)return [];
      const matches=clips.filter(c=>this.scalarId(c?.id)===wanted);if(matches.length!==1)return [];
      const seed=matches[0],gid=this.scalarId(seed.groupId);
      return gid!==null&&gid.trim()!==''?clips.filter(c=>this.scalarId(c?.groupId)===gid):[seed];
    }
    static selectedMembers(project,clipIds){
      const clips=Array.isArray(project?.clips)?project.clips:[];
      if(!Array.isArray(clipIds)||!clipIds.length)return {ok:false,reason:'missing',members:[]};
      const wanted=[];
      for(const raw of clipIds){const id=this.scalarId(raw);if(id===null)return {ok:false,reason:'invalid_id',members:[]};if(!wanted.includes(id))wanted.push(id)}
      const seeds=[];
      for(const id of wanted){const matches=clips.filter(c=>this.scalarId(c?.id)===id);if(matches.length>1)return {ok:false,reason:'ambiguous_id',members:[]};if(matches.length===1)seeds.push(matches[0])}
      if(!seeds.length)return {ok:false,reason:'missing',members:[]};
      const expanded=[];
      for(const seed of seeds){
        const gid=this.scalarId(seed.groupId),grouped=gid!==null&&gid.trim()!==''?clips.filter(c=>this.scalarId(c?.groupId)===gid):[seed];
        for(const clip of grouped)if(!expanded.includes(clip))expanded.push(clip);
      }
      return {ok:true,reason:'ok',members:expanded};
    }
    static bounds(project,members){
      if(!members.length)return null;let start=Infinity,end=-Infinity;
      for(const c of members){
        const rawStart=this.finiteNumber(c?.start,null),rawDuration=this.finiteNumber(c?.duration,null);
        if(rawStart===null||rawDuration===null||rawStart<0||rawDuration<0)return null;
        start=Math.min(start,rawStart);end=Math.max(end,rawStart+rawDuration);
      }
      return Number.isFinite(start)&&Number.isFinite(end)?{start,end}:null;
    }
    static selectionDelta(project,clipIds,frames){
      const pick=this.selectedMembers(project,clipIds);if(!pick.ok)return {...pick,delta:0,appliedFrames:0};
      const members=pick.members;
      if(members.some(c=>this.locked(project,c)))return {ok:false,reason:'locked',delta:0,members,appliedFrames:0};
      const countRaw=this.finiteNumber(frames,null);
      if(countRaw===null||!Number.isInteger(countRaw))return {ok:false,reason:'invalid_frames',delta:0,members,appliedFrames:0};
      const count=countRaw;if(!count)return {ok:false,reason:'zero',delta:0,members,appliedFrames:0};
      const frame=this.frame(project),b=this.bounds(project,members);
      if(!b)return {ok:false,reason:'invalid_clip',delta:0,members,requestedFrames:count,appliedFrames:0};
      const epsilon=frame*1e-7,available=count<0?Math.max(0,Math.floor((b.start+epsilon)/frame)):Math.abs(count);
      const appliedFrames=count<0?-Math.min(Math.abs(count),available):count;
      if(!appliedFrames)return {ok:false,reason:'boundary',delta:0,members,requestedFrames:count,appliedFrames:0};
      return {ok:true,reason:'ok',delta:appliedFrames*frame,members,requestedFrames:count,appliedFrames};
    }
    static delta(project,clipId,frames){return this.selectionDelta(project,[clipId],frames)}
    static applySelection(project,clipIds,frames){
      const plan=this.selectionDelta(project,clipIds,frames);if(!plan.ok)return {...plan,changed:0};
      const oldDurationRaw=this.finiteNumber(project?.duration,null);
      if(oldDurationRaw===null||oldDurationRaw<0)return {...plan,ok:false,reason:'invalid_project',changed:0};
      const nextStarts=[];let end=0;
      for(const c of plan.members){
        const start=this.finiteNumber(c?.start,null),duration=this.finiteNumber(c?.duration,null);
        if(start===null||duration===null||start<0||duration<0)return {...plan,ok:false,reason:'invalid_clip',changed:0};
        const next=Math.max(0,start+plan.delta);nextStarts.push(Number(next.toFixed(9)));end=Math.max(end,next+duration);
      }
      const nextDuration=Math.max(oldDurationRaw,end);
      for(let i=0;i<plan.members.length;i++)plan.members[i].start=nextStarts[i];
      if(project)project.duration=Number(nextDuration.toFixed(9));
      return {...plan,changed:plan.members.length,duration:project?.duration??oldDurationRaw,extended:(project?.duration??oldDurationRaw)>oldDurationRaw+1e-9};
    }
    static apply(project,clipId,frames){return this.applySelection(project,[clipId],frames)}
  }
  return {ProfitMenteFrameNudgeEngine};
});