class ProfitMenteAudioEnvelopeEngine{
  finiteNumber(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value==='string'){
      const raw=value.trim();
      if(!raw)return null;
      const n=Number(raw);
      return Number.isFinite(n)?n:null;
    }
    return null;
  }
  safeDuration(value){
    const n=this.finiteNumber(value);
    return n!==null&&n>0?Math.max(.001,n):.001;
  }
  canonicalTrack(track){
    const n=this.finiteNumber(track);
    if(n===null||!Number.isInteger(n)||n<0||n>6)return null;
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
      if(!state||typeof state!=='object'||Array.isArray(state))continue;
      for(const [key,value] of Object.entries(state))if(this.canonicalTrack(key)===target&&value?.locked===true)return true;
    }
    return false;
  }
  clipLocked(project,clip){return clip?.locked===true||this.trackLocked(project,clip?.track)}
  isAudioEligible(clip,assets){
    if(!clip||typeof clip!=='object'||Array.isArray(clip)||!this.hasAsset(clip.asset))return false;
    const t=this.canonicalTrack(clip.track),asset=this.findAsset(assets,clip.asset);
    if(t===null||!asset)return false;
    return [4,5,6].includes(t)||([0,1].includes(t)&&asset?.type==='video');
  }
  normalize(duration,fadeIn=0.18,fadeOut=0.25){
    const d=this.safeDuration(duration);
    const rawIn=this.finiteNumber(fadeIn),rawOut=this.finiteNumber(fadeOut);
    let fi=Math.max(0,Math.min(d,rawIn??0));
    let fo=Math.max(0,Math.min(d,rawOut??0));
    if(fi+fo>d){const scale=d/(fi+fo);fi*=scale;fo*=scale}
    return {fadeIn:fi,fadeOut:fo};
  }
  forClip(clip){
    const duration=this.safeDuration(clip?.duration);
    const fallbackIn=.18,fallbackOut=.25;
    const fi=this.finiteNumber(clip?.fadeIn),fo=this.finiteNumber(clip?.fadeOut);
    return this.normalize(duration,fi??fallbackIn,fo??fallbackOut);
  }
  apply(project,clip,fadeIn,fadeOut){
    if(!clip||typeof clip!=='object'||Array.isArray(clip))return {ok:false,reason:'missing-clip'};
    if(this.clipLocked(project,clip))return {ok:false,reason:'locked'};
    const duration=this.finiteNumber(clip.duration),fi=this.finiteNumber(fadeIn),fo=this.finiteNumber(fadeOut);
    if(duration===null||duration<=0||fi===null||fo===null)return {ok:false,reason:'invalid-numeric'};
    const e=this.normalize(duration,fi,fo);
    const nextIn=+e.fadeIn.toFixed(3),nextOut=+e.fadeOut.toFixed(3);
    clip.fadeIn=nextIn;
    clip.fadeOut=nextOut;
    return {ok:true,fadeIn:nextIn,fadeOut:nextOut};
  }
  gainAt(clip,localTime){
    const d=this.safeDuration(clip?.duration),rawTime=this.finiteNumber(localTime);
    const t=Math.max(0,Math.min(d,rawTime??0));
    const {fadeIn,fadeOut}=this.forClip(clip);
    let g=1;
    if(fadeIn>0&&t<fadeIn)g=Math.min(g,t/fadeIn);
    if(fadeOut>0&&t>d-fadeOut)g=Math.min(g,(d-t)/fadeOut);
    return Math.max(0,Math.min(1,g));
  }
}
if(typeof window!=='undefined')window.ProfitMenteAudioEnvelopeEngine=ProfitMenteAudioEnvelopeEngine;
if(typeof module!=='undefined')module.exports={ProfitMenteAudioEnvelopeEngine};