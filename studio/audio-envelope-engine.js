class ProfitMenteAudioEnvelopeEngine{
  canonicalTrack(track){
    if(track===null||track===undefined||typeof track==='boolean')return null;
    if(typeof track==='string'&&track.trim()==='')return null;
    const n=Number(track);
    if(!Number.isFinite(n)||!Number.isInteger(n)||n<0||n>6)return null;
    return Object.is(n,-0)?0:n;
  }
  canonicalId(value){
    if(value===null||value===undefined||typeof value==='boolean')return null;
    if(typeof value==='string'){
      const raw=value.trim();
      if(!raw)return null;
      const numeric=Number(raw);
      return Number.isFinite(numeric)?String(Object.is(numeric,-0)?0:numeric):raw;
    }
    if(typeof value==='number'&&Number.isFinite(value))return String(Object.is(value,-0)?0:value);
    return null;
  }
  sameId(a,b){const ca=this.canonicalId(a),cb=this.canonicalId(b);return ca!==null&&cb!==null&&ca===cb}
  hasAsset(value){return this.canonicalId(value)!==null}
  findAsset(assets,value){return (Array.isArray(assets)?assets:[]).find(a=>this.sameId(a?.id,value))||null}
  trackLocked(project,track){
    const target=this.canonicalTrack(track);
    if(target===null)return false;
    for(const state of [project?.trackState,project?.trackStates]){
      if(!state||typeof state!=='object')continue;
      for(const [key,value] of Object.entries(state))if(this.canonicalTrack(key)===target&&value?.locked===true)return true;
    }
    return false;
  }
  clipLocked(project,clip){return !!clip?.locked||this.trackLocked(project,clip?.track)}
  isAudioEligible(clip,assets){
    if(!clip||!this.hasAsset(clip.asset))return false;
    const t=this.canonicalTrack(clip.track),asset=this.findAsset(assets,clip.asset);
    if(t===null||!asset)return false;
    return [4,5,6].includes(t)||([0,1].includes(t)&&asset?.type==='video');
  }
  normalize(duration,fadeIn=0.18,fadeOut=0.25){
    const d=Math.max(.001,Number(duration)||.001);
    let fi=Math.max(0,Math.min(d,Number(fadeIn)||0));
    let fo=Math.max(0,Math.min(d,Number(fadeOut)||0));
    if(fi+fo>d){const scale=d/(fi+fo);fi*=scale;fo*=scale}
    return {fadeIn:fi,fadeOut:fo};
  }
  forClip(clip){
    const duration=Math.max(.001,Number(clip?.duration)||.001);
    const fallbackIn=.18,fallbackOut=.25;
    return this.normalize(duration,clip?.fadeIn??fallbackIn,clip?.fadeOut??fallbackOut);
  }
  apply(project,clip,fadeIn,fadeOut){
    if(!clip)return {ok:false,reason:'missing-clip'};
    if(this.clipLocked(project,clip))return {ok:false,reason:'locked'};
    const e=this.normalize(clip.duration,fadeIn,fadeOut);
    clip.fadeIn=+e.fadeIn.toFixed(3);
    clip.fadeOut=+e.fadeOut.toFixed(3);
    return {ok:true,fadeIn:clip.fadeIn,fadeOut:clip.fadeOut};
  }
  gainAt(clip,localTime){
    const d=Math.max(.001,Number(clip?.duration)||.001),t=Math.max(0,Math.min(d,Number(localTime)||0));
    const {fadeIn,fadeOut}=this.forClip(clip);
    let g=1;
    if(fadeIn>0&&t<fadeIn)g=Math.min(g,t/fadeIn);
    if(fadeOut>0&&t>d-fadeOut)g=Math.min(g,(d-t)/fadeOut);
    return Math.max(0,Math.min(1,g));
  }
}
if(typeof window!=='undefined')window.ProfitMenteAudioEnvelopeEngine=ProfitMenteAudioEnvelopeEngine;
if(typeof module!=='undefined')module.exports={ProfitMenteAudioEnvelopeEngine};