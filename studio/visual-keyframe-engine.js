(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  const DEFAULT_STATE=Object.freeze({x:0,y:0,scale:1,rotation:0,opacity:1});
  const EASINGS=Object.freeze(['linear','ease-in','ease-out','ease-in-out','hold']);
  class ProfitMenteVisualKeyframeEngine{
    constructor(options={}){
      this.tolerance=Math.max(.0001,Number(options.tolerance)||.001);
      this.minScale=Math.max(.01,Number(options.minScale)||.1);
      this.maxScale=Math.max(this.minScale,Number(options.maxScale)||8);
    }
    finite(value,fallback=null){
      if(typeof value==='boolean'||value===null||value===undefined)return fallback;
      if(typeof value==='string'&&!value.trim())return fallback;
      const n=Number(value);return Number.isFinite(n)?n:fallback;
    }
    canonicalTrack(value){const n=this.finite(value);return Number.isInteger(n)&&n>=0&&n<=6?n:null}
    canonicalEasing(value){const easing=typeof value==='string'?value.trim().toLowerCase():'';return EASINGS.includes(easing)?easing:'linear'}
    ease(easing,progress){
      const p=Math.max(0,Math.min(1,this.finite(progress,0)));
      switch(this.canonicalEasing(easing)){
        case 'ease-in':return p*p;
        case 'ease-out':return 1-(1-p)*(1-p);
        case 'ease-in-out':return p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
        case 'hold':return p>=1?1:0;
        default:return p;
      }
    }
    trackLocked(project,track){
      const target=this.canonicalTrack(track);if(target===null)return false;
      for(const state of [project?.trackState,project?.trackStates]){
        if(!state||typeof state!=='object'||Array.isArray(state))continue;
        for(const [key,value] of Object.entries(state))if(this.canonicalTrack(key)===target&&value?.locked===true)return true;
      }
      return false;
    }
    clipLocked(project,clip){return clip?.locked===true||this.trackLocked(project,clip?.track)}
    eligible(clip){return !!clip&&typeof clip==='object'&&!Array.isArray(clip)&&[0,1].includes(this.canonicalTrack(clip.track))}
    duration(clip){return Math.max(.001,this.finite(clip?.duration,.001))}
    clampTime(clip,time){return Math.max(0,Math.min(this.duration(clip),this.finite(time,0)))}
    state(value={}){
      return {
        x:Math.max(-200,Math.min(200,this.finite(value.x,DEFAULT_STATE.x))),
        y:Math.max(-200,Math.min(200,this.finite(value.y,DEFAULT_STATE.y))),
        scale:Math.max(this.minScale,Math.min(this.maxScale,this.finite(value.scale,DEFAULT_STATE.scale))),
        rotation:Math.max(-3600,Math.min(3600,this.finite(value.rotation,DEFAULT_STATE.rotation))),
        opacity:Math.max(0,Math.min(1,this.finite(value.opacity,DEFAULT_STATE.opacity)))
      };
    }
    normalize(clip){
      if(!this.eligible(clip))return [];
      const duration=this.duration(clip),frames=Array.isArray(clip.visualKeyframes)?clip.visualKeyframes:[],safe=[];
      for(const frame of frames){
        if(!frame||typeof frame!=='object'||Array.isArray(frame))continue;
        const rawTime=this.finite(frame.time);if(rawTime===null)continue;
        safe.push({time:+Math.max(0,Math.min(duration,rawTime)).toFixed(6),...this.state(frame),easing:this.canonicalEasing(frame.easing)});
      }
      safe.sort((a,b)=>a.time-b.time);
      const deduped=[];
      for(const frame of safe){
        const last=deduped[deduped.length-1];
        if(last&&Math.abs(last.time-frame.time)<=this.tolerance)deduped[deduped.length-1]={...frame,time:last.time};
        else deduped.push(frame);
      }
      return deduped;
    }
    easingAt(clip,localTime){
      const frames=this.normalize(clip);if(!frames.length)return 'linear';
      const t=this.clampTime(clip,localTime);
      let active=frames[0];
      for(const frame of frames){if(frame.time<=t+this.tolerance)active=frame;else break}
      return this.canonicalEasing(active.easing);
    }
    stateAt(clip,localTime){
      const frames=this.normalize(clip);if(!frames.length)return {...DEFAULT_STATE};
      const t=this.clampTime(clip,localTime);
      if(t<=frames[0].time+this.tolerance)return this.state(frames[0]);
      const last=frames[frames.length-1];if(t>=last.time-this.tolerance)return this.state(last);
      let left=frames[0],right=last;
      for(let i=1;i<frames.length;i++)if(t<=frames[i].time+this.tolerance){left=frames[i-1];right=frames[i];break}
      const span=Math.max(this.tolerance,right.time-left.time),raw=Math.max(0,Math.min(1,(t-left.time)/span)),p=this.ease(left.easing,raw);
      const a=this.state(left),b=this.state(right),mix=(x,y)=>x+(y-x)*p;
      return {x:mix(a.x,b.x),y:mix(a.y,b.y),scale:mix(a.scale,b.scale),rotation:mix(a.rotation,b.rotation),opacity:mix(a.opacity,b.opacity)};
    }
    upsert(project,clip,localTime,value){
      if(!this.eligible(clip))return {ok:false,reason:'not-visual',changed:false};
      if(this.clipLocked(project,clip))return {ok:false,reason:'locked',changed:false};
      const time=+this.clampTime(clip,localTime).toFixed(6),frames=this.normalize(clip);
      const index=frames.findIndex(frame=>Math.abs(frame.time-time)<=this.tolerance),stableTime=index>=0?frames[index].time:time;
      const hasEasing=value&&typeof value==='object'&&Object.prototype.hasOwnProperty.call(value,'easing');
      const easing=this.canonicalEasing(hasEasing?value.easing:(index>=0?frames[index].easing:'linear'));
      const next={time:stableTime,...this.state(value),easing};
      if(index>=0)frames[index]=next;else frames.push(next);
      frames.sort((a,b)=>a.time-b.time);clip.visualKeyframes=frames;
      return {ok:true,reason:'ok',changed:true,index:frames.indexOf(next),keyframe:next,count:frames.length};
    }
    remove(project,clip,localTime){
      if(!this.eligible(clip))return {ok:false,reason:'not-visual',changed:false};
      if(this.clipLocked(project,clip))return {ok:false,reason:'locked',changed:false};
      const frames=this.normalize(clip),time=this.clampTime(clip,localTime);if(!frames.length)return {ok:true,reason:'ok',changed:false,count:0};
      let best=-1,distance=Infinity;frames.forEach((frame,index)=>{const d=Math.abs(frame.time-time);if(d<distance){distance=d;best=index}});
      if(best<0||distance>Math.max(this.tolerance,.05))return {ok:true,reason:'no-keyframe',changed:false,count:frames.length};
      frames.splice(best,1);if(frames.length)clip.visualKeyframes=frames;else delete clip.visualKeyframes;
      return {ok:true,reason:'ok',changed:true,count:frames.length};
    }
    clear(project,clip){
      if(!this.eligible(clip))return {ok:false,reason:'not-visual',changed:false};
      if(this.clipLocked(project,clip))return {ok:false,reason:'locked',changed:false};
      const changed=Array.isArray(clip.visualKeyframes)&&clip.visualKeyframes.length>0;delete clip.visualKeyframes;return {ok:true,reason:'ok',changed,count:0};
    }
  }
  root.ProfitMenteVisualKeyframeEngine=ProfitMenteVisualKeyframeEngine;
  if(typeof module!=='undefined'&&module.exports)module.exports={ProfitMenteVisualKeyframeEngine,DEFAULT_STATE,EASINGS};
  if(typeof document!=='undefined'&&!root.__profitmenteVisualKeyframeRenderBakerLoader){
    root.__profitmenteVisualKeyframeRenderBakerLoader=true;
    const script=document.createElement('script');script.src='visual-keyframe-render-baker.js';script.async=false;script.onerror=()=>console.error('No se pudo cargar visual-keyframe-render-baker.js');document.body.appendChild(script);
  }
})();
