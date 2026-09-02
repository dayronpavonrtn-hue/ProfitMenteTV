class ProfitMenteSourceMonitorEngine{
  static minimum(){return .25}
  static duration(asset){
    if(asset?.type==='image')return 5;
    const n=Number(asset?.duration);return Number.isFinite(n)&&n>0?n:0;
  }
  static tracks(asset){
    if(asset?.type==='audio')return [{id:4,label:'SFX'},{id:5,label:'Música'},{id:6,label:'Voz'}];
    if(asset?.type==='video'||asset?.type==='image')return [{id:0,label:'Video'},{id:1,label:'Overlay'}];
    return [];
  }
  static defaultTrack(asset){return asset?.type==='audio'?5:0}
  static clamp(value,min,max){const n=Number(value);return Math.max(min,Math.min(max,Number.isFinite(n)?n:min))}
  static normalizeRange(asset,inPoint=0,outPoint=null,minDuration=this.minimum()){
    const total=this.duration(asset),min=Math.max(.001,Number(minDuration)||this.minimum());
    if(asset?.type==='image')return {in:0,out:total,duration:total,total,valid:total>0};
    if(total<=0)return {in:0,out:0,duration:0,total,valid:false,reason:'unknown-duration'};
    let start=this.clamp(inPoint,0,total),end=this.clamp(outPoint==null?total:outPoint,0,total);
    if(end<start)[start,end]=[end,start];
    if(end-start<min){
      if(start+min<=total)end=start+min;
      else{end=total;start=Math.max(0,total-min)}
    }
    const duration=Math.max(0,end-start);
    return {in:start,out:end,duration,total,valid:duration>=Math.min(min,total)-.001,reason:duration>0?null:'empty-range'};
  }
  static selection(asset,inPoint,outPoint,at,projectDuration,minDuration=this.minimum(),allowExtend=false){
    const range=this.normalizeRange(asset,inPoint,outPoint,minDuration),total=Math.max(0,Number(projectDuration)||0),start=this.clamp(at,0,total),available=Math.max(0,total-start);
    if(!range.valid)return {...range,start,available,valid:false};
    const duration=allowExtend?range.duration:Math.min(range.duration,available),valid=duration>=Math.min(Number(minDuration)||this.minimum(),range.duration)-.001;
    return {...range,out:range.in+duration,duration,start,available,projectEnd:start+duration,extendsProject:!!allowExtend&&start+duration>total+.001,sourceOffset:asset?.type==='image'?0:range.in,valid,reason:valid?null:'project-end'};
  }
  static time(sec){
    const n=Math.max(0,Number(sec)||0),m=Math.floor(n/60),s=n-m*60;
    return `${String(m).padStart(2,'0')}:${s.toFixed(2).padStart(5,'0')}`;
  }
}
if(typeof window!=='undefined')window.ProfitMenteSourceMonitorEngine=ProfitMenteSourceMonitorEngine;
if(typeof globalThis!=='undefined')globalThis.ProfitMenteSourceMonitorEngine=ProfitMenteSourceMonitorEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteSourceMonitorEngine;
