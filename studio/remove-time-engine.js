(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteRemoveTimeEngine{
    num(value,fallback=0){
      const n=Number(value);
      return Number.isFinite(n)?n:fallback;
    }
    canonicalTrack(value){
      if(value===undefined||value===null)return null;
      if(typeof value==='string'&&!value.trim())return null;
      const n=Number(value);
      return Number.isFinite(n)&&Number.isInteger(n)&&n>=0&&n<=6?String(n):null;
    }
    trackLocked(project,track){
      const canonical=this.canonicalTrack(track);
      if(canonical===null)return false;
      return [project?.trackState,project?.trackStates].some(map=>{
        if(!map||typeof map!=='object')return false;
        return Object.entries(map).some(([key,state])=>
          this.canonicalTrack(key)===canonical&&!!(state&&typeof state==='object'&&state.locked===true)
        );
      });
    }
    clipLocked(project,clip){
      return clip?.locked===true||this.trackLocked(project,clip?.track);
    }
    shiftWordTimings(clip,delta){
      if(!Array.isArray(clip?.wordTimings)||!delta)return;
      for(const word of clip.wordTimings){
        if(!word||typeof word!=='object')continue;
        if(Number.isFinite(Number(word.start)))word.start=Math.max(0,Number(word.start)+delta);
        if(Number.isFinite(Number(word.end)))word.end=Math.max(0,Number(word.end)+delta);
      }
    }
    mapTime(value,start,end,amount){
      const t=this.num(value,NaN);
      if(!Number.isFinite(t))return null;
      if(t<=start)return t;
      if(t>=end)return Math.max(start,t-amount);
      return start;
    }
    remapMarkers(project,start,end,amount){
      if(!Array.isArray(project?.markers))return;
      project.markers=project.markers
        .filter(marker=>{
          const t=this.num(marker?.time,NaN);
          return Number.isFinite(t)&&!(t>start+.0001&&t<end-.0001);
        })
        .map(marker=>({...marker,time:this.mapTime(marker.time,start,end,amount)}));
    }
    remapWorkRange(project,start,end,amount){
      if(!project?.workRange||typeof project.workRange!=='object')return;
      const a=this.mapTime(project.workRange.start,start,end,amount);
      const b=this.mapTime(project.workRange.end,start,end,amount);
      if(a===null||b===null)return;
      project.workRange={start:Math.max(0,Math.min(a,b)),end:Math.max(0,Math.max(a,b))};
    }
    remove(project,at,gap=1){
      const t=Math.max(0,this.num(at)),amount=Math.max(.05,this.num(gap,1)),end=t+amount;
      const clips=Array.isArray(project?.clips)?project.clips:[],duration=Math.max(0,this.num(project?.duration));
      if(end>duration+.001)return {ok:false,reason:'out_of_range',at:t,gap:amount,duration};
      const occupied=clips.find(c=>{
        const start=this.num(c?.start),clipEnd=start+Math.max(0,this.num(c?.duration));
        return start<end-.001&&clipEnd>t+.001;
      });
      if(occupied)return {ok:false,reason:'occupied',track:occupied.track,clip:occupied,at:t,gap:amount};
      const affected=clips.filter(c=>this.num(c?.start)>=end-.001);
      const locked=affected.find(c=>this.clipLocked(project,c));
      if(locked)return {ok:false,reason:'locked',track:locked.track,clip:locked,at:t,gap:amount};
      for(const c of affected){
        c.start=Math.max(t,this.num(c.start)-amount);
        this.shiftWordTimings(c,-amount);
      }
      this.remapMarkers(project,t,end,amount);
      this.remapWorkRange(project,t,end,amount);
      const maxEnd=clips.reduce((m,c)=>Math.max(m,this.num(c?.start)+Math.max(0,this.num(c?.duration))),0);
      project.duration=Math.max(maxEnd,Math.max(0,duration-amount));
      return {ok:true,moved:affected.length,gap:amount,at:t,duration:project.duration,tracks:[...new Set(affected.map(c=>this.canonicalTrack(c.track)??c.track)]};
    }
  }
  root.ProfitMenteRemoveTimeEngine=ProfitMenteRemoveTimeEngine;
})();
