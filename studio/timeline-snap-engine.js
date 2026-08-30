(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteTimelineSnapEngine=api.ProfitMenteTimelineSnapEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
class ProfitMenteTimelineSnapEngine{
  static clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0))}
  static points(project={},excludeId=null,playhead=null){
    const duration=Math.max(.001,Number(project.duration)||1),out=[0,duration];
    for(const c of Array.isArray(project.clips)?project.clips:[]){
      if(!c||c.id===excludeId)continue;
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
    const duration=Math.max(.001,Number(project.duration)||1),start=this.clamp(clip.start,0,duration),min=Math.max(.001,Number(minDuration)||.25),rawDuration=this.clamp(candidateDuration,min,Math.max(min,duration-start)),rawEnd=start+rawDuration;
    const snap=this.nearest(rawEnd,this.points(project,clip.id,playhead),tolerance);
    return {...snap,value:this.clamp(snap.value-start,min,Math.max(min,duration-start)),target:snap.snapped?snap.target:null};
  }
}
return {ProfitMenteTimelineSnapEngine};
});
