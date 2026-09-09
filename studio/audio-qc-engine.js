class ProfitMenteAudioQCEngine{
  static finiteNumber(value,fallback=null){
    if(typeof value==='number')return Number.isFinite(value)?value:fallback;
    if(typeof value==='string'&&value.trim()!==''){const n=Number(value);return Number.isFinite(n)?n:fallback}
    return fallback;
  }
  static clamp(value,min=0,max=2){const n=this.finiteNumber(value,min);return Math.min(max,Math.max(min,n))}
  static dbfs(peak){const p=Math.max(0,this.finiteNumber(peak,0));return p>0?20*Math.log10(p):-Infinity}
  static canonicalTrack(value){const n=this.finiteNumber(value,null);return n!==null&&Number.isInteger(n)&&n>=0&&n<=6?(Object.is(n,-0)?0:n):null}
  static trackGain(project,track){
    const canonical=this.canonicalTrack(track);if(canonical===null)return 1;
    for(const map of [project?.trackState,project?.trackStates]){
      if(!map||typeof map!=='object')continue;
      for(const [key,state] of Object.entries(map))if(this.canonicalTrack(key)===canonical&&state&&typeof state==='object')return this.clamp(state.gain,0,2);
    }
    return 1;
  }
  static clipGain(project,clip){
    const track=this.canonicalTrack(clip?.track),trackGain=this.trackGain(project,track);
    let volume=1;
    if(track===5)volume=this.clamp(clip?.volume??.22,0,2);
    else if(track===4||track===6)volume=this.clamp(clip?.volume??1,0,2);
    else if(track===0||track===1)volume=this.clamp(clip?.sourceVolume??1,0,2);
    return trackGain*volume;
  }
  static inspectPeaks(peaks=[],gain=1,{warningDb=-1,clipDb=-0.05}={}){
    const source=Array.from(peaks||[]),g=Math.max(0,this.finiteNumber(gain,1));
    let sourcePeak=0;for(const raw of source)sourcePeak=Math.max(sourcePeak,Math.max(0,this.finiteNumber(raw,0)));
    const effectivePeak=sourcePeak*g,db=this.dbfs(effectivePeak),warnLinear=Math.pow(10,this.finiteNumber(warningDb,-1)/20),clipLinear=Math.pow(10,this.finiteNumber(clipDb,-0.05)/20);
    const status=effectivePeak>=clipLinear?'clipping':effectivePeak>=warnLinear?'hot':sourcePeak<=1e-8?'silent':'ok';
    return {status,sourcePeak,effectivePeak,dbfs:db,gain:g,warningDb:this.finiteNumber(warningDb,-1),clipDb:this.finiteNumber(clipDb,-0.05)};
  }
  static inspectClip({project=null,clip=null,peaks=[],sourceDuration=0,waveformEngine=null}={}){
    if(!clip||!waveformEngine||typeof waveformEngine.slicePeaks!=='function')return {status:'unavailable',reason:'missing_input'};
    const duration=Math.max(0,this.finiteNumber(sourceDuration,0));if(duration<=0)return {status:'unavailable',reason:'unknown_duration'};
    const visible=waveformEngine.slicePeaks(peaks,{sourceOffset:this.finiteNumber(clip.sourceOffset,0),clipDuration:this.finiteNumber(clip.duration,0),speed:this.finiteNumber(clip.speed,1),sourceDuration:duration,bins:512});
    return {...this.inspectPeaks(visible,this.clipGain(project,clip)),clipId:clip.id,track:this.canonicalTrack(clip.track)};
  }
  static summarize(results=[]){
    const list=Array.isArray(results)?results:[],counts={clipping:0,hot:0,ok:0,silent:0,unavailable:0};
    for(const item of list){const key=Object.prototype.hasOwnProperty.call(counts,item?.status)?item.status:'unavailable';counts[key]++}
    return {...counts,total:list.length,ok:counts.clipping===0};
  }
}
if(typeof window!=='undefined')window.ProfitMenteAudioQCEngine=ProfitMenteAudioQCEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteAudioQCEngine;
