(function(root,factory){
  const Engine=factory();
  if(typeof module==='object'&&module.exports)module.exports=Engine;
  if(root)root.ProfitMenteInsertTimeEngine=Engine;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const EPS=.001;
  class ProfitMenteInsertTimeEngine{
    num(value,fallback=NaN){
      if(typeof value==='number')return Number.isFinite(value)?value:fallback;
      if(typeof value!=='string'||!value.trim())return fallback;
      const n=Number(value);return Number.isFinite(n)?n:fallback;
    }
    canonicalTrack(value){
      const n=this.num(value);return Number.isInteger(n)&&n>=0&&n<=6?String(n):null;
    }
    trackLocked(project,track){
      const key=this.canonicalTrack(track);if(key===null)return false;
      return [project?.trackState,project?.trackStates].some(map=>map&&typeof map==='object'&&Object.entries(map).some(([candidate,state])=>this.canonicalTrack(candidate)===key&&state?.locked===true));
    }
    clipLocked(project,clip){return clip?.locked===true||this.trackLocked(project,clip?.track)}
    window(clip){
      const start=this.num(clip?.start),duration=this.num(clip?.duration);
      return Number.isFinite(start)&&start>=0&&Number.isFinite(duration)&&duration>0?{start,duration,end:start+duration}:null;
    }
    shiftWordTimings(clip,amount){
      if(!Array.isArray(clip?.wordTimings)||!amount)return;
      for(const word of clip.wordTimings){
        if(!word||typeof word!=='object')continue;
        const start=this.num(word.start),end=this.num(word.end);
        if(Number.isFinite(start))word.start=Number((start+amount).toFixed(6));
        if(Number.isFinite(end))word.end=Number((end+amount).toFixed(6));
      }
    }
    shiftMarkers(project,at,amount){
      if(!Array.isArray(project?.markers))return;
      for(const marker of project.markers){
        const time=this.num(marker?.time);if(Number.isFinite(time)&&time>=at-EPS)marker.time=Number((time+amount).toFixed(6));
      }
    }
    shiftWorkRange(project,at,amount){
      const range=project?.workRange;if(!range||typeof range!=='object')return;
      let start=this.num(range.start),end=this.num(range.end);if(!Number.isFinite(start)||!Number.isFinite(end))return;
      if(start>=at-EPS)start+=amount;if(end>=at-EPS)end+=amount;
      project.workRange={...range,start:Number(start.toFixed(6)),end:Number(end.toFixed(6))};
    }
    insert(project,at,gap=1){
      if(!project||!Array.isArray(project.clips))return {ok:false,reason:'invalid_project'};
      const duration=this.num(project.duration,0),time=Math.max(0,this.num(at,0)),amount=this.num(gap);
      if(!Number.isFinite(amount)||amount<.05)return {ok:false,reason:'invalid_gap'};
      if(time>duration+EPS)return {ok:false,reason:'out_of_range',at:time,duration};
      const valid=[];
      for(const clip of project.clips){const w=this.window(clip);if(w)valid.push({clip,w})}
      const crossing=valid.find(({w})=>w.start<time-EPS&&w.end>time+EPS);
      if(crossing)return {ok:false,reason:'occupied',clip:crossing.clip,track:crossing.clip.track,at:time,gap:amount};
      const affected=valid.filter(({w})=>w.start>=time-EPS);
      const locked=affected.find(({clip})=>this.clipLocked(project,clip));
      if(locked)return {ok:false,reason:'locked',clip:locked.clip,track:locked.clip.track,at:time,gap:amount};
      for(const {clip,w} of affected){clip.start=Number((w.start+amount).toFixed(6));this.shiftWordTimings(clip,amount)}
      this.shiftMarkers(project,time,amount);this.shiftWorkRange(project,time,amount);
      project.duration=Number((Math.max(0,duration)+amount).toFixed(6));
      return {ok:true,at:time,gap:amount,moved:affected.length,duration:project.duration,tracks:[...new Set(affected.map(({clip})=>this.canonicalTrack(clip.track)??clip.track))]};
    }
  }
  return ProfitMenteInsertTimeEngine;
});
