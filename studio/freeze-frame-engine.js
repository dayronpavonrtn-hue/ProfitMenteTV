(()=>{
  class ProfitMenteFreezeFrameEngine{
    num(v,d=0){const n=Number(v);return Number.isFinite(n)?n:d}
    speed(clip){return Math.max(.25,Math.min(4,this.num(clip?.speed,1)||1))}
    sourceDuration(asset){return Math.max(0,this.num(asset?.duration,0))}
    sourceTimeAt(clip,t,asset){
      if(!clip||!asset||asset.type!=='video')return {ok:false,reason:'video-required'};
      const start=this.num(clip.start,0),duration=Math.max(.05,this.num(clip.duration,0)),local=Math.max(0,Math.min(duration, this.num(t,start)-start));
      const raw=Math.max(0,this.num(clip.sourceOffset,0)+local*this.speed(clip));
      const sourceDuration=this.sourceDuration(asset),max=sourceDuration>0?Math.max(0,sourceDuration-.01):Infinity;
      return {ok:true,time:Math.min(raw,max),local,sourceDuration};
    }
    set(clip,t,asset){
      const r=this.sourceTimeAt(clip,t,asset);if(!r.ok)return r;
      const before=this.num(clip.freezeFrameSource,NaN);clip.freezeFrameSource=r.time;
      return {...r,changed:!Number.isFinite(before)||Math.abs(before-r.time)>.001};
    }
    clear(clip){
      if(!clip||!Object.prototype.hasOwnProperty.call(clip,'freezeFrameSource'))return {ok:false,changed:false};
      delete clip.freezeFrameSource;return {ok:true,changed:true};
    }
    frozen(clip){return Number.isFinite(Number(clip?.freezeFrameSource))}
    normalize(clip,asset){
      if(!this.frozen(clip))return {ok:true,changed:false};
      if(asset?.type!=='video'){delete clip.freezeFrameSource;return {ok:false,changed:true,reason:'video-required'};}
      const old=Number(clip.freezeFrameSource),d=this.sourceDuration(asset),next=Math.max(0,d>0?Math.min(old,Math.max(0,d-.01)):old);
      clip.freezeFrameSource=next;return {ok:true,changed:Math.abs(next-old)>.001,time:next};
    }
  }
  window.ProfitMenteFreezeFrameEngine=ProfitMenteFreezeFrameEngine;
})();
