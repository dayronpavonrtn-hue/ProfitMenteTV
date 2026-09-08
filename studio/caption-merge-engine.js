class ProfitMenteCaptionMergeEngine{
  strictNumber(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string')return null;
    const raw=value.trim();if(!raw||!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(raw))return null;
    const n=Number(raw);return Number.isFinite(n)?n:null;
  }
  idKey(value){
    if(typeof value==='number')return Number.isFinite(value)?`n:${Object.is(value,-0)?0:value}`:null;
    if(typeof value!=='string')return null;
    const raw=value.trim();if(!raw)return null;
    if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(raw)){const n=Number(raw);if(Number.isFinite(n))return `n:${Object.is(n,-0)?0:n}`}
    return `s:${raw}`;
  }
  trackKey(value){const n=this.strictNumber(value);return n!==null&&Number.isInteger(n)&&n>=0&&n<=6?String(Object.is(n,-0)?0:n):null}
  clone(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value))}
  trackLocked(project,track){
    const key=this.trackKey(track);if(key===null)return false;
    return [project?.trackState,project?.trackStates].some(map=>map&&typeof map==='object'&&Object.entries(map).some(([raw,state])=>this.trackKey(raw)===key&&state&&typeof state==='object'&&state.locked===true));
  }
  locked(project,clip){return clip?.locked===true||this.trackLocked(project,clip?.track)}
  bounds(clip){
    const start=this.strictNumber(clip?.start),duration=this.strictNumber(clip?.duration),track=this.trackKey(clip?.track);
    if(start===null||duration===null||start<0||duration<=0||track===null)return null;
    return {start,duration,end:start+duration,track};
  }
  validateProject(project){
    if(!project||!Array.isArray(project.clips))return {ok:false,reason:'invalid-project'};
    const seen=new Set();
    for(const clip of project.clips){
      if(!clip||typeof clip!=='object')return {ok:false,reason:'invalid-clip'};
      const key=this.idKey(clip.id);if(key===null)return {ok:false,reason:'invalid-id'};
      if(seen.has(key))return {ok:false,reason:'ambiguous-id'};seen.add(key);
      if(!this.bounds(clip))return {ok:false,reason:'invalid-clip'};
    }
    return {ok:true};
  }
  normalizeWords(words,start,end){
    if(!Array.isArray(words))return [];
    const out=[];
    for(const item of words){
      if(!item||typeof item!=='object')continue;
      const ws=this.strictNumber(item.start),we=this.strictNumber(item.end),word=String(item.word??'').trim();
      if(ws===null||we===null||!word||we<=ws||we<=start||ws>=end)continue;
      const next=this.clone(item);next.start=Math.max(start,ws);next.end=Math.min(end,we);next.duration=+(next.end-next.start).toFixed(6);out.push(next);
    }
    out.sort((a,b)=>a.start-b.start||a.end-b.end);
    return out.map((item,index)=>({...item,index}));
  }
  mergeWithNext(project,clipId,{maxGap=.75}={}){
    const valid=this.validateProject(project);if(!valid.ok)return valid;
    const key=this.idKey(clipId);if(key===null)return {ok:false,reason:'invalid-id'};
    const source=project.clips.find(c=>this.idKey(c.id)===key);if(!source)return {ok:false,reason:'not-found'};
    const sourceBounds=this.bounds(source);if(sourceBounds.track!=='3')return {ok:false,reason:'not-caption'};
    if(this.locked(project,source))return {ok:false,reason:'locked'};
    const gapLimit=this.strictNumber(maxGap);if(gapLimit===null||gapLimit<0)return {ok:false,reason:'invalid-gap'};
    const captions=project.clips.filter(c=>this.trackKey(c.track)==='3'&&this.idKey(c.id)!==key).map(c=>({clip:c,b:this.bounds(c)})).filter(x=>x.b&&x.b.start>=sourceBounds.end-1e-6).sort((a,b)=>a.b.start-b.b.start||a.b.end-b.b.end);
    if(!captions.length)return {ok:false,reason:'no-next'};
    const target=captions[0],gap=Math.max(0,target.b.start-sourceBounds.end);
    if(gap>gapLimit+1e-6)return {ok:false,reason:'gap-too-large',gap:+gap.toFixed(6),maxGap:gapLimit};
    if(this.locked(project,target.clip))return {ok:false,reason:'next-locked',nextId:target.clip.id};
    const merged=this.clone(source),end=Math.max(sourceBounds.end,target.b.end);merged.duration=+(end-sourceBounds.start).toFixed(6);
    const leftText=String(source.name??'').trim(),rightText=String(target.clip.name??'').trim();merged.name=[leftText,rightText].filter(Boolean).join(' ').replace(/\s+/g,' ').trim()||'Caption';
    const sourceHasWords=Array.isArray(source.wordTimings)&&source.wordTimings.length>0,targetHasWords=Array.isArray(target.clip.wordTimings)&&target.clip.wordTimings.length>0;
    if(sourceHasWords&&targetHasWords){merged.wordTimings=this.normalizeWords([...source.wordTimings,...target.clip.wordTimings],sourceBounds.start,end)}
    else if(sourceHasWords||targetHasWords){delete merged.wordTimings;merged.animation='none'}
    if(source.groupId!==target.clip.groupId)delete merged.groupId;
    const nextClips=project.clips.map(c=>this.idKey(c.id)===key?merged:c).filter(c=>this.idKey(c.id)!==this.idKey(target.clip.id));
    project.clips=nextClips;
    return {ok:true,merged,removedId:target.clip.id,gap:+gap.toFixed(6),wordTimings:Array.isArray(merged.wordTimings)?merged.wordTimings.length:0,styleMismatch:source.style!==target.clip.style||source.animation!==target.clip.animation};
  }
}
if(typeof window!=='undefined')window.ProfitMenteCaptionMergeEngine=ProfitMenteCaptionMergeEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteCaptionMergeEngine;
