(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteMultiSelectEngine{
    constructor(){this.keys=new Set()}
    scalarText(v){if(typeof v==='number')return Number.isFinite(v)?String(v):null;if(typeof v!=='string')return null;const s=v.trim();return s||null}
    key(v){const s=this.scalarText(v);if(s===null)return null;if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(s)){const n=Number(s);if(Number.isFinite(n))return `n:${Object.is(n,-0)?0:n}`}return `s:${s}`}
    track(v){if(typeof v==='boolean'||Array.isArray(v)||v&&typeof v==='object')return null;const n=Number(v);return Number.isInteger(n)&&n>=0&&n<=6?n:null}
    clipWindow(c){const start=Number(c?.start),duration=Number(c?.duration);return Number.isFinite(start)&&Number.isFinite(duration)&&duration>0?{start,duration,end:start+duration}:null}
    groupKey(c){const raw=this.scalarText(c?.groupId);return raw===null?null:`g:${raw}`}
    build(project){
      const clips=Array.isArray(project?.clips)?project.clips:[],byKey=new Map(),groups=new Map();
      for(const clip of clips){const k=this.key(clip?.id);if(k===null)continue;if(byKey.has(k))throw new Error('IDs de clips ambiguos en el proyecto');byKey.set(k,clip);const g=this.groupKey(clip);if(g){if(!groups.has(g))groups.set(g,[]);groups.get(g).push(clip)}}
      return {clips,byKey,groups}
    }
    clear(){this.keys.clear();return []}
    has(id){const k=this.key(id);return k!==null&&this.keys.has(k)}
    selected(project){const {byKey}=this.build(project);return [...this.keys].map(k=>byKey.get(k)).filter(Boolean)}
    set(project,ids,{expandGroups=false}={}){
      const {byKey,groups}=this.build(project),next=new Set();
      for(const id of ids||[]){const k=this.key(id);if(k!==null&&byKey.has(k))next.add(k)}
      if(expandGroups){for(const k of [...next]){const clip=byKey.get(k),g=this.groupKey(clip);if(g)for(const member of groups.get(g)||[]){const mk=this.key(member.id);if(mk)next.add(mk)}}}
      this.keys=next;return this.selected(project)
    }
    toggle(project,id,{expandGroups=false}={}){
      const {byKey,groups}=this.build(project),k=this.key(id);if(k===null||!byKey.has(k))return this.selected(project);
      const targets=[byKey.get(k)],g=this.groupKey(byKey.get(k));if(expandGroups&&g)targets.splice(0,targets.length,...(groups.get(g)||[]));
      const remove=targets.every(c=>this.keys.has(this.key(c.id)));for(const c of targets){const ck=this.key(c.id);if(!ck)continue;remove?this.keys.delete(ck):this.keys.add(ck)}return this.selected(project)
    }
    selectRange(project,start,end,{tracks=null,expandGroups=false}={}){
      const a=Number(start),b=Number(end);if(!Number.isFinite(a)||!Number.isFinite(b))throw new Error('Rango de selección inválido');const lo=Math.min(a,b),hi=Math.max(a,b),allowed=tracks==null?null:new Set((tracks||[]).map(v=>this.track(v)).filter(v=>v!==null));
      const ids=[];for(const clip of this.build(project).clips){const w=this.clipWindow(clip),t=this.track(clip.track);if(!w||t===null||(allowed&&!allowed.has(t)))continue;if(w.end>lo+.000001&&w.start<hi-.000001)ids.push(clip.id)}return this.set(project,ids,{expandGroups})
    }
    trackLocked(project,clip){const target=this.track(clip?.track);if(target===null)return false;return [project?.trackState,project?.trackStates].some(map=>map&&typeof map==='object'&&Object.entries(map).some(([k,state])=>this.track(k)===target&&state&&typeof state==='object'&&state.locked===true))}
    isLocked(project,clip){return clip?.locked===true||this.trackLocked(project,clip)}
    removeSelected(project,{expandGroups=true}={}){
      const {clips,byKey,groups}=this.build(project);let targets=new Set([...this.keys].filter(k=>byKey.has(k)));
      if(expandGroups){for(const k of [...targets]){const g=this.groupKey(byKey.get(k));if(g)for(const member of groups.get(g)||[]){const mk=this.key(member.id);if(mk)targets.add(mk)}}}
      if(!targets.size)return {ok:false,reason:'empty',removed:0};const locked=[...targets].map(k=>byKey.get(k)).filter(c=>this.isLocked(project,c));if(locked.length)return {ok:false,reason:'locked',removed:0,locked:locked.length};
      project.clips=clips.filter(c=>!targets.has(this.key(c.id)));const removed=clips.length-project.clips.length;this.clear();return {ok:true,removed}
    }
  }
  root.ProfitMenteMultiSelectEngine=ProfitMenteMultiSelectEngine;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteMultiSelectEngine;
})();
