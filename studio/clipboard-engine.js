(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteClipboardEngine{
    constructor(){this.buffer=[];this.anchor=0}
    trackState(project,track){const s=project?.trackState||{};const v=s[track]??s[String(track)]??{};return v&&typeof v==='object'?v:{}}
    isLocked(project,track){return !!this.trackState(project,Number(track)).locked}
    createId(prefix='clip'){return root.crypto?.randomUUID?.()||`${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`}
    copy(clips=[]){
      const list=(clips||[]).filter(Boolean).map(c=>structuredClone(c));
      if(!list.length){this.buffer=[];this.anchor=0;return {copied:0}}
      this.anchor=Math.min(...list.map(c=>Math.max(0,Number(c.start)||0)));
      this.buffer=list.map(c=>({...c,__relativeStart:(Number(c.start)||0)-this.anchor}));
      return {copied:this.buffer.length,span:this.span()}
    }
    span(){if(!this.buffer.length)return 0;return Math.max(...this.buffer.map(c=>(Number(c.__relativeStart)||0)+Math.max(0,Number(c.duration)||0)))}
    canPaste(project){
      if(!this.buffer.length)return {ok:false,reason:'empty'};
      const locked=[...new Set(this.buffer.map(c=>Number(c.track)).filter(t=>this.isLocked(project,t)))];
      if(locked.length)return {ok:false,reason:'locked-tracks',locked};
      const duration=Math.max(0,Number(project?.duration)||0),span=this.span();
      if(span>duration+1e-6)return {ok:false,reason:'too-long',span,duration};
      return {ok:true,span,duration}
    }
    remapGroups(copies){
      const counts=new Map();
      for(const clip of copies){const id=clip?.groupId==null?'':String(clip.groupId).trim();if(id)counts.set(id,(counts.get(id)||0)+1)}
      const mapped=new Map();
      for(const clip of copies){
        const oldId=clip?.groupId==null?'':String(clip.groupId).trim();if(!oldId)continue;
        if((counts.get(oldId)||0)<2){delete clip.groupId;continue}
        if(!mapped.has(oldId))mapped.set(oldId,this.createId('group'));
        clip.groupId=mapped.get(oldId)
      }
      return mapped.size
    }
    paste(project,atTime=0){
      const check=this.canPaste(project);if(!check.ok)return {...check,clips:[]};
      const maxStart=Math.max(0,check.duration-check.span),requested=Math.max(0,Number(atTime)||0),base=Math.min(requested,maxStart);
      const copies=this.buffer.map(src=>{
        const c=structuredClone(src);delete c.__relativeStart;c.id=this.createId('clip');c.start=+(base+(Number(src.__relativeStart)||0)).toFixed(3);c.name=(c.name||'Clip')+' copia';return c
      });
      const remappedGroups=this.remapGroups(copies);
      project.clips=Array.isArray(project.clips)?project.clips:[];project.clips.push(...copies);
      return {ok:true,clips:copies,base:+base.toFixed(3),requested:+requested.toFixed(3),clamped:Math.abs(base-requested)>1e-6,span:+check.span.toFixed(3),remappedGroups}
    }
    duplicate(project,clips=[]){
      const list=(clips||[]).filter(Boolean),previousBuffer=structuredClone(this.buffer),previousAnchor=this.anchor;
      if(!list.length)return {ok:false,reason:'empty-selection',clips:[]};
      this.copy(list);
      const check=this.canPaste(project);
      if(!check.ok){this.buffer=previousBuffer;this.anchor=previousAnchor;return {...check,clips:[],duplicate:true}}
      const anchor=Math.min(...list.map(c=>Math.max(0,Number(c.start)||0))),at=anchor+this.span(),maxStart=Math.max(0,check.duration-check.span);
      if(at>maxStart+1e-6){this.buffer=previousBuffer;this.anchor=previousAnchor;return {ok:false,reason:'no-space',requested:+at.toFixed(3),maxStart:+maxStart.toFixed(3),clips:[],duplicate:true}}
      const result=this.paste(project,at);
      this.buffer=previousBuffer;this.anchor=previousAnchor;
      return {...result,duplicate:true}
    }
    clear(){this.buffer=[];this.anchor=0}
    get count(){return this.buffer.length}
  }
  root.ProfitMenteClipboardEngine=ProfitMenteClipboardEngine;
  if(typeof module!=='undefined')module.exports={ProfitMenteClipboardEngine};
})();