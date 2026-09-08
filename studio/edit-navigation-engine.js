(()=>{
  function scalarNumber(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string')return null;
    const text=value.trim();
    if(!text||!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(text))return null;
    const number=Number(text);
    return Number.isFinite(number)?number:null;
  }
  function trackKey(value){
    const number=scalarNumber(value);
    return number!==null&&Number.isInteger(number)&&number>=0?Object.is(number,-0)?0:number:null;
  }
  function duration(project){
    const value=scalarNumber(project?.duration);
    return value!==null&&value>0?value:0;
  }
  function clipWindow(clip,limit){
    const start=scalarNumber(clip?.start),length=scalarNumber(clip?.duration);
    if(start===null||length===null||start<0||length<=0)return null;
    const end=start+length;
    if(!Number.isFinite(end)||start>limit)return null;
    return {start:Math.min(limit,start),end:Math.min(limit,end)};
  }
  function collect(project,{track=null,includeMarkers=false,includeRange=true}={}){
    const limit=duration(project);if(limit<=0)return [];
    const requestedTrack=track===null||track===undefined?null:trackKey(track);
    if(track!==null&&track!==undefined&&requestedTrack===null)return [];
    const points=[0,limit];
    for(const clip of Array.isArray(project?.clips)?project.clips:[]){
      const clipTrack=trackKey(clip?.track);if(clipTrack===null||(requestedTrack!==null&&clipTrack!==requestedTrack))continue;
      const window=clipWindow(clip,limit);if(!window)continue;
      points.push(window.start,window.end);
    }
    if(includeMarkers&&Array.isArray(project?.markers))for(const marker of project.markers){
      const time=scalarNumber(marker?.time);if(time!==null&&time>=0&&time<=limit)points.push(time);
    }
    if(includeRange&&project?.workRange&&typeof project.workRange==='object'&&!Array.isArray(project.workRange)){
      for(const value of [project.workRange.start,project.workRange.end]){
        const time=scalarNumber(value);if(time!==null&&time>=0&&time<=limit)points.push(time);
      }
    }
    return [...new Set(points.map(value=>Math.round(value*1000000)/1000000))].sort((a,b)=>a-b);
  }
  function seek(project,current,direction,options={}){
    const limit=duration(project),time=scalarNumber(current),dir=direction==='previous'?-1:direction==='next'?1:0;
    if(limit<=0||time===null||dir===0)return {ok:false,time:time===null?0:time,reason:'invalid'};
    const points=collect(project,options),epsilon=.0005;
    if(!points.length)return {ok:false,time:Math.max(0,Math.min(limit,time)),reason:'empty'};
    if(dir<0){
      for(let i=points.length-1;i>=0;i--)if(points[i]<time-epsilon)return {ok:true,time:points[i],index:i,points};
      return {ok:true,time:points[0],index:0,points,edge:true};
    }
    for(let i=0;i<points.length;i++)if(points[i]>time+epsilon)return {ok:true,time:points[i],index:i,points};
    const index=points.length-1;return {ok:true,time:points[index],index,points,edge:true};
  }
  const api={scalarNumber,trackKey,duration,clipWindow,collect,seek};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.ProfitMenteEditNavigationEngine=api;
})();
