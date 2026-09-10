(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteClipboardEngine{
    constructor(){this.buffer=[];this.anchor=0}
    trackState(project,track){const s=project?.trackState||{};const v=s[track]??s[String(track)]??{};return v&&typeof v==='object'?v:{}}
    isLocked(project,track){return !!this.trackState(project,Number(track)).locked}
    createId(prefix='clip'){return root.crypto?.randomUUID?.()||`${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`}
    validNumber(value,{min=0,integer=false}={}){const n=Number(value);return Number.isFinite(n)&&n>=min&&(!integer||Number.isInteger(n))?n:null}
    validateClip(clip){
      if(!clip||typeof clip!=='object')return {ok:false,reason:'invalid-clip'};
      const track=this.validNumber(clip.track,{min:0,integer:true});
      const start=this.validNumber(clip.start,{min:0});
      const duration=this.validNumber(clip.duration,{min:Number.EPSILON});
      if(track===null)return {ok:false,reason:'invalid-track'};
      if(start===null)return {ok:false,reason:'invalid-start'};
      if(duration===null)return {ok:false,reason:'invalid-duration'};
      return {ok:true,track,start,duration};
    }
    validateBuffer(){
      if(!this.buffer.length)return {ok:false,reason:'empty'};
      for(const clip of this.buffer){
        const check=this.validateClip(clip);if(!check.ok)return check;
        const relative=this.validNumber(clip.__relativeStart,{min:0});if(relative===null)return {ok:false,reason:'invalid-relative-start'};
      }
      return {ok:true};
    }
    copy(clips=[]){
      const source=(clips||[]).filter(Boolean);
      if(!source.length){this.buffer=[];this.anchor=0;return {copied:0}}
      const checked=source.map(c=>this.validateClip(c));
      const invalid=checked.find(c=>!c.ok);if(invalid)return {copied:0,ok:false,reason:invalid.reason};
      const list=source.map(c=>structuredClone(c));
      const nextAnchor=Math.min(...checked.map(c=>c.start));
      const nextBuffer=list.map((c,i)=>({...c,track:checked[i].track,start:checked[i].start,duration:checked[i].duration,__relativeStart:checked[i].start-nextAnchor}));
      this.anchor=nextAnchor;this.buffer=nextBuffer;
      return {copied:this.buffer.length,span:this.span()}
    }
    cut(project,clips=[]){
      if(!project||!Array.isArray(project.clips))return {ok:false,reason:'project',removed:0};
      const list=(clips||[]).filter(Boolean);
      if(!list.length)return {ok:false,reason:'empty-selection',removed:0};
      const selected=new Set(list);
      if(list.some(c=>!project.clips.includes(c)))return {ok:false,reason:'stale-selection',removed:0};
      const locked=list.filter(c=>c?.locked||this.isLocked(project,c?.track));
      if(locked.length)return {ok:false,reason:'locked-selection',locked:locked.map(c=>c.id),removed:0};
      const invalid=list.map(c=>this.validateClip(c)).find(c=>!c.ok);if(invalid)return {ok:false,reason:invalid.reason,removed:0};
      const previousBuffer=structuredClone(this.buffer),previousAnchor=this.anchor,previousClips=project.clips;
      try{
        const copied=this.copy(list);
        if(!copied.copied)throw new Error(copied.reason||'clipboard-copy-failed');
        project.clips=project.clips.filter(c=>!selected.has(c));
        return {ok:true,removed:list.length,copied:copied.copied,span:copied.span};
      }catch(error){
        this.buffer=previousBuffer;this.anchor=previousAnchor;project.clips=previousClips;
        return {ok:false,reason:'error',error,removed:0};
      }
    }
    span(){if(!this.buffer.length)return 0;return Math.max(...this.buffer.map(c=>(Number(c.__relativeStart)||0)+Math.max(0,Number(c.duration)||0)))}
    canPaste(project){
      const bufferCheck=this.validateBuffer();if(!bufferCheck.ok)return bufferCheck;
      const duration=this.validNumber(project?.duration,{min:0});if(duration===null)return {ok:false,reason:'invalid-project-duration'};
      const locked=[...new Set(this.buffer.map(c=>Number(c.track)).filter(t=>this.isLocked(project,t)))];
      if(locked.length)return {ok:false,reason:'locked-tracks',locked};
      const span=this.span();
      if(!Number.isFinite(span)||span<0)return {ok:false,reason:'invalid-span'};
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
      if(!project||!Array.isArray(project.clips))return {ok:false,reason:'project',clips:[]};
      const requestedValue=this.validNumber(atTime,{min:0});if(requestedValue===null)return {ok:false,reason:'invalid-paste-time',clips:[]};
      const maxStart=Math.max(0,check.duration-check.span),requested=requestedValue,base=Math.min(requested,maxStart);
      const copies=this.buffer.map(src=>{
        const c=structuredClone(src);delete c.__relativeStart;c.id=this.createId('clip');c.start=+(base+Number(src.__relativeStart)).toFixed(3);c.name=(c.name||'Clip')+' copia';return c
      });
      const remappedGroups=this.remapGroups(copies);
      project.clips.push(...copies);
      return {ok:true,clips:copies,base:+base.toFixed(3),requested:+requested.toFixed(3),clamped:Math.abs(base-requested)>1e-6,span:+check.span.toFixed(3),remappedGroups}
    }
    duplicate(project,clips=[]){
      const list=(clips||[]).filter(Boolean),previousBuffer=structuredClone(this.buffer),previousAnchor=this.anchor;
      if(!project||!Array.isArray(project.clips))return {ok:false,reason:'project',clips:[],duplicate:true};
      if(!list.length)return {ok:false,reason:'empty-selection',clips:[]};
      if(list.some(c=>!project.clips.includes(c)))return {ok:false,reason:'stale-selection',clips:[],duplicate:true};
      const invalid=list.map(c=>this.validateClip(c)).find(c=>!c.ok);if(invalid)return {ok:false,reason:invalid.reason,clips:[],duplicate:true};
      const copied=this.copy(list);if(!copied.copied){this.buffer=previousBuffer;this.anchor=previousAnchor;return {ok:false,reason:copied.reason||'copy-failed',clips:[],duplicate:true}}
      const check=this.canPaste(project);
      if(!check.ok){this.buffer=previousBuffer;this.anchor=previousAnchor;return {...check,clips:[],duplicate:true}}
      const anchor=Math.min(...list.map(c=>Number(c.start))),at=anchor+this.span(),maxStart=Math.max(0,check.duration-check.span);
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