class ProfitMenteVisualAdjustEngine{
  static finite(value,fallback){const n=Number(value);return Number.isFinite(n)?n:fallback}
  static clamp(value,min,max,fallback){return Math.max(min,Math.min(max,this.finite(value,fallback)))}
  static defaults(){return {brightness:100,contrast:100,saturation:100,grayscale:0}}
  eligible(clip){return !!clip&&['video','image','overlay'].includes(String(clip.type||'').toLowerCase())}
  normalize(value){
    const src=value&&typeof value==='object'?value:{};
    return {
      brightness:ProfitMenteVisualAdjustEngine.clamp(src.brightness,0,300,100),
      contrast:ProfitMenteVisualAdjustEngine.clamp(src.contrast,0,300,100),
      saturation:ProfitMenteVisualAdjustEngine.clamp(src.saturation,0,300,100),
      grayscale:ProfitMenteVisualAdjustEngine.clamp(src.grayscale,0,100,0)
    };
  }
  state(clip){return this.normalize(clip?.visualAdjustments)}
  isDefault(value){const s=this.normalize(value);return s.brightness===100&&s.contrast===100&&s.saturation===100&&s.grayscale===0}
  canvasFilter(clip){const s=this.state(clip);return `brightness(${s.brightness}%) contrast(${s.contrast}%) saturate(${s.saturation}%) grayscale(${s.grayscale}%)`}
  clipLocked(project,clip){
    if(!clip)return true;if(clip.locked===true)return true;
    const track=Number(clip.track);const states=project?.trackStates;
    if(Array.isArray(states)){const row=states.find(x=>Number(x?.track??x?.id)===track);if(row?.locked===true)return true}
    if(states&&typeof states==='object'&&!Array.isArray(states)){const row=states[track]??states[String(track)];if(row?.locked===true||row===true)return true}
    return false;
  }
  apply(project,clip,patch={}){
    if(!this.eligible(clip))return {ok:false,changed:false,reason:'ineligible'};
    if(this.clipLocked(project,clip))return {ok:false,changed:false,reason:'locked'};
    const before=this.state(clip),next=this.normalize({...before,...patch});
    const changed=Object.keys(next).some(k=>next[k]!==before[k]);
    if(changed){if(this.isDefault(next))delete clip.visualAdjustments;else clip.visualAdjustments=next}
    return {ok:true,changed,state:next};
  }
  reset(project,clip){
    if(!this.eligible(clip))return {ok:false,changed:false,reason:'ineligible'};
    if(this.clipLocked(project,clip))return {ok:false,changed:false,reason:'locked'};
    const changed=Object.prototype.hasOwnProperty.call(clip,'visualAdjustments');if(changed)delete clip.visualAdjustments;
    return {ok:true,changed,state:ProfitMenteVisualAdjustEngine.defaults()};
  }
}
if(typeof window!=='undefined')window.ProfitMenteVisualAdjustEngine=ProfitMenteVisualAdjustEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteVisualAdjustEngine;