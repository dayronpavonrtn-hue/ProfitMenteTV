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
  }
  root.ProfitMenteSelectionEngine=ProfitMenteSelectionEngine;
  if(typeof module!=='undefined')module.exports={ProfitMenteSelectionEngine};
})();