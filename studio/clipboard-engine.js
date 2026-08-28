(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteClipboardEngine{
    constructor(){this.buffer=[];this.anchor=0}
    trackState(project,track){const s=project?.trackState||{};const v=s[track]??s[String(track)]??{};return v&&typeof v==='object'?v:{}}
    isLocked(project,track){return !!this.trackState(project,Number(track)).locked}
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
    paste(project,atTime=0){
      const check=this.canPaste(project);if(!check.ok)return {...check,clips:[]};
      const maxStart=Math.max(0,check.duration-check.span),requested=Math.max(0,Number(atTime)||0),base=Math.min(requested,maxStart);
      const copies=this.buffer.map(src=>{
        const c=structuredClone(src);delete c.__relativeStart;c.id=(root.crypto?.randomUUID?.()||`clip-${Date.now()}-${Math.random().toString(16).slice(2)}`);c.start=+(base+(Number(src.__relativeStart)||0)).toFixed(3);c.name=(c.name||'Clip')+' copia';return c
      });
      project.clips=Array.isArray(project.clips)?project.clips:[];project.clips.push(...copies);
      return {ok:true,clips:copies,base:+base.toFixed(3),requested:+requested.toFixed(3),clamped:Math.abs(base-requested)>1e-6,span:+check.span.toFixed(3)}
    }
    clear(){this.buffer=[];this.anchor=0}
    get count(){return this.buffer.length}
  }
  root.ProfitMenteClipboardEngine=ProfitMenteClipboardEngine;
  if(typeof module!=='undefined')module.exports={ProfitMenteClipboardEngine};
})();