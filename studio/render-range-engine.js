class ProfitMenteRenderRangeEngine{
  static timingNumber(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string')return null;
    const raw=value.trim();if(!raw||!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw))return null;
    const numeric=Number(raw);return Number.isFinite(numeric)?numeric:null;
  }
  static round(value){const numeric=Number(value);return Number.isFinite(numeric)?Math.round(numeric*1000000)/1000000:0}
  static wordTimingsAreRelative(clip={}){
    const rawMode=typeof clip.wordTimingMode==='string'?clip.wordTimingMode.trim().toLowerCase():'';
    if(rawMode==='relative')return true;if(rawMode==='absolute')return false;
    const timings=Array.isArray(clip.wordTimings)?clip.wordTimings:[];
    if(timings.some(item=>item?.relative===true))return true;
    const start=this.timingNumber(clip.start),duration=this.timingNumber(clip.duration);if(start===null||duration===null||start<=1e-6||duration<=0)return false;
    const valid=timings.map(item=>({start:this.timingNumber(item?.start),end:this.timingNumber(item?.end)})).filter(item=>item.start!==null&&item.end!==null&&item.end>item.start);
    return !!valid.length&&valid.every(item=>item.start>=-1e-6&&item.end<=duration+1e-6)&&valid.some(item=>item.start<start-1e-6);
  }
  static clippedWordTimings(clip,from,to,range){
    if(!Array.isArray(clip?.wordTimings))return null;
    const relative=this.wordTimingsAreRelative(clip),clipStart=this.timingNumber(clip.start)??0,out=[];
    for(const timing of clip.wordTimings){
      if(!timing||typeof timing!=='object'||Array.isArray(timing))continue;
      const rawStart=this.timingNumber(timing.start),rawEnd=this.timingNumber(timing.end);if(rawStart===null||rawEnd===null||rawEnd<=rawStart)continue;
      const absoluteStart=relative?clipStart+rawStart:rawStart,absoluteEnd=relative?clipStart+rawEnd:rawEnd;
      const clippedStart=Math.max(from,absoluteStart),clippedEnd=Math.min(to,absoluteEnd);if(clippedEnd<=clippedStart)continue;
      const next=structuredClone(timing);
      if(relative){next.start=this.round(clippedStart-from);next.end=this.round(clippedEnd-from)}
      else{next.start=this.round(clippedStart-range.start);next.end=this.round(clippedEnd-range.start)}
      if(Object.prototype.hasOwnProperty.call(next,'duration'))next.duration=this.round(next.end-next.start);
      out.push(next);
    }
    out.sort((a,b)=>a.start-b.start||a.end-b.end);
    return out.map((item,index)=>Object.prototype.hasOwnProperty.call(item,'index')?{...item,index}:item);
  }
  static normalize(project,start,end){
    const duration=Math.max(.001,Number(project?.duration)||.001),rawStart=Number(start),rawEnd=Number(end),a=Math.max(0,Math.min(duration,Number.isFinite(rawStart)?rawStart:0)),b=Math.max(0,Math.min(duration,Number.isFinite(rawEnd)?rawEnd:duration));
    return {start:Math.min(a,b),end:Math.max(a,b),duration:Math.max(0,Math.abs(b-a))};
  }
  static valid(project,start,end,min=.25){return this.normalize(project,start,end).duration>=min}
  static previewDecision(project,start,end,time,loop=false,tolerance=.015){
    const range=this.normalize(project,start,end),t=Number(time),eps=Math.max(0,Number(tolerance)||0);
    if(range.duration<.25)return {action:'invalid',range};
    if(!Number.isFinite(t))return {action:'seek-start',time:range.start,range};
    if(t<range.start-eps)return {action:'seek-start',time:range.start,range};
    if(t>=range.end-eps)return loop?{action:'loop',time:range.start,range}:{action:'stop',time:range.start,range};
    return {action:'continue',time:t,range};
  }
  static clip(projectClip,range,assets=[]){
    const c=structuredClone(projectClip),start=Number(c.start)||0,duration=Math.max(0,Number(c.duration)||0),end=start+duration;
    const from=Math.max(start,range.start),to=Math.min(end,range.end);if(to<=from)return null;
    const words=this.clippedWordTimings(projectClip,from,to,range),delta=from-start;c.start=from-range.start;c.duration=to-from;
    if(c.asset){
      const asset=assets.find(a=>a?.id===c.asset),speed=Math.max(.01,Number(c.speed)||1);
      if(asset?.type==='image')c.sourceOffset=0;
      else c.sourceOffset=Math.max(0,(Number(c.sourceOffset)||0)+delta*speed);
    }
    if(words)c.wordTimings=words;
    return c;
  }
  static extract(project,start,end,assets=[]){
    const range=this.normalize(project,start,end);if(range.duration<.25)throw new Error('El rango debe durar al menos 0.25 segundos.');
    const next=structuredClone(project||{});next.duration=range.duration;next.name=`${project?.name||'Proyecto'} · ${this.time(range.start)}-${this.time(range.end)}`;
    next.clips=(project?.clips||[]).map(c=>this.clip(c,range,assets)).filter(Boolean);
    if(Array.isArray(project?.markers))next.markers=project.markers.filter(m=>Number(m?.time)>=range.start&&Number(m?.time)<=range.end).map(m=>({...structuredClone(m),time:Number(m.time)-range.start}));
    next.renderRange={sourceStart:range.start,sourceEnd:range.end,sourceDuration:Number(project?.duration)||range.end};
    delete next.workRange;return next;
  }
  static time(sec){sec=Math.max(0,Number(sec)||0);const m=Math.floor(sec/60),s=sec-m*60;return `${String(m).padStart(2,'0')}:${s.toFixed(2).padStart(5,'0')}`}
}
if(typeof window!=='undefined')window.ProfitMenteRenderRangeEngine=ProfitMenteRenderRangeEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteRenderRangeEngine;
