class ProfitMenteRenderRangeEngine{
  static normalize(project,start,end){
    const duration=Math.max(.001,Number(project?.duration)||.001),a=Math.max(0,Math.min(duration,Number(start)||0)),b=Math.max(0,Math.min(duration,Number(end)||duration));
    return {start:Math.min(a,b),end:Math.max(a,b),duration:Math.max(0,Math.abs(b-a))};
  }
  static valid(project,start,end,min=.25){return this.normalize(project,start,end).duration>=min}
  static clip(projectClip,range,assets=[]){
    const c=structuredClone(projectClip),start=Number(c.start)||0,duration=Math.max(0,Number(c.duration)||0),end=start+duration;
    const from=Math.max(start,range.start),to=Math.min(end,range.end);if(to<=from)return null;
    const delta=from-start;c.start=from-range.start;c.duration=to-from;
    if(c.asset){
      const asset=assets.find(a=>a?.id===c.asset),speed=Math.max(.01,Number(c.speed)||1);
      if(asset?.type==='image')c.sourceOffset=0;
      else c.sourceOffset=Math.max(0,(Number(c.sourceOffset)||0)+delta*speed);
    }
    if(Array.isArray(c.wordTimings))c.wordTimings=c.wordTimings.map(w=>({
      ...w,start:Math.max(0,Number(w.start)-range.start),end:Math.min(range.duration,Number(w.end)-range.start)
    })).filter(w=>Number.isFinite(w.start)&&Number.isFinite(w.end)&&w.end>w.start);
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
