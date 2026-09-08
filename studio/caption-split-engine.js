(function(root,factory){const Engine=factory();if(typeof module==='object'&&module.exports)module.exports=Engine;root.ProfitMenteCaptionSplitEngine=Engine})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteCaptionSplitEngine{
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
  fps(project){const n=this.strictNumber(project?.fps);return n!==null&&[24,30,60].includes(Math.round(n))?Math.round(n):30}
  frame(time,fps){return Math.round(time*fps)/fps}
  trackLocked(project,track){
    const key=this.trackKey(track);if(key===null)return false;
    return [project?.trackState,project?.trackStates].some(map=>map&&typeof map==='object'&&Object.entries(map).some(([raw,state])=>this.trackKey(raw)===key&&state&&typeof state==='object'&&state.locked===true));
  }
  locked(project,clip){return clip?.locked===true||this.trackLocked(project,clip?.track)}
  bounds(clip){const start=this.strictNumber(clip?.start),duration=this.strictNumber(clip?.duration),track=this.trackKey(clip?.track);if(start===null||duration===null||start<0||duration<=0||track===null)return null;return {start,duration,end:start+duration,track}}
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
  normalizedWord(item,start,end){
    if(!item||typeof item!=='object')return null;
    const ws=this.strictNumber(item.start),we=this.strictNumber(item.end),word=String(item.word??'').trim();if(ws===null||we===null||!word||we<=ws)return null;
    const next=this.clone(item);next.start=Math.max(start,ws);next.end=Math.min(end,we);if(next.end<=next.start)return null;next.duration=+(next.end-next.start).toFixed(6);return next;
  }
  partitionWords(words,start,split,end){
    const left=[],right=[];
    for(const item of Array.isArray(words)?words:[]){
      if(!item||typeof item!=='object')continue;const ws=this.strictNumber(item.start),we=this.strictNumber(item.end),word=String(item.word??'').trim();if(ws===null||we===null||!word||we<=ws||we<=start||ws>=end)continue;
      const midpoint=(ws+we)/2,target=midpoint<split?left:right,boundStart=target===left?start:split,boundEnd=target===left?split:end,next=this.normalizedWord(item,boundStart,boundEnd);if(next)target.push(next);
    }
    const reindex=list=>list.sort((a,b)=>a.start-b.start||a.end-b.end).map((item,index)=>({...item,index}));return {left:reindex(left),right:reindex(right)};
  }
  splitPlainText(text,ratio){
    const words=String(text??'').trim().split(/\s+/).filter(Boolean);if(words.length<2)return null;
    const cut=Math.max(1,Math.min(words.length-1,Math.round(words.length*ratio)));return [words.slice(0,cut).join(' '),words.slice(cut).join(' ')];
  }
  uniqueId(project,idFactory){
    const used=new Set(project.clips.map(c=>this.idKey(c.id)).filter(Boolean));
    for(let attempt=0;attempt<20;attempt++){
      const candidate=typeof idFactory==='function'?idFactory(attempt):(globalThis.crypto?.randomUUID?.()||`caption-split-${Date.now()}-${Math.random().toString(16).slice(2)}`);const key=this.idKey(candidate);if(key!==null&&!used.has(key))return candidate;
    }
    return null;
  }
  split(project,clipId,time,{idFactory,minFrames=1}={}){
    const valid=this.validateProject(project);if(!valid.ok)return valid;const key=this.idKey(clipId);if(key===null)return {ok:false,reason:'invalid-id'};
    const index=project.clips.findIndex(c=>this.idKey(c.id)===key);if(index<0)return {ok:false,reason:'not-found'};const source=project.clips[index],b=this.bounds(source);if(b.track!=='3')return {ok:false,reason:'not-caption'};if(this.locked(project,source))return {ok:false,reason:'locked'};
    const rawTime=this.strictNumber(time);if(rawTime===null)return {ok:false,reason:'invalid-time'};const frames=this.strictNumber(minFrames);if(frames===null||!Number.isInteger(frames)||frames<1)return {ok:false,reason:'invalid-min-frames'};
    const fps=this.fps(project),split=this.frame(rawTime,fps),edge=frames/fps;if(split<=b.start+edge-1e-9||split>=b.end-edge+1e-9)return {ok:false,reason:'too-close-to-edge',split,fps,minEdge:edge};
    const ratio=(split-b.start)/b.duration,left=this.clone(source),right=this.clone(source),newId=this.uniqueId(project,idFactory);if(newId===null)return {ok:false,reason:'id-exhausted'};
    left.duration=+(split-b.start).toFixed(6);right.id=newId;right.start=+split.toFixed(6);right.duration=+(b.end-split).toFixed(6);
    const hasWords=Array.isArray(source.wordTimings)&&source.wordTimings.some(w=>w&&String(w.word??'').trim());
    if(hasWords){
      const parts=this.partitionWords(source.wordTimings,b.start,split,b.end);left.wordTimings=parts.left;right.wordTimings=parts.right;const leftText=parts.left.map(w=>w.word).join(' ').trim(),rightText=parts.right.map(w=>w.word).join(' ').trim();if(!leftText||!rightText)return {ok:false,reason:'empty-side'};left.name=leftText;right.name=rightText;
    }else{const parts=this.splitPlainText(source.name,ratio);if(!parts)return {ok:false,reason:'text-too-short'};left.name=parts[0];right.name=parts[1];delete left.wordTimings;delete right.wordTimings}
    if(source.groupId!=null){delete left.groupId;delete right.groupId}project.clips=[...project.clips.slice(0,index),left,right,...project.clips.slice(index+1)];
    return {ok:true,left,right,split:+split.toFixed(6),fps,wordTimings:hasWords,leftWords:Array.isArray(left.wordTimings)?left.wordTimings.length:0,rightWords:Array.isArray(right.wordTimings)?right.wordTimings.length:0};
  }
}
return ProfitMenteCaptionSplitEngine;
});
