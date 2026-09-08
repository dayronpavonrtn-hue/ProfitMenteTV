(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteTimelineFocusEngine{
    static finite(value){
      if(typeof value==='number')return Number.isFinite(value)?value:null;
      if(typeof value!=='string')return null;
      const text=value.trim();if(!text||!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(text))return null;
      const n=Number(text);return Number.isFinite(n)?n:null;
    }
    static idKey(value){
      if(typeof value==='boolean'||value===null||value===undefined||Array.isArray(value)||(typeof value==='object'))return null;
      const text=String(value).trim();if(!text)return null;
      if(/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(text)){
        const n=Number(text);if(Number.isFinite(n))return `n:${Object.is(n,-0)?0:n}`;
      }
      return `s:${text}`;
    }
    static clamp(value,min,max){const n=this.finite(value);return Math.max(min,Math.min(max,n===null?0:n))}
    static duration(project){const n=this.finite(project?.duration);return n!==null&&n>0?n:.001}
    static bounds(project,ids=[]){
      const wanted=new Set((Array.isArray(ids)?ids:[]).map(id=>this.idKey(id)).filter(key=>key!==null));
      if(!wanted.size)return null;
      const clips=(Array.isArray(project?.clips)?project.clips:[]).filter(c=>wanted.has(this.idKey(c?.id))).map(c=>{
        const start=this.finite(c?.start),duration=this.finite(c?.duration);
        if(start===null||duration===null||start<0||duration<=0)return null;
        return {start,duration};
      }).filter(Boolean);
      if(!clips.length)return null;
      const limit=this.duration(project),start=Math.max(0,Math.min(limit,Math.min(...clips.map(c=>c.start)))),end=Math.max(start,Math.min(limit,Math.max(...clips.map(c=>c.start+c.duration))));
      return {start,end,duration:Math.max(0,end-start),count:clips.length,center:(start+end)/2};
    }
    static rangeBounds(project,start,end){
      const limit=this.duration(project),a=this.finite(start),b=this.finite(end);
      if(a===null||b===null)return null;
      const left=Math.max(0,Math.min(limit,Math.min(a,b))),right=Math.max(0,Math.min(limit,Math.max(a,b)));
      if(right-left<=0)return null;
      return {start:left,end:right,duration:right-left,count:0,center:(left+right)/2};
    }
    static zoomForBounds(project,bounds,{min=1,max=6,coverage=.78,minSpan=.25}={}){
      if(!bounds)return min;
      const duration=this.duration(project),span=Math.max(this.finite(minSpan)??.25,this.finite(bounds.duration)??0);
      const target=(duration/span)*this.clamp(coverage,.25,.95);
      return Math.round(this.clamp(target,min,max)*2)/2;
    }
    static focus(project,ids=[],options={}){
      const bounds=this.bounds(project,ids);if(!bounds)return {ok:false,reason:'empty',zoom:1,bounds:null};
      return {ok:true,reason:'ok',zoom:this.zoomForBounds(project,bounds,options),bounds};
    }
    static focusRange(project,start,end,options={}){
      const bounds=this.rangeBounds(project,start,end);if(!bounds)return {ok:false,reason:'invalid-range',zoom:1,bounds:null};
      return {ok:true,reason:'ok',zoom:this.zoomForBounds(project,bounds,options),bounds};
    }
  }
  root.ProfitMenteTimelineFocusEngine=ProfitMenteTimelineFocusEngine;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteTimelineFocusEngine;
  if(typeof document!=='undefined'&&!document.querySelector('script[data-profitmente-timeline-focus-integration]')){
    const s=document.createElement('script');s.src='timeline-focus-integration.js';s.dataset.profitmenteTimelineFocusIntegration='1';document.body.appendChild(s);
  }
})();
