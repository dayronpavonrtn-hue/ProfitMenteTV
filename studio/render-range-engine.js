class ProfitMenteRenderRangeEngine{
  static timingNumber(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string')return null;
    const raw=value.trim();if(!raw||!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw))return null;
    const numeric=Number(raw);return Number.isFinite(numeric)?numeric:null;
  }
  static identityKey(value){
    if(typeof value==='number')return Number.isFinite(value)?`n:${Object.is(value,-0)?0:value}`:null;
    if(typeof value!=='string')return null;
    const raw=value.trim();if(!raw)return null;
    if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(raw)){const numeric=Number(raw);if(Number.isFinite(numeric))return `n:${Object.is(numeric,-0)?0:numeric}`}
    return `s:${raw}`;
  }
  static resolveAsset(assets,id){
    const key=this.identityKey(id);if(key===null)return null;
    const matches=(Array.isArray(assets)?assets:[]).filter(asset=>this.identityKey(asset?.id)===key);
    if(matches.length>1)throw new Error(`La identidad del medio ${String(id)} es ambigua en la biblioteca.`);
    return matches[0]||null;
  }
  static round(value){const numeric=this.timingNumber(value);return numeric!==null?Math.round(numeric*1000000)/1000000:0}
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
    const parsedDuration=this.timingNumber(project?.duration),duration=Math.max(.001,parsedDuration!==null?parsedDuration:.001),rawStart=this.timingNumber(start),rawEnd=this.timingNumber(end),a=Math.max(0,Math.min(duration,rawStart!==null?rawStart:0)),b=Math.max(0,Math.min(duration,rawEnd!==null?rawEnd:duration));
    return {start:Math.min(a,b),end:Math.max(a,b),duration:Math.max(0,Math.abs(b-a))};
  }
  static valid(project,start,end,min=.25){const threshold=this.timingNumber(min);return this.normalize(project,start,end).duration>=(threshold!==null?Math.max(0,threshold):.25)}
  static previewDecision(project,start,end,time,loop=false,tolerance=.015){
    const range=this.normalize(project,start,end),t=this.timingNumber(time),parsedTolerance=this.timingNumber(tolerance),eps=Math.max(0,parsedTolerance!==null?parsedTolerance:.015);
    if(range.duration<.25)return {action:'invalid',range};
    if(t===null)return {action:'seek-start',time:range.start,range};
    if(t<range.start-eps)return {action:'seek-start',time:range.start,range};
    if(t>=range.end-eps)return loop?{action:'loop',time:range.start,range}:{action:'stop',time:range.start,range};
    return {action:'continue',time:t,range};
  }
  static validateProject(project){
    const duration=this.timingNumber(project?.duration);if(duration===null||duration<=0)throw new Error('La duración del proyecto no es numérica o válida.');
    for(const clip of Array.isArray(project?.clips)?project.clips:[]){
      const id=clip?.id||clip?.name||'sin id',start=this.timingNumber(clip?.start),clipDuration=this.timingNumber(clip?.duration);
      if(start===null||clipDuration===null||clipDuration<0)throw new Error(`El clip ${id} contiene tiempos inválidos.`);
      if(Object.prototype.hasOwnProperty.call(clip||{},'speed')){const speed=this.timingNumber(clip.speed);if(speed===null||speed<=0)throw new Error(`El clip ${id} contiene una velocidad inválida.`)}
      if(Object.prototype.hasOwnProperty.call(clip||{},'sourceOffset')){const offset=this.timingNumber(clip.sourceOffset);if(offset===null||offset<0)throw new Error(`El clip ${id} contiene un sourceOffset inválido.`)}
    }
    return duration;
  }
  static clip(projectClip,range,assets=[]){
    const c=structuredClone(projectClip),start=this.timingNumber(c.start),duration=this.timingNumber(c.duration);if(start===null||duration===null||duration<0)return null;
    const end=start+duration,from=Math.max(start,range.start),to=Math.min(end,range.end);if(to<=from)return null;
    const words=this.clippedWordTimings(projectClip,from,to,range),delta=from-start;c.start=from-range.start;c.duration=to-from;
    if(this.identityKey(c.asset)!==null){
      const asset=this.resolveAsset(assets,c.asset),parsedSpeed=this.timingNumber(c.speed),speed=Math.max(.01,parsedSpeed!==null?parsedSpeed:1),parsedOffset=this.timingNumber(c.sourceOffset),sourceOffset=parsedOffset!==null?parsedOffset:0;
      if(asset?.type==='image')c.sourceOffset=0;
      else c.sourceOffset=Math.max(0,sourceOffset+delta*speed);
    }
    if(words)c.wordTimings=words;
    return c;
  }
  static extract(project,start,end,assets=[]){
    const sourceDuration=this.validateProject(project),range=this.normalize(project,start,end);if(range.duration<.25)throw new Error('El rango debe durar al menos 0.25 segundos.');
    const next=structuredClone(project||{});next.duration=range.duration;next.name=`${project?.name||'Proyecto'} · ${this.time(range.start)}-${this.time(range.end)}`;
    next.clips=(project?.clips||[]).map(c=>this.clip(c,range,assets)).filter(Boolean);
    if(Array.isArray(project?.markers))next.markers=project.markers.map(m=>({marker:m,time:this.timingNumber(m?.time)})).filter(item=>item.time!==null&&item.time>=range.start&&item.time<=range.end).map(item=>({...structuredClone(item.marker),time:item.time-range.start}));
    next.renderRange={sourceStart:range.start,sourceEnd:range.end,sourceDuration};
    delete next.workRange;return next;
  }
  static time(sec){const parsed=this.timingNumber(sec);sec=Math.max(0,parsed!==null?parsed:0);const m=Math.floor(sec/60),s=sec-m*60;return `${String(m).padStart(2,'0')}:${s.toFixed(2).padStart(5,'0')}`}
}
if(typeof window!=='undefined')window.ProfitMenteRenderRangeEngine=ProfitMenteRenderRangeEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteRenderRangeEngine;
