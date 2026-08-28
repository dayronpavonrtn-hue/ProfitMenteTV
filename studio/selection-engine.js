(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteSelectionEngine{
    constructor(){this.ids=new Set()}
    normalize(ids){return [...new Set((ids||[]).filter(Boolean).map(String))]}
    set(ids){this.ids=new Set(this.normalize(ids));return this.values()}
    add(id){if(id)this.ids.add(String(id));return this.values()}
    toggle(id){if(!id)return this.values();id=String(id);this.ids.has(id)?this.ids.delete(id):this.ids.add(id);return this.values()}
    clear(){this.ids.clear();return []}
    has(id){return this.ids.has(String(id))}
    values(){return [...this.ids]}
    get count(){return this.ids.size}
    clips(project){const ids=this.ids;return (project?.clips||[]).filter(c=>ids.has(String(c.id)))}
    trackState(project,track){const state=project?.trackState||{};const value=state[track]??state[String(track)]??{};return value&&typeof value==='object'?value:{}}
    isLocked(project,clip){return !!this.trackState(project,Number(clip?.track)).locked}
    editable(project){return this.clips(project).filter(c=>!this.isLocked(project,c))}
    bounds(clip){const start=Math.max(0,Number(clip?.start)||0),duration=Math.max(0,Number(clip?.duration)||0);return {start,end:start+duration}}
    overlaps(a,b){const x=this.bounds(a),y=this.bounds(b);return x.start<y.end-1e-6&&y.start<x.end-1e-6}
    arrangementSelection(project,minCount=2,{sameTrack=false}={}){
      const clips=this.clips(project);
      if(clips.length<minCount)return {clips:[],reason:'not-enough',blocked:0};
      const locked=clips.filter(c=>this.isLocked(project,c));
      if(locked.length)return {clips:[],reason:'locked-selection',blocked:locked.length};
      if(sameTrack&&new Set(clips.map(c=>Number(c.track))).size>1)return {clips:[],reason:'mixed-tracks',blocked:0};
      return {clips,reason:'ok',blocked:0}
    }
    align(project,edge='start'){
      const pick=this.arrangementSelection(project,2);if(pick.reason!=='ok')return {changed:0,reason:pick.reason,blocked:pick.blocked};
      const clips=pick.clips,target=edge==='end'?Math.max(...clips.map(c=>this.bounds(c).end)):Math.min(...clips.map(c=>this.bounds(c).start));let changed=0;
      for(const c of clips){const next=edge==='end'?target-Math.max(.001,Number(c.duration)||0):target;if(Math.abs((Number(c.start)||0)-next)>1e-6){c.start=+Math.max(0,next).toFixed(3);changed++}}
      return {changed,reason:'ok',edge,target:+target.toFixed(3)}
    }
    distribute(project){
      const pick=this.arrangementSelection(project,3,{sameTrack:true});if(pick.reason!=='ok')return {changed:0,reason:pick.reason,blocked:pick.blocked,gap:0};
      const clips=[...pick.clips].sort((a,b)=>this.bounds(a).start-this.bounds(b).start),first=this.bounds(clips[0]).start,lastEnd=this.bounds(clips[clips.length-1]).end,total=clips.reduce((s,c)=>s+Math.max(.001,Number(c.duration)||0),0),span=lastEnd-first,gap=(span-total)/(clips.length-1);
      if(gap<-1e-6)return {changed:0,reason:'insufficient-span',blocked:0,gap:+gap.toFixed(3)};
      let cursor=first,changed=0;for(const c of clips){if(Math.abs((Number(c.start)||0)-cursor)>1e-6){c.start=+cursor.toFixed(3);changed++}cursor+=Math.max(.001,Number(c.duration)||0)+Math.max(0,gap)}
      return {changed,reason:'ok',blocked:0,gap:+Math.max(0,gap).toFixed(3),start:+first.toFixed(3),end:+lastEnd.toFixed(3)}
    }
    compact(project,gap=0){
      const pick=this.arrangementSelection(project,2,{sameTrack:true});if(pick.reason!=='ok')return {changed:0,reason:pick.reason,blocked:pick.blocked,gap:0};
      const clips=[...pick.clips].sort((a,b)=>this.bounds(a).start-this.bounds(b).start),safeGap=Math.max(0,Number(gap)||0),start=this.bounds(clips[0]).start,total=clips.reduce((s,c)=>s+Math.max(.001,Number(c.duration)||0),0)+safeGap*(clips.length-1),projectDuration=Math.max(0,Number(project?.duration)||0);
      if(start+total>projectDuration+1e-6)return {changed:0,reason:'out-of-range',blocked:0,gap:safeGap};
      let cursor=start,changed=0;for(const c of clips){if(Math.abs((Number(c.start)||0)-cursor)>1e-6){c.start=+cursor.toFixed(3);changed++}cursor+=Math.max(.001,Number(c.duration)||0)+safeGap}
      return {changed,reason:'ok',blocked:0,gap:+safeGap.toFixed(3),start:+start.toFixed(3),end:+cursor.toFixed(3)}
    }
    moveTo(project,targetStart){
      const pick=this.arrangementSelection(project,1);if(pick.reason!=='ok')return {moved:0,reason:pick.reason,blocked:pick.blocked,delta:0};
      const minStart=Math.min(...pick.clips.map(c=>this.bounds(c).start));const result=this.shift(project,(Number(targetStart)||0)-minStart);return {...result,reason:result.moved?'ok':'boundary'}
    }
    shift(project,requestedDelta){
      const selected=this.clips(project),clips=selected.filter(c=>!this.isLocked(project,c));
      const blocked=selected.length-clips.length;
      if(!clips.length)return {moved:0,blocked,delta:0};
      const duration=Math.max(0,Number(project?.duration)||0),minStart=Math.min(...clips.map(c=>Number(c.start)||0)),maxEnd=Math.max(...clips.map(c=>(Number(c.start)||0)+(Number(c.duration)||0)));
      let delta=Number(requestedDelta)||0;delta=Math.max(-minStart,Math.min(duration-maxEnd,delta));
      if(Math.abs(delta)<1e-6)return {moved:0,blocked,delta:0};
      for(const c of clips)c.start=+((Number(c.start)||0)+delta).toFixed(3);
      return {moved:clips.length,blocked,delta:+delta.toFixed(3)}
    }
    duplicate(project,requestedOffset=.35){
      const selected=this.clips(project),clips=selected.filter(c=>!this.isLocked(project,c));
      if(!clips.length)return {clips:[],blocked:selected.length};
      const duration=Math.max(0,Number(project?.duration)||0),minStart=Math.min(...clips.map(c=>Number(c.start)||0)),maxEnd=Math.max(...clips.map(c=>(Number(c.start)||0)+(Number(c.duration)||0)));
      let delta=Number(requestedOffset)||0;if(delta>=0)delta=Math.min(delta,duration-maxEnd);else delta=Math.max(delta,-minStart);
      const copies=clips.map(c=>{const copy=structuredClone(c);copy.id=crypto.randomUUID();copy.name=(c.name||'Clip')+' copia';copy.start=+((Number(c.start)||0)+delta).toFixed(3);return copy});
      project.clips.push(...copies);this.set(copies.map(c=>c.id));return {clips:copies,blocked:selected.length-clips.length,delta:+delta.toFixed(3)}
    }
    remove(project){
      const selected=this.clips(project),removable=selected.filter(c=>!this.isLocked(project,c)),removeIds=new Set(removable.map(c=>String(c.id)));
      project.clips=(project.clips||[]).filter(c=>!removeIds.has(String(c.id)));
      const locked=selected.filter(c=>this.isLocked(project,c)).map(c=>c.id);this.set(locked);
      return {removed:removable.length,blocked:locked.length,remaining:this.values()}
    }
    rippleRemove(project){
      const selected=this.clips(project);
      if(!selected.length)return {removed:0,shifted:0,gap:0,blocked:0,reason:'empty'};
      const lockedSelected=selected.filter(c=>this.isLocked(project,c));
      if(lockedSelected.length)return {removed:0,shifted:0,gap:0,blocked:lockedSelected.length,reason:'locked-selection'};
      const start=Math.min(...selected.map(c=>this.bounds(c).start)),end=Math.max(...selected.map(c=>this.bounds(c).end)),gap=Math.max(0,end-start);
      if(gap<=1e-6)return {removed:0,shifted:0,gap:0,blocked:0,reason:'zero-gap'};
      const selectedIds=new Set(selected.map(c=>String(c.id)));
      const blockers=(project?.clips||[]).filter(c=>!selectedIds.has(String(c.id))&&this.overlaps(c,{start,duration:gap}));
      if(blockers.length)return {removed:0,shifted:0,gap:+gap.toFixed(3),blocked:blockers.length,blockers:blockers.map(c=>c.id),reason:'overlap'};
      const lockedAfter=(project?.clips||[]).filter(c=>!selectedIds.has(String(c.id))&&this.isLocked(project,c)&&this.bounds(c).start>=end-1e-6);
      if(lockedAfter.length)return {removed:0,shifted:0,gap:+gap.toFixed(3),blocked:lockedAfter.length,blockers:lockedAfter.map(c=>c.id),reason:'locked-after'};
      project.clips=(project.clips||[]).filter(c=>!selectedIds.has(String(c.id)));
      let shifted=0;
      for(const c of project.clips){
        if(this.isLocked(project,c))continue;
        const b=this.bounds(c);if(b.start>=end-1e-6){c.start=+(Math.max(0,b.start-gap)).toFixed(3);shifted++}
      }
      this.clear();
      return {removed:selected.length,shifted,gap:+gap.toFixed(3),blocked:0,start:+start.toFixed(3),end:+end.toFixed(3),reason:'ok'}
    }
  }
  root.ProfitMenteSelectionEngine=ProfitMenteSelectionEngine;
  if(typeof module!=='undefined')module.exports={ProfitMenteSelectionEngine};
})();