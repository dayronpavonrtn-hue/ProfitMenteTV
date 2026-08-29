(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteRateStretchEngine{
    constructor(options={}){
      this.minDuration=Math.max(.01,Number(options.minDuration)||.05);
      this.minSpeed=Math.max(.01,Number(options.minSpeed)||.25);
      this.maxSpeed=Math.max(this.minSpeed,Number(options.maxSpeed)||4);
      this.tolerance=Math.max(.000001,Number(options.tolerance)||1e-6);
    }
    speed(clip){return Math.max(this.minSpeed,Math.min(this.maxSpeed,Number(clip?.speed)||1))}
    duration(clip){return Math.max(0,Number(clip?.duration)||0)}
    start(clip){return Math.max(0,Number(clip?.start)||0)}
    sourceOffset(clip){return Math.max(0,Number(clip?.sourceOffset)||0)}
    sourceSpan(clip){return this.duration(clip)*this.speed(clip)}
    sourceDuration(asset){return Math.max(0,Number(asset?.duration)||0)}
    sourceAvailable(clip,asset){
      if(!clip?.asset||asset?.type==='image')return Infinity;
      const total=this.sourceDuration(asset);
      return total?Math.max(0,total-this.sourceOffset(clip)):Infinity;
    }
    targetBounds(clip,asset,nextClip,projectDuration){
      if(!clip)return {ok:false,reason:'no-clip',minDuration:0,maxDuration:0};
      const current=this.duration(clip),span=this.sourceSpan(clip);
      if(current<this.minDuration||span<=0)return {ok:false,reason:'invalid-duration',minDuration:0,maxDuration:0};
      const available=this.sourceAvailable(clip,asset);
      if(Number.isFinite(available)&&span>available+this.tolerance)return {ok:false,reason:'source-out-of-bounds',minDuration:0,maxDuration:0};
      let minDuration=Math.max(this.minDuration,span/this.maxSpeed);
      let maxDuration=span/this.minSpeed;
      if(nextClip&&Number(nextClip.track)===Number(clip.track)){
        const gap=(Number(nextClip.start)||0)-this.start(clip);
        if(gap>0)maxDuration=Math.min(maxDuration,gap);
      }
      const pd=Number(projectDuration);
      if(Number.isFinite(pd)&&pd>0)maxDuration=Math.min(maxDuration,Math.max(this.minDuration,pd-this.start(clip)));
      maxDuration=Math.max(minDuration,maxDuration);
      return {ok:true,reason:'ok',minDuration:+minDuration.toFixed(6),maxDuration:+maxDuration.toFixed(6),currentDuration:+current.toFixed(6),sourceSpan:+span.toFixed(6)};
    }
    stretch(clip,asset,targetDuration,nextClip,projectDuration){
      const b=this.targetBounds(clip,asset,nextClip,projectDuration);if(!b.ok)return {...b,changed:false};
      const requested=Number(targetDuration);if(!Number.isFinite(requested)||requested<=0)return {...b,ok:false,reason:'invalid-target',changed:false};
      const duration=Math.max(b.minDuration,Math.min(b.maxDuration,requested));
      const speed=b.sourceSpan/duration;
      if(speed<this.minSpeed-this.tolerance||speed>this.maxSpeed+this.tolerance)return {...b,ok:false,reason:'speed-out-of-range',changed:false};
      const changed=Math.abs(duration-this.duration(clip))>this.tolerance||Math.abs(speed-this.speed(clip))>this.tolerance;
      if(changed){clip.duration=+duration.toFixed(6);clip.speed=+speed.toFixed(6)}
      return {...b,ok:true,reason:'ok',changed,requested:+requested.toFixed(6),duration:+duration.toFixed(6),speed:+speed.toFixed(6),clamped:Math.abs(duration-requested)>this.tolerance,sourceSpanAfter:+(duration*speed).toFixed(6),preservedSource:Math.abs(duration*speed-b.sourceSpan)<=1e-5};
    }
    nextOnTrack(clips,clip){
      if(!clip)return null;
      const end=this.start(clip)+this.duration(clip);
      return (clips||[]).filter(c=>c&&c.id!==clip.id&&Number(c.track)===Number(clip.track)&&(Number(c.start)||0)>=end-this.tolerance).sort((a,b)=>(Number(a.start)||0)-(Number(b.start)||0))[0]||null;
    }
  }
  root.ProfitMenteRateStretchEngine=ProfitMenteRateStretchEngine;
  if(typeof module!=='undefined')module.exports={ProfitMenteRateStretchEngine};
})();
