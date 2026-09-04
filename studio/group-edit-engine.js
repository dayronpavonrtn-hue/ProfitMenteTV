(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
  class ProfitMenteGroupEditEngine{
    members(project,anchor){
      const clips=Array.isArray(project?.clips)?project.clips:[];
      if(!anchor)return [];
      const groupId=String(anchor.groupId||'').trim();
      return groupId?clips.filter(c=>String(c.groupId||'').trim()===groupId):[anchor];
    }
    canonicalTrackKey(value){
      if(value===null||value===undefined)return null;
      const raw=String(value).trim();if(!raw)return null;
      const n=Number(raw);return Number.isFinite(n)&&Number.isInteger(n)&&n>=0&&n<=6?String(n):null;
    }
    locked(project,clip){
      if(!clip)return false;if(clip.locked)return true;
      const raw=String(clip.track??'').trim();if(!raw)return false;
      const canonical=this.canonicalTrackKey(clip.track);
      for(const state of [project?.trackState,project?.trackStates]){
        if(!state||typeof state!=='object')continue;
        if(state[raw]?.locked)return true;
        if(canonical&&state[canonical]?.locked)return true;
        if(canonical&&Object.entries(state).some(([key,value])=>value?.locked&&this.canonicalTrackKey(key)===canonical))return true;
      }
      return false;
    }
    lockedMembers(project,anchor){return this.members(project,anchor).filter(c=>this.locked(project,c))}
    maxEnd(project){
      return (Array.isArray(project?.clips)?project.clips:[]).reduce((max,clip)=>Math.max(max,(Number(clip?.start)||0)+Math.max(0,Number(clip?.duration)||0)),0);
    }
    syncDurationAfterShrink(project,oldMaxEnd){
      const duration=Math.max(0,Number(project?.duration)||0),previous=Math.max(0,Number(oldMaxEnd)||0);
      if(duration<=previous+.001)project.duration=this.maxEnd(project);
      return Math.max(0,Number(project?.duration)||0);
    }
    duplicate(project,anchor,{idFactory=()=>crypto.randomUUID(),offset=.5}={}){
      const members=this.members(project,anchor);
      if(!members.length)return {copies:[],delta:0};
      const blocked=this.lockedMembers(project,anchor);if(blocked.length)return {copies:[],delta:0,reason:'locked',blocked};
      const duration=Math.max(0,Number(project?.duration)||0);
      const minStart=Math.min(...members.map(c=>Math.max(0,Number(c.start)||0)));
      const maxEnd=Math.max(...members.map(c=>(Number(c.start)||0)+Math.max(0,Number(c.duration)||0)));
      const step=Math.max(.05,Number(offset)||.5);
      const forward=Math.max(0,duration-maxEnd),backward=Math.max(0,minStart);
      const delta=forward>=.05?Math.min(step,forward):backward>=.05?-Math.min(step,backward):0;
      const newGroupId=members.length>1?String(idFactory()):'';
      const copies=members.map(c=>{
        const copy=clone(c);
        copy.id=String(idFactory());
        copy.name=(c.name||'Clip')+' copia';
        copy.start=Math.max(0,Math.min(Math.max(0,duration-(Number(copy.duration)||0)),(Number(c.start)||0)+delta));
        if(members.length>1)copy.groupId=newGroupId;
        return copy;
      });
      project.clips.push(...copies);
      return {copies,delta,groupId:newGroupId};
    }
    remove(project,anchor){
      const members=this.members(project,anchor),blocked=this.lockedMembers(project,anchor);if(blocked.length)return [];
      const ids=new Set(members.map(c=>String(c.id)));
      if(!ids.size)return [];
      const oldMaxEnd=this.maxEnd(project);
      project.clips=(project.clips||[]).filter(c=>!ids.has(String(c.id)));
      this.syncDurationAfterShrink(project,oldMaxEnd);
      return members;
    }
  }
  root.ProfitMenteGroupEditEngine=ProfitMenteGroupEditEngine;
  if(typeof module!=='undefined')module.exports={ProfitMenteGroupEditEngine};
})();