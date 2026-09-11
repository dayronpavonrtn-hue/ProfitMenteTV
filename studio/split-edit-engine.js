class ProfitMenteSplitEditEngine{
  static speed(clip={}){return Math.max(.25,Math.min(4,Number(clip.speed)||1))}
  static clone(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value))}
  static timingNumber(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string')return null;
    const raw=value.trim();if(!raw||!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw))return null;
    const numeric=Number(raw);return Number.isFinite(numeric)?numeric:null;
  }
  static round(value){const numeric=Number(value);return Number.isFinite(numeric)?Math.round(numeric*1000000)/1000000:0}
  static partitionWordTimings(timings,start,split,end){
    if(!Array.isArray(timings))return null;
    const lo=this.timingNumber(start),cut=this.timingNumber(split),hi=this.timingNumber(end);if(lo===null||cut===null||hi===null||cut<=lo||cut>=hi)return {left:[],right:[]};
    const left=[],right=[];
    const pushClipped=(target,timing,boundStart,boundEnd,ws,we)=>{
      const next=this.clone(timing);next.start=this.round(Math.max(boundStart,ws));next.end=this.round(Math.min(boundEnd,we));next.duration=this.round(Math.max(0,next.end-next.start));if(next.duration>0)target.push(next);
    };
    for(const timing of timings){
      if(!timing||typeof timing!=='object'||Array.isArray(timing))continue;
      const ws=this.timingNumber(timing.start),we=this.timingNumber(timing.end);if(ws===null||we===null||we<=ws||we<=lo||ws>=hi)continue;
      if(ws<cut&&we>lo)pushClipped(left,timing,lo,cut,ws,we);
      if(we>cut&&ws<hi)pushClipped(right,timing,cut,hi,ws,we);
    }
    const normalize=list=>list.sort((a,b)=>a.start-b.start||a.end-b.end).map((item,index)=>{const next={...item};if(Object.prototype.hasOwnProperty.call(next,'index'))next.index=index;return next});
    return {left:normalize(left),right:normalize(right)};
  }
  static interpolate(a,b,t){
    if(typeof a==='number'&&Number.isFinite(a)&&typeof b==='number'&&Number.isFinite(b))return a+(b-a)*t;
    return t<.5?this.clone(a):this.clone(b);
  }
  static keyframeMid(keyframes,ratio){
    if(!keyframes?.start||!keyframes?.end)return null;
    const start=keyframes.start,end=keyframes.end,mid={};
    for(const key of new Set([...Object.keys(start),...Object.keys(end)])){
      const a=start[key],b=end[key];
      if(a==null)mid[key]=this.clone(b);else if(b==null)mid[key]=this.clone(a);else mid[key]=this.interpolate(a,b,ratio);
    }
    return mid;
  }
  static canSplit(clip={},time,minEdge=.05){
    const start=Number(clip.start)||0,duration=Math.max(0,Number(clip.duration)||0),t=Number(time),end=start+duration;
    return Number.isFinite(t)&&duration>minEdge*2&&t>start+minEdge&&t<end-minEdge;
  }
  static split(clip={},time,{idFactory,minEdge=.05}={}){
    if(!this.canSplit(clip,time,minEdge))return {ok:false,reason:'outside'};
    const start=Number(clip.start)||0,originalDuration=Math.max(0,Number(clip.duration)||0),end=start+originalDuration,t=Number(time),leftDuration=t-start,rightDuration=end-t,ratio=leftDuration/originalDuration,speed=this.speed(clip),sourceOffset=Math.max(0,Number(clip.sourceOffset)||0),sourceCut=sourceOffset+leftDuration*speed;
    const left=this.clone(clip),right=this.clone(clip);
    left.duration=leftDuration;right.start=t;right.duration=rightDuration;right.id=typeof idFactory==='function'?idFactory():globalThis.crypto?.randomUUID?.()||`split-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    right.sourceOffset=sourceCut;
    const base=String(clip.name||'Clip').replace(/ · [12]$/,'');left.name=base+' · 1';right.name=base+' · 2';
    const words=this.partitionWordTimings(clip.wordTimings,start,t,end);
    if(words){
      left.wordTimings=words.left;right.wordTimings=words.right;
      if(Number(clip.track)===3){const leftText=words.left.map(item=>String(item.word??'').trim()).filter(Boolean).join(' '),rightText=words.right.map(item=>String(item.word??'').trim()).filter(Boolean).join(' ');if(leftText)left.name=leftText;if(rightText)right.name=rightText}
    }
    const mid=this.keyframeMid(clip.keyframes,ratio);
    if(mid){left.keyframes={...this.clone(clip.keyframes),end:this.clone(mid)};right.keyframes={...this.clone(clip.keyframes),start:this.clone(mid)}}
    if([4,5,6].includes(Number(clip.track))||clip.fadeIn!=null||clip.fadeOut!=null){left.fadeOut=0;right.fadeIn=0}
    return {ok:true,left,right,ratio,speed,sourceCut,wordTimings:words?{left:words.left.length,right:words.right.length}:null};
  }
}
if(typeof window!=='undefined')window.ProfitMenteSplitEditEngine=ProfitMenteSplitEditEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteSplitEditEngine;
