(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteRangeEditEngine{
    constructor(options={}){this.idFactory=options.idFactory||(()=>globalThis.crypto?.randomUUID?.()||`range-${Date.now()}-${Math.random().toString(16).slice(2)}`)}
    num(v,f=0){v=Number(v);return Number.isFinite(v)?v:f}
    speed(c){return Math.max(.25,Math.min(4,this.num(c?.speed,1)||1))}
    clone(v){return structuredClone(v)}
    end(c){return this.num(c?.start)+Math.max(0,this.num(c?.duration))}
    interpolate(a,b,p){
      const out={};for(const key of new Set([...Object.keys(a||{}),...Object.keys(b||{})])){const x=Number(a?.[key]),y=Number(b?.[key]);if(Number.isFinite(x)&&Number.isFinite(y))out[key]=x+(y-x)*p;else if(a?.[key]!==undefined)out[key]=this.clone(a[key]);else out[key]=this.clone(b[key])}return out
    }
    shiftWords(clip,sourceStart,sourceEnd,delta){
      if(!Array.isArray(clip.wordTimings))return;
      const words=[];for(const timing of clip.wordTimings){if(!timing||typeof timing!=='object')continue;const ws=this.num(timing.start,NaN),we=this.num(timing.end,NaN);if(!Number.isFinite(ws)||!Number.isFinite(we)||we<=ws||we<=sourceStart||ws>=sourceEnd)continue;const item=this.clone(timing);item.start=Math.max(sourceStart,ws)+delta;item.end=Math.min(sourceEnd,we)+delta;item.duration=Math.max(0,item.end-item.start);if(item.duration>.0001)words.push(item)}
      clip.wordTimings=words.map((x,index)=>({...x,index}));if(Number(clip.track)===3){const text=clip.wordTimings.map(x=>String(x.word||'').trim()).filter(Boolean).join(' ');if(text)clip.name=text}
    }
    segment(original,sourceStart,sourceEnd,newStart,{keepId=false,leftEdge=false,rightEdge=false}={}){
      const os=this.num(original.start),oe=this.end(original),od=Math.max(.000001,oe-os),ss=Math.max(os,sourceStart),se=Math.min(oe,sourceEnd);if(se<=ss+.000001)return null;
      const c=this.clone(original);if(!keepId)c.id=this.idFactory();c.start=newStart;c.duration=se-ss;
      if(original.asset)c.sourceOffset=Math.max(0,this.num(original.sourceOffset)+(ss-os)*this.speed(original));
      if(original.keyframes?.start&&original.keyframes?.end){const p1=(ss-os)/od,p2=(se-os)/od;c.keyframes={start:this.interpolate(original.keyframes.start,original.keyframes.end,p1),end:this.interpolate(original.keyframes.start,original.keyframes.end,p2)}}
      if(Object.prototype.hasOwnProperty.call(original,'fadeIn'))c.fadeIn=leftEdge?Math.min(c.duration,Math.max(0,this.num(original.fadeIn))):0;
      if(Object.prototype.hasOwnProperty.call(original,'fadeOut'))c.fadeOut=rightEdge?Math.min(c.duration,Math.max(0,this.num(original.fadeOut))):0;
      if(!leftEdge&&Object.prototype.hasOwnProperty.call(original,'transition'))c.transition='cut';
      this.shiftWords(c,ss,se,newStart-ss);return c
    }
    lockedBlockers(project,from){
      const states=project?.trackState||{};return (project?.clips||[]).filter(c=>states?.[c.track]?.locked&&this.end(c)>from+.001)
    }
    mapTimeExtract(t,start,end){t=this.num(t);if(t<=start)return t;if(t>=end)return t-(end-start);return start}
    mapTimeInsert(t,at,duration){t=this.num(t);return t>=at?t+duration:t}
    remapMarkers(project,fn,{dropStart=null,dropEnd=null}={}){
      if(!Array.isArray(project.markers))return;
      project.markers=project.markers.filter(m=>{const t=this.num(m?.time,NaN);return Number.isFinite(t)&&!(dropStart!==null&&t>dropStart+.0001&&t<dropEnd-.0001)}).map(m=>({...m,time:Math.max(0,fn(m.time))}))
    }
    remapWorkRange(project,fn){if(!project.workRange)return;const a=fn(project.workRange.start),b=fn(project.workRange.end);project.workRange={start:Math.max(0,Math.min(a,b)),end:Math.max(0,Math.max(a,b))}}
    extract(project,start,end){
      start=Math.max(0,this.num(start));end=Math.min(this.num(project?.duration),this.num(end));if(!(end-start>=.05))throw new Error('El rango debe durar al menos 0.05s');
      const blockers=this.lockedBlockers(project,start);if(blockers.length)throw new Error(`Desbloquea las pistas afectadas antes de extraer el rango (${blockers.length} clip${blockers.length===1?'':'s'})`);
      const delta=end-start,next=[];let removed=0,trimmed=0,moved=0,split=0;
      for(const original of project.clips||[]){const os=this.num(original.start),oe=this.end(original);if(oe<=start+.000001){next.push(original);continue}if(os>=end-.000001){const c=this.clone(original);c.start=os-delta;this.shiftWords(c,os,oe,-delta);next.push(c);moved++;continue}
        const hasLeft=os<start-.000001,hasRight=oe>end+.000001;if(!hasLeft&&!hasRight){removed++;continue}
        if(hasLeft){const left=this.segment(original,os,start,os,{keepId:true,leftEdge:true,rightEdge:false});if(left)next.push(left)}
        if(hasRight){const right=this.segment(original,end,oe,end-delta,{keepId:!hasLeft,leftEdge:false,rightEdge:true});if(right)next.push(right)}
        if(hasLeft&&hasRight)split++;else trimmed++;
      }
      project.clips=next;project.duration=Math.max(.05,this.num(project.duration)-delta);this.remapMarkers(project,t=>this.mapTimeExtract(t,start,end),{dropStart:start,dropEnd:end});this.remapWorkRange(project,t=>this.mapTimeExtract(t,start,end));
      return {start,end,duration:delta,removed,trimmed,moved,split,newDuration:project.duration}
    }
    insert(project,at,duration){
      at=Math.max(0,Math.min(this.num(project?.duration),this.num(at)));duration=Math.max(.05,this.num(duration));if(duration>3600)throw new Error('El hueco no puede superar 3600s');
      const blockers=this.lockedBlockers(project,at);if(blockers.length)throw new Error(`Desbloquea las pistas afectadas antes de insertar tiempo (${blockers.length} clip${blockers.length===1?'':'s'})`);
      const next=[];let moved=0,split=0;
      for(const original of project.clips||[]){const os=this.num(original.start),oe=this.end(original);if(oe<=at+.000001){next.push(original);continue}if(os>=at-.000001){const c=this.clone(original);c.start=os+duration;this.shiftWords(c,os,oe,duration);next.push(c);moved++;continue}
        const left=this.segment(original,os,at,os,{keepId:true,leftEdge:true,rightEdge:false});const right=this.segment(original,at,oe,at+duration,{keepId:false,leftEdge:false,rightEdge:true});if(left)next.push(left);if(right)next.push(right);split++
      }
      project.clips=next;project.duration=this.num(project.duration)+duration;this.remapMarkers(project,t=>this.mapTimeInsert(t,at,duration));this.remapWorkRange(project,t=>this.mapTimeInsert(t,at,duration));return {at,duration,moved,split,newDuration:project.duration}
    }
  }
  root.ProfitMenteRangeEditEngine=ProfitMenteRangeEditEngine;
})();
