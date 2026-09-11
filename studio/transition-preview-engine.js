(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteTransitionPreviewEngine=api.ProfitMenteTransitionPreviewEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const TYPES=new Set(['fade','slide','zoom']);
  function scalar(v){
    if(typeof v==='number')return Number.isFinite(v)?v:null;
    if(typeof v!=='string'||!v.trim())return null;
    const n=Number(v);return Number.isFinite(n)?n:null;
  }
  function track(v){const n=scalar(v);return Number.isInteger(n)&&n>=0&&n<=1?n:null}
  function normalizeDuration(clip){
    const d=scalar(clip?.duration),raw=scalar(clip?.transitionDuration);
    if(d===null||d<=0||raw===null||raw<=0)return null;
    return Math.max(.05,Math.min(2,d,raw));
  }
  function above(candidate,current){
    if(!current)return true;
    if(candidate.track!==current.track)return candidate.track>current.track;
    if(candidate.start!==current.start)return candidate.start>current.start;
    return candidate.order>current.order;
  }
  class ProfitMenteTransitionPreviewEngine{
    static state(project,time){
      const t=scalar(time);if(t===null)return null;
      let selected=null,order=0;
      for(const clip of Array.isArray(project?.clips)?project.clips:[]){
        const clipOrder=order++;
        const tr=track(clip?.track),start=scalar(clip?.start),duration=scalar(clip?.duration),td=normalizeDuration(clip),type=String(clip?.transition||'cut').toLowerCase();
        if(tr===null||start===null||duration===null||duration<=0||!TYPES.has(type)||td===null)continue;
        if(t<start||t>=start+duration||t>=start+td)continue;
        const progress=Math.max(0,Math.min(1,(t-start)/td));
        const candidate={type,progress,track:tr,start,duration:td,clipId:clip.id??null,order:clipOrder};
        if(above(candidate,selected))selected=candidate;
      }
      if(!selected)return null;
      const {order:_order,...state}=selected;
      return state;
    }
    static transform(state,width,height){
      const w=Math.max(1,scalar(width)||1),h=Math.max(1,scalar(height)||1),p=Math.max(0,Math.min(1,scalar(state?.progress)??1));
      if(state?.type==='fade')return {alpha:p,scale:1,x:0,y:0};
      if(state?.type==='slide')return {alpha:1,scale:1,x:(1-p)*w,y:0};
      if(state?.type==='zoom'){
        const scale=.88+.12*p;return {alpha:.4+.6*p,scale,x:(w-w*scale)/2,y:(h-h*scale)/2};
      }
      return {alpha:1,scale:1,x:0,y:0};
    }
  }
  return {ProfitMenteTransitionPreviewEngine};
});