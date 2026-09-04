(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports){module.exports=api;return}
  root.ProfitMenteFrameNudgeEngine=api.ProfitMenteFrameNudgeEngine;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  class ProfitMenteFrameNudgeEngine{
    static fps(project){const n=Math.round(Number(project?.fps)||30);return [24,30,60].includes(n)?n:30}
    static frame(project){return 1/this.fps(project)}
    static canonicalTrack(value){
      if(value===undefined||value===null)return null;
      if(typeof value==='string'&&!value.trim())return null;
      const n=Number(value);
      return Number.isFinite(n)&&Number.isInteger(n)&&n>=0&&n<=6?String(n):null;
    }
    static locked(project,clip){
      if(clip?.locked)return true;
      const canonical=this.canonicalTrack(clip?.track);if(canonical===null)return false;
      const maps=[project?.trackState,project?.trackStates];
      return maps.some(map=>map&&typeof map==='object'&&Object.entries(map).some(([key,state])=>this.canonicalTrack(key)===canonical&&!!state?.locked));
    }
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
      const frame=this.frame(project),b=this.bounds(project,members),epsilon=frame*1e-7;
      // Moving right behaves like paste/insert: preserve the user's requested edit
      // and let the sequence grow. Only the hard zero boundary limits left moves.
      const available=count<0?Math.max(0,Math.floor((b.start+epsilon)/frame)):Math.abs(count);
      const appliedFrames=count<0?-Math.min(Math.abs(count),available):count;
      if(!appliedFrames)return {ok:false,reason:'boundary',delta:0,members,requestedFrames:count,appliedFrames:0};
      return {ok:true,reason:'ok',delta:appliedFrames*frame,members,requestedFrames:count,appliedFrames};
    }
    static apply(project,clipId,frames){
      const plan=this.delta(project,clipId,frames);if(!plan.ok)return {...plan,changed:0};
      const oldDuration=Math.max(0,Number(project?.duration)||0);
      for(const c of plan.members)c.start=Math.max(0,Number(c.start)||0)+plan.delta;
      const end=plan.members.reduce((m,c)=>Math.max(m,(Number(c.start)||0)+Math.max(0,Number(c.duration)||0)),0);
      if(project)project.duration=Math.max(oldDuration,end);
      return {...plan,changed:plan.members.length,duration:project?.duration??oldDuration,extended:(project?.duration??oldDuration)>oldDuration+1e-9};
    }
  }
  return {ProfitMenteFrameNudgeEngine};
});