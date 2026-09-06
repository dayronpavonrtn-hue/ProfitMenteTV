class ProfitMenteAudioWaveformEngine{
  static AUDIO_TRACKS=[4,5,6]
  static clamp(value,min=0,max=1){const n=Number(value);return Math.min(max,Math.max(min,Number.isFinite(n)?n:min))}
  static canonicalTrack(value){
    if(value===null||value===undefined||typeof value==='boolean')return null;
    const raw=typeof value==='string'?value.trim():value;if(raw==='')return null;
    const n=Number(raw);return Number.isFinite(n)&&Number.isInteger(n)&&n>=0&&n<=6?(Object.is(n,-0)?0:n):null;
  }
  static canonicalMediaId(value){
    if(value===null||value===undefined||typeof value==='boolean')return null;
    if(typeof value==='string'){
      const raw=value.trim();if(raw==='')return null;
      const numeric=Number(raw);
      return Number.isFinite(numeric)?String(Object.is(numeric,-0)?0:numeric):raw;
    }
    if(typeof value==='number'&&Number.isFinite(value))return String(Object.is(value,-0)?0:value);
    return null;
  }
  static hasAsset(value){return this.canonicalMediaId(value)!==null}
  static sameIdentity(a,b){const left=this.canonicalMediaId(a),right=this.canonicalMediaId(b);return left!==null&&right!==null&&left===right}
  static findById(items=[],id){return (items||[]).find(item=>this.sameIdentity(item?.id,id))||null}
  static isAudioTrack(value){return this.AUDIO_TRACKS.includes(this.canonicalTrack(value))}
  static channels(input=[]){
    if(!input)return [];
    if(Array.isArray(input))return input.filter(Boolean);
    if(typeof input.numberOfChannels==='number'&&typeof input.getChannelData==='function'){
      const out=[];for(let i=0;i<input.numberOfChannels;i++)out.push(input.getChannelData(i));return out;
    }
    return [];
  }
  static buildPeaks(input=[],bins=512){
    const channels=this.channels(input),length=channels.reduce((n,ch)=>Math.max(n,Number(ch?.length)||0),0),count=Math.max(8,Math.min(4096,Math.floor(Number(bins)||512)));
    if(!length||!channels.length)return new Float32Array(count);
    const peaks=new Float32Array(count),step=length/count;
    for(let bin=0;bin<count;bin++){
      const from=Math.floor(bin*step),to=Math.max(from+1,Math.min(length,Math.ceil((bin+1)*step)));let peak=0;
      for(const ch of channels){
        if(!ch)continue;
        for(let i=from;i<to&&i<ch.length;i++){const sample=Math.abs(Number(ch[i])||0);if(sample>peak)peak=sample}
      }
      peaks[bin]=this.clamp(peak,0,1);
    }
    return peaks;
  }
  static sourceWindow({sourceOffset=0,clipDuration=0,speed=1,sourceDuration=0}={}){
    const total=Math.max(0,Number(sourceDuration)||0),rate=Math.max(.01,Number(speed)||1),offset=this.clamp(Number(sourceOffset)||0,0,total||Number.MAX_SAFE_INTEGER),duration=Math.max(0,Number(clipDuration)||0),end=total?Math.min(total,offset+duration*rate):offset+duration*rate;
    return {start:offset,end,duration:Math.max(0,end-offset),speed:rate,sourceDuration:total};
  }
  static slicePeaks(peaks,{sourceOffset=0,clipDuration=0,speed=1,sourceDuration=0,bins=160}={}){
    const source=peaks||[],outCount=Math.max(8,Math.min(1024,Math.floor(Number(bins)||160))),out=new Float32Array(outCount),total=Math.max(0,Number(sourceDuration)||0);
    if(!source.length||!total)return out;
    const win=this.sourceWindow({sourceOffset,clipDuration,speed,sourceDuration:total});
    if(win.duration<=0)return out;
    const from=this.clamp(win.start/total,0,1)*source.length,to=this.clamp(win.end/total,0,1)*source.length,span=Math.max(1e-6,to-from),step=span/outCount;
    for(let bin=0;bin<outCount;bin++){
      const a=Math.floor(from+bin*step),b=Math.max(a+1,Math.ceil(from+(bin+1)*step));let peak=0;
      for(let i=a;i<b&&i<source.length;i++)peak=Math.max(peak,Number(source[i])||0);
      out[bin]=this.clamp(peak,0,1);
    }
    return out;
  }
  static drawable(peaks=[]){return Array.from(peaks||[],v=>this.clamp(v,0,1))}
}
if(typeof window!=='undefined')window.ProfitMenteAudioWaveformEngine=ProfitMenteAudioWaveformEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteAudioWaveformEngine;
