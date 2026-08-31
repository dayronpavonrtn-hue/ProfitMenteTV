(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteTimelineFocusEngine{
    static clamp(value,min,max){return Math.max(min,Math.min(max,Number(value)||0))}
    static bounds(project,ids=[]){
      const wanted=new Set((ids||[]).filter(Boolean).map(String));
      const clips=(project?.clips||[]).filter(c=>wanted.has(String(c?.id)));
      if(!clips.length)return null;
      const start=Math.min(...clips.map(c=>Math.max(0,Number(c?.start)||0)));
      const end=Math.max(...clips.map(c=>Math.max(0,Number(c?.start)||0)+Math.max(0,Number(c?.duration)||0)));
      return {start,end,duration:Math.max(0,end-start),count:clips.length,center:(start+end)/2};
    }
    static zoomForBounds(project,bounds,{min=1,max=6,coverage=.78,minSpan=.25}={}){
      if(!bounds)return min;
      const duration=Math.max(.001,Number(project?.duration)||.001),span=Math.max(Number(minSpan)||.25,Number(bounds.duration)||0);
      const target=(duration/span)*this.clamp(coverage,.25,.95);
      return Math.round(this.clamp(target,min,max)*2)/2;
    }
    static focus(project,ids=[],options={}){
      const bounds=this.bounds(project,ids);if(!bounds)return {ok:false,reason:'empty',zoom:1,bounds:null};
      return {ok:true,reason:'ok',zoom:this.zoomForBounds(project,bounds,options),bounds};
    }
  }
  root.ProfitMenteTimelineFocusEngine=ProfitMenteTimelineFocusEngine;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteTimelineFocusEngine;
})();
