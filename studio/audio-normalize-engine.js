class ProfitMenteAudioNormalizeEngine{
  static AUDIO_TRACKS=[4,5,6]
  static finiteNumber(value,fallback=null){
    if(typeof value==='number')return Number.isFinite(value)?(Object.is(value,-0)?0:value):fallback;
    if(typeof value==='string'){
      const trimmed=value.trim();if(!trimmed)return fallback;
      const parsed=Number(trimmed);return Number.isFinite(parsed)?(Object.is(parsed,-0)?0:parsed):fallback;
    }
    return fallback;
  }
  static canonicalTrack(track){
    const value=this.finiteNumber(track,null);
    if(value===null||!Number.isInteger(value)||value<0||value>6)return null;
    return value;
  }
  static canonicalMediaId(value){
    if(value===null||value===undefined||typeof value==='boolean')return null;
    if(typeof value==='string'){
      const trimmed=value.trim();if(!trimmed)return null;
      const numeric=Number(trimmed);
      return Number.isFinite(numeric)?String(Object.is(numeric,-0)?0:numeric):trimmed;
    }
    if(typeof value==='number'&&Number.isFinite(value))return String(Object.is(value,-0)?0:value);
    return null;
  }
  static canonicalClipId(value){return this.canonicalMediaId(value)}
  static hasAsset(value){return this.canonicalMediaId(value)!==null}
  static findAsset(assets,id){
    const wanted=this.canonicalMediaId(id);if(wanted===null)return null;
    return (assets||[]).find(asset=>this.canonicalMediaId(asset?.id)===wanted)||null;
  }
  static findClip(clips,id){
    const wanted=this.canonicalClipId(id);if(wanted===null)return null;
    return (clips||[]).find(clip=>this.canonicalClipId(clip?.id)===wanted)||null;
  }
  static dbToLinear(db){return Math.pow(10,this.finiteNumber(db,0)/20)}
  static linearToDb(v){const n=Math.max(1e-9,this.finiteNumber(v,0));return 20*Math.log10(n)}
  static stateFrom(map,track){
    if(!map||typeof map!=='object')return {};
    const canonical=this.canonicalTrack(track);if(canonical===null)return {};
    const states=[];
    for(const [key,value] of Object.entries(map)){
      if(this.canonicalTrack(key)===canonical&&value&&typeof value==='object')states.push(value);
    }
    const merged=Object.assign({},...states);
    for(const key of ['muted','solo','locked'])if(states.some(state=>!!state?.[key]))merged[key]=true;
    return merged;
  }
  static trackState(project,track){
    const current=this.stateFrom(project?.trackState,track),legacy=this.stateFrom(project?.trackStates,track),merged={...legacy,...current};
    for(const key of ['muted','solo','locked'])if(legacy?.[key]||current?.[key])merged[key]=true;
    return merged;
  }
  static audioSoloSet(project){return new Set(this.AUDIO_TRACKS.filter(track=>!!this.trackState(project,track).solo))}
  static trackActive(project,track){
    const t=this.canonicalTrack(track);if(t===null||!this.AUDIO_TRACKS.includes(t))return false;
    const state=this.trackState(project,t);if(state.muted)return false;
    const solos=this.audioSoloSet(project);return !solos.size||solos.has(t);
  }
  static trackLocked(project,track){
    const t=this.canonicalTrack(track);if(t===null)return false;
    return !!this.trackState(project,t).locked;
  }
  static clipLocked(project,clip){return !!clip&&(clip.locked===true||this.trackLocked(project,clip.track))}
  static clipActive(project,clip){return !!clip&&this.trackActive(project,clip.track)&&clip.muted!==true}
  static activeAudioClips(project){return (project?.clips||[]).filter(clip=>this.clipActive(project,clip)&&this.hasAsset(clip.asset))}
  static mutableAudioClips(project){return this.activeAudioClips(project).filter(clip=>!this.clipLocked(project,clip))}
  static targets(track){
    const t=this.canonicalTrack(track);
    // Canonical Studio audio track contract (app.js): 4=SFX, 5=Música, 6=Voz.
    if(t===6)return {rmsDb:-18,peakDb:-1,label:'voz'};
    if(t===5)return {rmsDb:-24,peakDb:-1,label:'música'};
    return {rmsDb:-20,peakDb:-1,label:'efectos'};
  }
  static analyzeChannels(channels,startSample=0,endSample=null){
    const list=(channels||[]).filter(Boolean);if(!list.length)return {peak:0,rms:0,samples:0,peakDb:-Infinity,rmsDb:-Infinity};
    const max=Math.min(...list.map(c=>c.length||0));
    const startValue=this.finiteNumber(startSample,0),endValue=endSample==null?max:this.finiteNumber(endSample,max);
    const start=Math.max(0,Math.min(max,Math.floor(startValue))),end=Math.max(start,Math.min(max,Math.floor(endValue)));
    let peak=0,sum=0,count=0;
    for(const channel of list){for(let i=start;i<end;i++){const x=Math.abs(this.finiteNumber(channel[i],0));if(x>peak)peak=x;sum+=x*x;count++}}
    const rms=count?Math.sqrt(sum/count):0;
    return {peak,rms,samples:count,peakDb:peak?this.linearToDb(peak):-Infinity,rmsDb:rms?this.linearToDb(rms):-Infinity};
  }
  static recommendation(metrics,track,currentVolume=1){
    const target=this.targets(track),current=Math.max(0,this.finiteNumber(currentVolume,1));
    if(!metrics||metrics.samples<=0||metrics.rms<=1e-7)return {ok:false,reason:'silence',volume:current,gain:1,target};
    const rmsGain=this.dbToLinear(target.rmsDb)/metrics.rms,peakGain=metrics.peak>0?this.dbToLinear(target.peakDb)/metrics.peak:2;
    // Metrics are measured from the raw source window, so the target volume must be
    // absolute. Multiplying by the clip's existing volume makes normalization drift
    // every time it is run and leaves tracks with low defaults (music) too quiet.
    const volume=Math.max(.1,Math.min(2,rmsGain,peakGain));
    const gain=current>1e-9?volume/current:volume;
    return {ok:true,gain,volume,target,limitedByPeak:peakGain<rmsGain,metrics};
  }
  static analyzeBuffer(buffer,sourceOffset=0,sourceDuration=null){
    if(!buffer||!buffer.sampleRate||!buffer.numberOfChannels)return {peak:0,rms:0,samples:0,peakDb:-Infinity,rmsDb:-Infinity};
    const rate=buffer.sampleRate,offset=Math.max(0,this.finiteNumber(sourceOffset,0)),start=Math.max(0,Math.floor(offset*rate));
    const duration=sourceDuration==null?null:Math.max(0,this.finiteNumber(sourceDuration,0)),end=duration==null?buffer.length:Math.min(buffer.length,start+Math.floor(duration*rate)),channels=[];
    for(let i=0;i<buffer.numberOfChannels;i++)channels.push(buffer.getChannelData(i));
    return this.analyzeChannels(channels,start,end);
  }
  static clipWindow(clip,bufferDuration){
    const speed=Math.max(.25,Math.min(4,this.finiteNumber(clip?.speed,1))),offset=Math.max(0,this.finiteNumber(clip?.sourceOffset,0)),timelineDuration=Math.max(0,this.finiteNumber(clip?.duration,0)),available=Math.max(0,this.finiteNumber(bufferDuration,0)-offset),sourceDuration=Math.min(available,timelineDuration*speed);
    return {offset,sourceDuration,speed};
  }
}
if(typeof window!=='undefined')window.ProfitMenteAudioNormalizeEngine=ProfitMenteAudioNormalizeEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteAudioNormalizeEngine;