(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteTimelineSnapEngine=api.ProfitMenteTimelineSnapEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteTimelineSnapEngine{
  static clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0))}
  static idKey(value){
    if(value===null||value===undefined||typeof value==='boolean')return null;
    const text=String(value).trim();if(!text)return null;
    if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(text)){
      const number=Number(text);if(Number.isFinite(number))return `n:${number}`;
    }
    return `s:${text}`;
  }
  static sameId(a,b){const x=this.idKey(a),y=this.idKey(b);return x!==null&&x===y}
  static points(project={},excludeId=null,playhead=null){
    const duration=Math.max(.001,Number(project.duration)||1),out=[0,duration];
    for(const c of Array.isArray(project.clips)?project.clips:[]){
      if(!c||this.sameId(c.id,excludeId))continue;
      const s=Number(c.start),d=Number(c.duration);
      if(Number.isFinite(s))out.push(this.clamp(s,0,duration));
      if(Number.isFinite(s)&&Number.isFinite(d))out.push(this.clamp(s+d,0,duration));
    }
    if(Number.isFinite(Number(playhead)))out.push(this.clamp(Number(playhead),0,duration));
    return [...new Set(out.map(v=>Math.round(v*1000000)/1000000))].sort((a,b)=>a-b);
  }
  static nearest(value,points=[],tolerance=.15){
    const v=Number(value),tol=Math.max(0,Number(tolerance)||0);if(!Number.isFinite(v))return {value:0,snapped:false,target:null,distance:Infinity};
    let target=null,distance=Infinity;for(const p of points){const d=Math.abs(Number(p)-v);if(d<distance){distance=d;target=Number(p)}}
    return target!==null&&distance<=tol?{value:target,snapped:true,target,distance}:{value:v,snapped:false,target:null,distance};
  }
  static move(project={},clip={},candidateStart=0,{playhead=null,tolerance=.15}={}){
    const duration=Math.max(.001,Number(project.duration)||1),clipDuration=Math.max(.001,Number(clip.duration)||.001),raw=this.clamp(candidateStart,0,Math.max(0,duration-clipDuration)),points=this.points(project,clip.id,playhead);
    const startSnap=this.nearest(raw,points,tolerance),endSnap=this.nearest(raw+clipDuration,points,tolerance);
    let chosen=startSnap;
    if(endSnap.snapped&&(!startSnap.snapped||endSnap.distance<startSnap.distance))chosen={...endSnap,value:endSnap.value-clipDuration};
    return {...chosen,value:this.clamp(chosen.value,0,Math.max(0,duration-clipDuration))};
  }
  static trim(project={},clip={},candidateDuration=.25,{playhead=null,tolerance=.15,minDuration=.25}={}){
    const duration=Math.max(.001,Number(project.duration)||1),start=this.clamp(clip.start,0,duration),available=Math.max(.001,duration-start),requestedMin=Math.max(.001,Number(minDuration)||.25),min=Math.min(requestedMin,available),rawDuration=this.clamp(candidateDuration,min,available),rawEnd=start+rawDuration;
    const snap=this.nearest(rawEnd,this.points(project,clip.id,playhead),tolerance),snappedDuration=snap.value-start;
    return {...snap,value:this.clamp(snappedDuration,min,available),target:snap.snapped?snap.target:null};
  }
}
return {ProfitMenteTimelineSnapEngine};
});