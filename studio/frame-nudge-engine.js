(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports){module.exports=api;return}
  root.ProfitMenteFrameNudgeEngine=api.ProfitMenteFrameNudgeEngine;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  class ProfitMenteFrameNudgeEngine{
    static fps(project){const n=Math.round(Number(project?.fps)||30);return [24,30,60].includes(n)?n:30}
    static frame(project){return 1/this.fps(project)}
    static locked(project,clip){const state=project?.trackState?.[clip?.track]??project?.trackState?.[String(clip?.track)];return !!clip?.locked||!!state?.locked}
    static members(project,clipId){
      const clips=Array.isArray(project?.clips)?project.clips:[],seed=clips.find(c=>String(c.id)===String(clipId));if(!seed)return [];
      const gid=String(seed.groupId||'').trim();return gid?clips.filter(c=>String(c.groupId||'').trim()===gid):[seed];
    }
    static bounds(project,members){
      if(!members.length)return null;let start=Infinity,end=-Infinity;
      for(const c of members){const s=Math.max(0,Number(c.start)||0),d=Math.max(0,Number(c.duration)||0);start=Math.min(start,s);end=Math.max(end,s+d)}
      return {start,end};
    }
    static delta(project,clipId,frames){
      const members=this.members(project,clipId);if(!members.length)return {ok:false,reason:'missing',delta:0,members:[],appliedFrames:0};
      if(members.some(c=>this.locked(project,c)))return {ok:false,reason:'locked',delta:0,members,appliedFrames:0};
      const count=Math.trunc(Number(frames)||0);if(!count)return {ok:false,reason:'zero',delta:0,members,appliedFrames:0};
      const frame=this.frame(project),b=this.bounds(project,members),duration=Math.max(0,Number(project?.duration)||0),epsilon=frame*1e-7;
      const room=count<0?b.start:Math.max(0,duration-b.end),available=Math.max(0,Math.floor((room+epsilon)/frame));
      const appliedFrames=(count<0?-1:1)*Math.min(Math.abs(count),available);
      if(!appliedFrames)return {ok:false,reason:'boundary',delta:0,members,requestedFrames:count,appliedFrames:0};
      return {ok:true,reason:'ok',delta:appliedFrames*frame,members,requestedFrames:count,appliedFrames};
    }
    static apply(project,clipId,frames){
      const plan=this.delta(project,clipId,frames);if(!plan.ok)return {...plan,changed:0};
      for(const c of plan.members)c.start=Math.max(0,Number(c.start)||0)+plan.delta;
      return {...plan,changed:plan.members.length};
    }
  }
  return {ProfitMenteFrameNudgeEngine};
});