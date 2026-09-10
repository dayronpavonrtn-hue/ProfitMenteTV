class ProfitMenteVisualCropEngine{
  static finite(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback}
  static clamp(value,min,max,fallback=0){return Math.max(min,Math.min(max,this.finite(value,fallback)))}
  static defaults(){return {left:0,right:0,top:0,bottom:0}}
  normalize(value){
    const src=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    let left=ProfitMenteVisualCropEngine.clamp(src.left,0,95),right=ProfitMenteVisualCropEngine.clamp(src.right,0,95),top=ProfitMenteVisualCropEngine.clamp(src.top,0,95),bottom=ProfitMenteVisualCropEngine.clamp(src.bottom,0,95);
    if(left+right>95){const k=95/(left+right);left*=k;right*=k}
    if(top+bottom>95){const k=95/(top+bottom);top*=k;bottom*=k}
    return {left,right,top,bottom};
  }
  state(clip){return this.normalize(clip?.visualCrop)}
  isDefault(value){const s=this.normalize(value);return s.left===0&&s.right===0&&s.top===0&&s.bottom===0}
  eligible(clip){const track=Number(clip?.track);return !!clip&&(track===0||track===1)}
  locked(project,clip){if(!clip)return true;if(clip.locked===true)return true;const track=Number(clip.track);for(const map of [project?.trackState,project?.trackStates]){if(!map||typeof map!=='object')continue;const row=map[track]??map[String(track)];if(row===true||row?.locked===true)return true}return false}
  apply(project,clip,patch={}){if(!this.eligible(clip))return {ok:false,changed:false,reason:'ineligible'};if(this.locked(project,clip))return {ok:false,changed:false,reason:'locked'};const before=this.state(clip),next=this.normalize({...before,...patch}),changed=Object.keys(next).some(k=>Math.abs(next[k]-before[k])>.0001);if(changed){if(this.isDefault(next))delete clip.visualCrop;else clip.visualCrop=next}return {ok:true,changed,state:next}}
  reset(project,clip){if(!this.eligible(clip))return {ok:false,changed:false,reason:'ineligible'};if(this.locked(project,clip))return {ok:false,changed:false,reason:'locked'};const changed=Object.prototype.hasOwnProperty.call(clip,'visualCrop');if(changed)delete clip.visualCrop;return {ok:true,changed,state:ProfitMenteVisualCropEngine.defaults()}}
  sourceRect(source,clip){const sw=Number(source?.videoWidth||source?.naturalWidth||source?.width||0),sh=Number(source?.videoHeight||source?.naturalHeight||source?.height||0);if(!(sw>0&&sh>0))return null;const s=this.state(clip),x=sw*s.left/100,y=sh*s.top/100,w=sw*(100-s.left-s.right)/100,h=sh*(100-s.top-s.bottom)/100;return {x,y,w:Math.max(1,w),h:Math.max(1,h)}}
}
if(typeof window!=='undefined')window.ProfitMenteVisualCropEngine=ProfitMenteVisualCropEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteVisualCropEngine;