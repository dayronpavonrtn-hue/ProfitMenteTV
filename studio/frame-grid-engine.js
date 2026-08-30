class ProfitMenteFrameGridEngine{
  static normalizeFps(value){
    const E=typeof ProfitMenteProjectFrameRateEngine!=='undefined'?ProfitMenteProjectFrameRateEngine:null;
    if(E?.normalize)return E.normalize(value);
    const n=Math.round(Number(value));return [24,30,60].includes(n)?n:30;
  }
  static frameDuration(fps){return 1/this.normalizeFps(fps)}
  static frameIndex(time,fps,mode='nearest'){
    const frames=Math.max(0,(Number(time)||0)*this.normalizeFps(fps));
    if(mode==='floor')return Math.floor(frames+1e-9);
    if(mode==='ceil')return Math.ceil(frames-1e-9);
    return Math.round(frames);
  }
  static snapTime(time,fps,mode='nearest'){
    const rate=this.normalizeFps(fps),frame=this.frameIndex(time,rate,mode);
    return Number((frame/rate).toFixed(9));
  }
  static isAligned(time,fps,tolerance=1e-6){
    const t=Math.max(0,Number(time)||0),snapped=this.snapTime(t,fps);
    return Math.abs(t-snapped)<=Math.max(1e-9,Number(tolerance)||0);
  }
  static trackLocked(project,track){
    const state=project?.trackState||{},value=state[track]??state[String(track)]??{};
    return !!(value&&typeof value==='object'&&value.locked);
  }
  static audit(project,{skipLocked=false}={}){
    const fps=this.normalizeFps(project?.fps),report={fps,clipBoundaries:0,wordBoundaries:0,markers:0,workRange:0,skippedLocked:0,total:0};
    for(const clip of project?.clips||[]){
      if(skipLocked&&this.trackLocked(project,clip?.track)){report.skippedLocked++;continue}
      const start=Math.max(0,Number(clip?.start)||0),duration=Math.max(0,Number(clip?.duration)||0),end=start+duration;
      if(!this.isAligned(start,fps))report.clipBoundaries++;
      if(!this.isAligned(end,fps))report.clipBoundaries++;
      for(const word of Array.isArray(clip?.wordTimings)?clip.wordTimings:[]){
        if(!this.isAligned(word?.start,fps))report.wordBoundaries++;
        if(!this.isAligned(word?.end,fps))report.wordBoundaries++;
      }
    }
    for(const marker of project?.markers||[])if(!this.isAligned(marker?.time,fps))report.markers++;
    const range=project?.workRange;
    if(range&&typeof range==='object'){
      if(Number.isFinite(Number(range.start))&&!this.isAligned(range.start,fps))report.workRange++;
      if(Number.isFinite(Number(range.end))&&!this.isAligned(range.end,fps))report.workRange++;
    }
    report.total=report.clipBoundaries+report.wordBoundaries+report.markers+report.workRange;return report;
  }
  static conformProject(project,{skipLocked=true}={}){
    if(!project||typeof project!=='object')throw new TypeError('Proyecto inválido');
    const fps=this.normalizeFps(project.fps),frame=this.frameDuration(fps),before=this.audit(project,{skipLocked});let changed=0,skippedLocked=0;
    const set=(obj,key,value)=>{const old=Number(obj?.[key]);if(!Number.isFinite(old)||Math.abs(old-value)>1e-9){obj[key]=value;changed++}};
    for(const clip of project.clips||[]){
      if(skipLocked&&this.trackLocked(project,clip?.track)){skippedLocked++;continue}
      const originalStart=Math.max(0,Number(clip.start)||0),originalDuration=Math.max(frame,Number(clip.duration)||frame);
      const start=this.snapTime(originalStart,fps),duration=Math.max(frame,this.snapTime(originalDuration,fps,'floor'));
      set(clip,'start',start);set(clip,'duration',duration);
      const clipEnd=start+duration;
      if(Array.isArray(clip.wordTimings)){
        for(const word of clip.wordTimings){
          let ws=this.snapTime(Math.max(start,Number(word?.start)||start),fps),we=this.snapTime(Math.min(clipEnd,Number(word?.end)||ws+frame),fps);
          ws=Math.max(start,Math.min(clipEnd-frame,ws));we=Math.min(clipEnd,Math.max(ws+frame,we));
          set(word,'start',ws);set(word,'end',we);if(Object.prototype.hasOwnProperty.call(word,'duration'))set(word,'duration',Math.max(frame,we-ws));
        }
      }
    }
    for(const marker of project.markers||[])set(marker,'time',this.snapTime(marker?.time,fps));
    const range=project.workRange;
    if(range&&typeof range==='object'){
      const limit=Math.max(frame,Number(project.duration)||frame),start=this.snapTime(Math.max(0,Number(range.start)||0),fps,'floor');
      let end=this.snapTime(Math.min(limit,Number.isFinite(Number(range.end))?Number(range.end):limit),fps,'ceil');end=Math.max(start+frame,end);
      if(end>limit&&this.isAligned(limit,fps))end=limit;set(range,'start',start);set(range,'end',end);
    }
    return {fps,frameDuration:frame,changed,skippedLocked,before,after:this.audit(project,{skipLocked})};
  }
}
if(typeof window!=='undefined')window.ProfitMenteFrameGridEngine=ProfitMenteFrameGridEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteFrameGridEngine;
