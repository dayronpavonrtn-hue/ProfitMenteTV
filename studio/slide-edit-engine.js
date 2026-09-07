(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  const EPS=1e-6;
  function strictNumber(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string')return null;
    const text=value.trim();if(!text||!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(text))return null;
    const n=Number(text);return Number.isFinite(n)?n:null;
  }
  function scalarKey(value){
    if(typeof value==='number')return Number.isFinite(value)?`n:${Object.is(value,-0)?0:value}`:null;
    if(typeof value!=='string')return null;
    const text=value.trim();if(!text)return null;
    if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(text)){
      const n=Number(text);if(Number.isFinite(n))return `n:${Object.is(n,-0)?0:n}`;
    }
    return `s:${text}`;
  }
  function sameScalar(a,b){const x=scalarKey(a),y=scalarKey(b);return x!==null&&x===y}
  function clipWindow(clip){
    const start=strictNumber(clip?.start),duration=strictNumber(clip?.duration);
    return start!==null&&start>=0&&duration!==null&&duration>0?{start,duration,end:start+duration}:null;
  }
  function speed(clip){const n=Object.prototype.hasOwnProperty.call(clip||{},'speed')?strictNumber(clip.speed):1;return n!==null&&n>0?n:null}
  function sourceOffset(clip){const n=Object.prototype.hasOwnProperty.call(clip||{},'sourceOffset')?strictNumber(clip.sourceOffset):0;return n!==null&&n>=0?n:null}
  function sourceDuration(asset){const n=strictNumber(asset?.duration);return n!==null&&n>=0?n:null}
  function trackLocked(project,track){
    const key=scalarKey(track);if(key===null)return true;
    const find=states=>{if(!states||typeof states!=='object')return null;for(const [candidate,state] of Object.entries(states))if(sameScalar(candidate,track))return state;return null};
    return find(project?.trackState)?.locked===true||find(project?.trackStates)?.locked===true;
  }
  function clipLocked(project,clip){return clip?.locked===true||trackLocked(project,clip?.track)}
  function assetFor(assets,id){
    if(id===undefined||id===null)return null;
    const matches=(assets||[]).filter(a=>sameScalar(a?.id,id));
    return matches.length===1?matches[0]:null;
  }
  function shiftedWords(words,delta){
    if(!Array.isArray(words))return words;
    return words.map(item=>{
      if(!item||typeof item!=='object')throw new Error('invalid-word-timing');
      const s=strictNumber(item.start),e=strictNumber(item.end);if(s===null||e===null||e<=s)throw new Error('invalid-word-timing');
      return {...item,start:s+delta,end:e+delta,duration:e-s};
    });
  }
  function trimWords(words,start,end){
    if(!Array.isArray(words))return words;
    const out=[];
    for(const item of words){
      if(!item||typeof item!=='object')throw new Error('invalid-word-timing');
      const s=strictNumber(item.start),e=strictNumber(item.end);if(s===null||e===null||e<=s)throw new Error('invalid-word-timing');
      if(e<=start||s>=end)continue;
      const ns=Math.max(start,s),ne=Math.min(end,e);if(ne>ns)out.push({...item,start:ns,end:ne,duration:ne-ns});
    }
    return out.map((item,index)=>({...item,index}));
  }
  class ProfitMenteSlideEditEngine{
    constructor(options={}){
      const min=strictNumber(options.minDuration),tol=strictNumber(options.tolerance);
      this.minDuration=min!==null&&min>0?min:.05;this.tolerance=tol!==null&&tol>0?tol:.02;
    }
    context(project,id,assets=[]){
      if(!project||!Array.isArray(project.clips))return {ok:false,reason:'invalid-project'};
      const idKey=scalarKey(id);if(idKey===null)return {ok:false,reason:'invalid-id'};
      const matches=project.clips.filter(c=>scalarKey(c?.id)===idKey);if(matches.length!==1)return {ok:false,reason:matches.length?'ambiguous-id':'missing'};
      const clip=matches[0],cw=clipWindow(clip);if(!cw)return {ok:false,reason:'invalid-clip'};
      if(clipLocked(project,clip))return {ok:false,reason:'locked'};
      const trackKey=scalarKey(clip.track);if(trackKey===null)return {ok:false,reason:'invalid-track'};
      const same=project.clips.filter(c=>c!==clip&&scalarKey(c?.track)===trackKey);
      for(const c of same)if(!clipWindow(c))return {ok:false,reason:'invalid-neighbor'};
      const leftCandidates=same.filter(c=>Math.abs(clipWindow(c).end-cw.start)<=this.tolerance).sort((a,b)=>clipWindow(b).start-clipWindow(a).start);
      const rightCandidates=same.filter(c=>Math.abs(clipWindow(c).start-cw.end)<=this.tolerance).sort((a,b)=>clipWindow(a).start-clipWindow(b).start);
      if(leftCandidates.length!==1||rightCandidates.length!==1)return {ok:false,reason:'needs-two-adjacent'};
      const left=leftCandidates[0],right=rightCandidates[0];if(left===right)return {ok:false,reason:'invalid-neighbors'};
      if(clipLocked(project,left)||clipLocked(project,right))return {ok:false,reason:'locked'};
      const lw=clipWindow(left),rw=clipWindow(right),ls=speed(left),rs=speed(right),lo=sourceOffset(left),ro=sourceOffset(right);
      if(ls===null||rs===null||lo===null||ro===null)return {ok:false,reason:'invalid-source-window'};
      const la=left.asset==null?null:assetFor(assets,left.asset),ra=right.asset==null?null:assetFor(assets,right.asset);
      let maxDelta=rw.duration-this.minDuration;
      if(left.asset!=null&&la&&la.type!=='image'){
        const total=sourceDuration(la);if(total!==null&&total>0)maxDelta=Math.min(maxDelta,(total-lo)/ls-lw.duration);
      }
      let minDelta=-(lw.duration-this.minDuration);
      if(right.asset!=null&&ra&&ra.type!=='image')minDelta=Math.max(minDelta,-ro/rs);
      minDelta=Math.min(0,minDelta);maxDelta=Math.max(0,maxDelta);
      return {ok:true,reason:'ok',clip,left,right,minDelta:+minDelta.toFixed(6),maxDelta:+maxDelta.toFixed(6),start:cw.start,end:cw.end};
    }
    slide(project,id,assets,requestedDelta){
      const ctx=this.context(project,id,assets);if(!ctx.ok)return {...ctx,changed:false,delta:0};
      const requested=strictNumber(requestedDelta);if(requested===null)return {...ctx,ok:false,reason:'invalid-delta',changed:false,delta:0};
      const delta=Math.max(ctx.minDelta,Math.min(ctx.maxDelta,requested));
      if(Math.abs(delta)<=EPS)return {...ctx,changed:false,delta:0,clamped:Math.abs(requested)>EPS};
      const {clip,left,right}=ctx,lw=clipWindow(left),cw=clipWindow(clip),rw=clipWindow(right),rs=speed(right),ro=sourceOffset(right);
      let prepared;
      try{
        const nextLeft={...left,duration:lw.duration+delta};
        const nextClip={...clip,start:cw.start+delta};
        const nextRight={...right,start:rw.start+delta,duration:rw.duration-delta,sourceOffset:ro+delta*rs};
        if(nextLeft.duration<this.minDuration-EPS||nextRight.duration<this.minDuration-EPS||nextRight.sourceOffset<-EPS)throw new Error('invalid-bounds');
        if(Array.isArray(left.wordTimings))nextLeft.wordTimings=trimWords(left.wordTimings,lw.start,lw.start+nextLeft.duration);
        if(Array.isArray(clip.wordTimings))nextClip.wordTimings=shiftedWords(clip.wordTimings,delta);
        if(Array.isArray(right.wordTimings))nextRight.wordTimings=trimWords(right.wordTimings,nextRight.start,nextRight.start+nextRight.duration);
        nextLeft.duration=+nextLeft.duration.toFixed(6);nextClip.start=+nextClip.start.toFixed(6);nextRight.start=+nextRight.start.toFixed(6);nextRight.duration=+nextRight.duration.toFixed(6);nextRight.sourceOffset=+Math.max(0,nextRight.sourceOffset).toFixed(6);
        prepared=[[left,nextLeft],[clip,nextClip],[right,nextRight]];
      }catch(error){return {...ctx,ok:false,reason:error.message||'invalid-data',changed:false,delta:0};}
      for(const [original,next] of prepared)Object.assign(original,next);
      return {...ctx,changed:true,delta:+delta.toFixed(6),requested:+requested.toFixed(6),clamped:Math.abs(delta-requested)>EPS,start:+clip.start.toFixed(6),end:+(clip.start+clip.duration).toFixed(6)};
    }
  }
  root.ProfitMenteSlideEditEngine=ProfitMenteSlideEditEngine;
  if(typeof module!=='undefined')module.exports={ProfitMenteSlideEditEngine};
})();