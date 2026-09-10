(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports){module.exports=api;return}
  root.ProfitMenteRippleGapEngine=api.ProfitMenteRippleGapEngine;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  class ProfitMenteRippleGapEngine{
    static finite(value,fallback=null){
      if(typeof value==='number')return Number.isFinite(value)?value:fallback;
      if(typeof value==='string'&&value.trim()!==''){
        const n=Number(value);return Number.isFinite(n)?n:fallback;
      }
      return fallback;
    }
    static canonicalTrack(value){
      const n=this.finite(value,null);
      return n!==null&&Number.isInteger(n)&&n>=0&&n<=6?String(Object.is(n,-0)?0:n):null;
    }
    static canonicalId(value){
      if(typeof value==='number'&&Number.isFinite(value))return Number.isInteger(value)?`n:${Object.is(value,-0)?0:value}`:`s:${String(value)}`;
      if(typeof value!=='string')return null;
      const s=value.trim();if(!s)return null;
      const n=Number(s);
      if(Number.isFinite(n)&&Number.isInteger(n))return `n:${Object.is(n,-0)?0:n}`;
      return `s:${s}`;
    }
    static trackLocked(project,track){
      const wanted=this.canonicalTrack(track);if(wanted===null)return false;
      return [project?.trackState,project?.trackStates].some(map=>map&&typeof map==='object'&&!Array.isArray(map)&&Object.entries(map).some(([key,state])=>this.canonicalTrack(key)===wanted&&state?.locked===true));
    }
    static clipLocked(project,clip){return clip?.locked===true||this.trackLocked(project,clip?.track)}
    static validate(project){
      const duration=this.finite(project?.duration,null),clips=Array.isArray(project?.clips)?project.clips:null;
      if(duration===null||duration<0||!clips)return {ok:false,reason:'invalid_project'};
      const ids=new Set();
      for(const clip of clips){
        if(!clip||typeof clip!=='object'||Array.isArray(clip))return {ok:false,reason:'invalid_clip'};
        const id=this.canonicalId(clip.id),track=this.canonicalTrack(clip.track),start=this.finite(clip.start,null),clipDuration=this.finite(clip.duration,null);
        if(id===null||track===null||start===null||clipDuration===null||start<0||clipDuration<0)return {ok:false,reason:'invalid_clip'};
        if(ids.has(id))return {ok:false,reason:'ambiguous_id'};ids.add(id);
      }
      return {ok:true,duration,clips};
    }
    static occupied(project){
      const v=this.validate(project);if(!v.ok)return v;
      const ranges=v.clips.filter(c=>this.finite(c.duration,0)>0).map(c=>{
        const start=this.finite(c.start,0),end=Math.min(v.duration,start+this.finite(c.duration,0));return [start,end];
      }).filter(([s,e])=>e>s).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
      const merged=[];
      for(const range of ranges){const last=merged[merged.length-1];if(last&&range[0]<=last[1]+1e-9)last[1]=Math.max(last[1],range[1]);else merged.push([...range])}
      return {ok:true,duration:v.duration,clips:v.clips,ranges:merged};
    }
    static gaps(project,minGap=.001){
      const o=this.occupied(project);if(!o.ok)return o;
      const min=this.finite(minGap,null);if(min===null||min<0)return {ok:false,reason:'invalid_gap'};
      const gaps=[];let cursor=0;
      for(const [start,end] of o.ranges){if(start-cursor>=min)gaps.push({start:cursor,end:start,duration:start-cursor});cursor=Math.max(cursor,end)}
      if(o.duration-cursor>=min)gaps.push({start:cursor,end:o.duration,duration:o.duration-cursor});
      return {ok:true,gaps,duration:o.duration};
    }
    static gapAt(project,time,minGap=.001){
      const t=this.finite(time,null);if(t===null)return {ok:false,reason:'invalid_time'};
      const result=this.gaps(project,minGap);if(!result.ok)return result;
      const eps=1e-9,gap=result.gaps.find(g=>t>=g.start-eps&&t<=g.end+eps);
      return gap?{ok:true,gap}:{ok:false,reason:'no_gap',gaps:result.gaps};
    }
    static groupKey(clip){const id=this.canonicalId(clip?.groupId);return id===null?'':id}
    static shiftAuxTime(value,gap){
      const t=this.finite(value,null);if(t===null)return value;
      if(t>=gap.end)return Math.max(0,t-gap.duration);
      if(t>gap.start)return gap.start;
      return t;
    }
    static shiftWordTimings(clip,delta){
      if(!Array.isArray(clip?.wordTimings)||Math.abs(delta)<1e-9)return 0;
      let shifted=0;
      for(const word of clip.wordTimings){
        if(!word||typeof word!=='object'||Array.isArray(word))continue;
        const start=this.finite(word.start,null),end=this.finite(word.end,null);let changed=false;
        if(start!==null){word.start=Math.max(0,start+delta);changed=true}
        if(end!==null){word.end=Math.max(0,end+delta);changed=true}
        if(changed){const a=this.finite(word.start,null),b=this.finite(word.end,null);if(a!==null&&b!==null)word.duration=Math.max(0,b-a);shifted++}
      }
      return shifted;
    }
    static plan(project,time,minGap=.001){
      const valid=this.validate(project);if(!valid.ok)return {...valid,changed:0};
      const found=this.gapAt(project,time,minGap);if(!found.ok)return {...found,changed:0};
      const gap=found.gap;if(gap.duration<=1e-9)return {ok:false,reason:'no_gap',changed:0};
      const after=[],groups=new Map();
      for(const clip of valid.clips){
        const start=this.finite(clip.start,0),end=start+this.finite(clip.duration,0),key=this.groupKey(clip);
        if(start>=gap.end-1e-9)after.push(clip);
        if(key){if(!groups.has(key))groups.set(key,{before:false,after:false});const state=groups.get(key);if(start>=gap.end-1e-9)state.after=true;else if(end<=gap.start+1e-9)state.before=true}
      }
      if([...groups.values()].some(g=>g.before&&g.after))return {ok:false,reason:'group_spans_gap',gap,changed:0};
      if(after.some(c=>this.clipLocked(project,c)))return {ok:false,reason:'locked',gap,changed:0};
      const moves=after.map(clip=>({clip,start:this.finite(clip.start,0)-gap.duration}));
      return {ok:true,reason:'ok',gap,moves,changed:moves.length,newDuration:Math.max(0,valid.duration-gap.duration)};
    }
    static apply(project,time,minGap=.001){
      const plan=this.plan(project,time,minGap);if(!plan.ok)return plan;
      let wordsShifted=0;
      for(const move of plan.moves){
        const previous=this.finite(move.clip.start,move.start),delta=move.start-previous;
        move.clip.start=move.start;
        wordsShifted+=this.shiftWordTimings(move.clip,delta);
      }
      project.duration=plan.newDuration;
      if(Array.isArray(project.markers))for(const marker of project.markers)if(marker&&typeof marker==='object'&&!Array.isArray(marker))marker.time=this.shiftAuxTime(marker.time,plan.gap);
      if(project.workRange&&typeof project.workRange==='object'&&!Array.isArray(project.workRange)){
        project.workRange.start=this.shiftAuxTime(project.workRange.start,plan.gap);
        project.workRange.end=this.shiftAuxTime(project.workRange.end,plan.gap);
        if(this.finite(project.workRange.end,null)!==null&&this.finite(project.workRange.start,null)!==null&&project.workRange.end<project.workRange.start)project.workRange.end=project.workRange.start;
      }
      return {...plan,wordsShifted};
    }
  }
  return {ProfitMenteRippleGapEngine};
});