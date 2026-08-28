class ProfitMenteAudioNormalizeEngine{
  static dbToLinear(db){return Math.pow(10,Number(db||0)/20)}
  static linearToDb(v){const n=Math.max(1e-9,Number(v)||0);return 20*Math.log10(n)}
  static targets(track){
    const t=Number(track);
    if(t===4)return {rmsDb:-18,peakDb:-1,label:'voz'};
    if(t===5)return {rmsDb:-24,peakDb:-1,label:'música'};
    return {rmsDb:-20,peakDb:-1,label:'efectos'};
  }
  static analyzeChannels(channels,startSample=0,endSample=null){
    const list=(channels||[]).filter(Boolean);if(!list.length)return {peak:0,rms:0,samples:0,peakDb:-Infinity,rmsDb:-Infinity};
    const max=Math.min(...list.map(c=>c.length||0)),start=Math.max(0,Math.min(max,Math.floor(Number(startSample)||0))),end=Math.max(start,Math.min(max,endSample==null?max:Math.floor(Number(endSample)||0)));
    let peak=0,sum=0,count=0;
    for(const channel of list){for(let i=start;i<end;i++){const x=Math.abs(Number(channel[i])||0);if(x>peak)peak=x;sum+=x*x;count++}}
    const rms=count?Math.sqrt(sum/count):0;
    return {peak,rms,samples:count,peakDb:peak?this.linearToDb(peak):-Infinity,rmsDb:rms?this.linearToDb(rms):-Infinity};
  }
  static recommendation(metrics,track,currentVolume=1){
    const target=this.targets(track),current=Math.max(0,Number(currentVolume));
    if(!metrics||metrics.samples<=0||metrics.rms<=1e-7)return {ok:false,reason:'silence',volume:current,gain:1,target};
    const rmsGain=this.dbToLinear(target.rmsDb)/metrics.rms,peakGain=metrics.peak>0?this.dbToLinear(target.peakDb)/metrics.peak:2;
    const gain=Math.max(.1,Math.min(2,rmsGain,peakGain)),volume=Math.max(0,Math.min(2,current*gain));
    return {ok:true,gain,volume,target,limitedByPeak:peakGain<rmsGain,metrics};
  }
  static analyzeBuffer(buffer,sourceOffset=0,sourceDuration=null){
    if(!buffer||!buffer.sampleRate||!buffer.numberOfChannels)return {peak:0,rms:0,samples:0,peakDb:-Infinity,rmsDb:-Infinity};
    const rate=buffer.sampleRate,start=Math.max(0,Math.floor((Number(sourceOffset)||0)*rate)),duration=sourceDuration==null?null:Math.max(0,Number(sourceDuration)||0),end=duration==null?buffer.length:Math.min(buffer.length,start+Math.floor(duration*rate)),channels=[];
    for(let i=0;i<buffer.numberOfChannels;i++)channels.push(buffer.getChannelData(i));
    return this.analyzeChannels(channels,start,end);
  }
  static clipWindow(clip,bufferDuration){
    const speed=Math.max(.25,Math.min(4,Number(clip?.speed)||1)),offset=Math.max(0,Number(clip?.sourceOffset)||0),timelineDuration=Math.max(0,Number(clip?.duration)||0),available=Math.max(0,Number(bufferDuration||0)-offset),sourceDuration=Math.min(available,timelineDuration*speed);
    return {offset,sourceDuration,speed};
  }
}
if(typeof window!=='undefined')window.ProfitMenteAudioNormalizeEngine=ProfitMenteAudioNormalizeEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteAudioNormalizeEngine;
