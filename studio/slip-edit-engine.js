(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteSlipEditEngine{
    speed(clip){return Math.max(.25,Math.min(4,Number(clip?.speed)||1))}
    sourceDuration(asset){return Math.max(0,Number(asset?.duration)||0)}
    usedSourceDuration(clip){return Math.max(0,Number(clip?.duration)||0)*this.speed(clip)}
    bounds(clip,asset){
      const sourceDuration=this.sourceDuration(asset),used=this.usedSourceDuration(clip),maxOffset=Math.max(0,sourceDuration-used);
      return {minOffset:0,maxOffset:+maxOffset.toFixed(6),sourceDuration,usedSourceDuration:used,valid:!!clip?.asset&&sourceDuration>0&&used>0&&used<=sourceDuration+1e-6}
    }
    canSlip(clip,asset){
      const b=this.bounds(clip,asset);if(!clip?.asset)return {ok:false,reason:'no-asset',...b};if(!b.sourceDuration)return {ok:false,reason:'unknown-duration',...b};if(b.usedSourceDuration>b.sourceDuration+1e-6)return {ok:false,reason:'source-too-short',...b};return {ok:true,reason:'ok',...b}
    }
    setOffset(clip,asset,requestedOffset){
      const c=this.canSlip(clip,asset);if(!c.ok)return {...c,changed:false,offset:Math.max(0,Number(clip?.sourceOffset)||0)};
      const previous=Math.max(0,Number(clip.sourceOffset)||0),requested=Number(requestedOffset);
      if(!Number.isFinite(requested))return {...c,changed:false,reason:'invalid-offset',offset:previous};
      const offset=Math.max(c.minOffset,Math.min(c.maxOffset,requested));clip.sourceOffset=+offset.toFixed(6);
      return {...c,changed:Math.abs(offset-previous)>1e-6,previous:+previous.toFixed(6),offset:+offset.toFixed(6),clamped:Math.abs(offset-requested)>1e-6}
    }
    shift(clip,asset,timelineDelta){
      const delta=Number(timelineDelta);if(!Number.isFinite(delta))return {ok:false,changed:false,reason:'invalid-delta'};
      const current=Math.max(0,Number(clip?.sourceOffset)||0),sourceDelta=delta*this.speed(clip);return this.setOffset(clip,asset,current+sourceDelta)
    }
    sourceWindow(clip,asset){const c=this.canSlip(clip,asset),start=Math.max(0,Number(clip?.sourceOffset)||0),end=start+this.usedSourceDuration(clip);return {...c,start:+start.toFixed(6),end:+end.toFixed(6)}}
  }
  root.ProfitMenteSlipEditEngine=ProfitMenteSlipEditEngine;
  if(typeof module!=='undefined')module.exports={ProfitMenteSlipEditEngine};
})();
