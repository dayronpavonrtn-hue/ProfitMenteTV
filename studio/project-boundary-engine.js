class ProfitMenteProjectBoundaryEngine{
  normalize(project){
    if(!project||typeof project!=='object')return {project,changed:false,changes:[]};
    const duration=this.number(project.duration,45,1,86400),clips=Array.isArray(project.clips)?project.clips:[],changes=[];
    if(project.duration!==duration){project.duration=duration;changes.push('project-duration')}
    for(const clip of clips){
      if(!clip||typeof clip!=='object')continue;
      const oldStart=clip.start,oldDuration=clip.duration;
      let start=this.number(oldStart,0,0,Math.max(0,duration-.25));
      let clipDuration=this.number(oldDuration,1,.25,duration-start);
      if(start+clipDuration>duration)clipDuration=Math.max(.25,duration-start);
      if(oldStart!==start){clip.start=start;changes.push(`clip-start:${clip.id??''}`)}
      if(oldDuration!==clipDuration){clip.duration=clipDuration;changes.push(`clip-duration:${clip.id??''}`)}
      const offset=Number(clip.sourceOffset);
      if(clip.sourceOffset!==undefined&&(!Number.isFinite(offset)||offset<0)){clip.sourceOffset=0;changes.push(`source-offset:${clip.id??''}`)}
      const speed=Number(clip.speed);
      if(clip.speed!==undefined&&(!Number.isFinite(speed)||speed<.25||speed>4)){clip.speed=Number.isFinite(speed)?Math.max(.25,Math.min(4,speed)):1;changes.push(`speed:${clip.id??''}`)}
    }
    return {project,changed:changes.length>0,changes};
  }
  number(value,fallback,min,max){let n=Number(value);if(!Number.isFinite(n))n=fallback;return Math.max(min,Math.min(max,n))}
}
if(typeof window!=='undefined')window.ProfitMenteProjectBoundaryEngine=ProfitMenteProjectBoundaryEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteProjectBoundaryEngine;
