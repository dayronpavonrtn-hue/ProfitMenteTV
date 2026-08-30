(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteRemoveTimeEngine{
    remove(project,at,gap=1){
      const t=Math.max(0,Number(at)||0),amount=Math.max(.05,Number(gap)||1),end=t+amount;
      const clips=Array.isArray(project?.clips)?project.clips:[],states=project?.trackState||{},duration=Math.max(0,Number(project?.duration)||0);
      if(end>duration+.001)return {ok:false,reason:'out_of_range',at:t,gap:amount,duration};
      const occupied=clips.find(c=>{
        const start=Number(c.start)||0,clipEnd=start+Math.max(0,Number(c.duration)||0);
        return start<end-.001&&clipEnd>t+.001;
      });
      if(occupied)return {ok:false,reason:'occupied',track:occupied.track,clip:occupied,at:t,gap:amount};
      const affected=clips.filter(c=>(Number(c.start)||0)>=end-.001);
      const locked=affected.find(c=>!!states?.[c.track]?.locked);
      if(locked)return {ok:false,reason:'locked',track:locked.track,clip:locked,at:t,gap:amount};
      for(const c of affected)c.start=Math.max(t,(Number(c.start)||0)-amount);
      const maxEnd=clips.reduce((m,c)=>Math.max(m,(Number(c.start)||0)+Math.max(0,Number(c.duration)||0)),0);
      project.duration=Math.max(maxEnd,Math.max(0,duration-amount));
      return {ok:true,moved:affected.length,gap:amount,at:t,duration:project.duration,tracks:[...new Set(affected.map(c=>c.track))]};
    }
  }
  root.ProfitMenteRemoveTimeEngine=ProfitMenteRemoveTimeEngine;
})();
