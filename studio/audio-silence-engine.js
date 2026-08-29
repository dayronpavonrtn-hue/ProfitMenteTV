class ProfitMenteAudioSilenceEngine{
  static dbToLinear(db){return Math.pow(10,Number(db||0)/20)}
  static clipWindow(clip,bufferDuration){
    const speed=Math.max(.25,Math.min(4,Number(clip?.speed)||1));
    const offset=Math.max(0,Number(clip?.sourceOffset)||0);
    const timelineDuration=Math.max(0,Number(clip?.duration)||0);
    const available=Math.max(0,Number(bufferDuration||0)-offset);
    return {offset,sourceDuration:Math.min(available,timelineDuration*speed),speed};
  }
  static detectChannels(channels,sampleRate,startSec=0,durationSec=null,options={}){
    const list=(channels||[]).filter(Boolean),rate=Math.max(1,Number(sampleRate)||1);
    if(!list.length)return {ok:false,reason:'no-audio'};
    const maxSamples=Math.min(...list.map(c=>c.length||0));
    const start=Math.max(0,Math.min(maxSamples,Math.floor(Math.max(0,Number(startSec)||0)*rate)));
    const requested=durationSec==null?(maxSamples-start):Math.floor(Math.max(0,Number(durationSec)||0)*rate);
    const end=Math.max(start,Math.min(maxSamples,start+requested));
    if(end<=start)return {ok:false,reason:'empty-window'};
    const thresholdDb=Number.isFinite(Number(options.thresholdDb))?Number(options.thresholdDb):-45;
    const threshold=this.dbToLinear(thresholdDb);
    const frameSamples=Math.max(1,Math.floor(rate*Math.max(5,Number(options.frameMs)||20)/1000));
    const minSoundFrames=Math.max(1,Math.ceil(Math.max(0,Number(options.minSoundMs)||60)/(frameSamples/rate*1000)));
    const paddingSamples=Math.max(0,Math.floor(rate*Math.max(0,Number(options.paddingMs)||40)/1000));
    const active=[];
    for(let pos=start;pos<end;pos+=frameSamples){
      const stop=Math.min(end,pos+frameSamples);let sum=0,count=0;
      for(const ch of list){for(let i=pos;i<stop;i++){const x=Number(ch[i])||0;sum+=x*x;count++}}
      active.push({start:pos,end:stop,rms:count?Math.sqrt(sum/count):0});
    }
    let first=-1,last=-1,run=0;
    for(let i=0;i<active.length;i++){run=active[i].rms>=threshold?run+1:0;if(run>=minSoundFrames){first=i-run+1;break}}
    run=0;
    for(let i=active.length-1;i>=0;i--){run=active[i].rms>=threshold?run+1:0;if(run>=minSoundFrames){last=i+run-1;break}}
    if(first<0||last<0)return {ok:false,reason:'silence',thresholdDb};
    const soundStart=Math.max(start,active[first].start-paddingSamples),soundEnd=Math.min(end,active[Math.min(last,active.length-1)].end+paddingSamples);
    const leading=(soundStart-start)/rate,trailing=(end-soundEnd)/rate,sourceDuration=(end-start)/rate;
    return {ok:true,thresholdDb,leading,trailing,sourceDuration,soundDuration:Math.max(0,(soundEnd-soundStart)/rate)};
  }
  static detectBuffer(buffer,sourceOffset=0,sourceDuration=null,options={}){
    if(!buffer||!buffer.sampleRate||!buffer.numberOfChannels)return {ok:false,reason:'no-audio'};
    const channels=[];for(let i=0;i<buffer.numberOfChannels;i++)channels.push(buffer.getChannelData(i));
    return this.detectChannels(channels,buffer.sampleRate,sourceOffset,sourceDuration,options);
  }
  static trimPlan(clip,detection,options={}){
    if(!clip||!detection?.ok)return {ok:false,reason:detection?.reason||'invalid'};
    const speed=Math.max(.25,Math.min(4,Number(clip.speed)||1)),duration=Math.max(0,Number(clip.duration)||0),offset=Math.max(0,Number(clip.sourceOffset)||0);
    const minTimelineDuration=Math.max(.05,Number(options.minTimelineDuration)||.12);
    const minTrimSource=Math.max(0,Number(options.minTrimSource)||.03);
    let leading=Math.max(0,Number(detection.leading)||0),trailing=Math.max(0,Number(detection.trailing)||0);
    if(leading<minTrimSource)leading=0;if(trailing<minTrimSource)trailing=0;
    const trimTimeline=(leading+trailing)/speed,newDuration=duration-trimTimeline;
    if(!leading&&!trailing)return {ok:false,reason:'no-silence'};
    if(newDuration<minTimelineDuration)return {ok:false,reason:'too-short'};
    return {ok:true,leading,trailing,speed,sourceOffset:offset+leading,duration:newDuration,removedTimeline:trimTimeline};
  }
  static applyPlan(clip,plan){
    if(!clip||!plan?.ok)return false;
    clip.sourceOffset=plan.sourceOffset;clip.duration=plan.duration;
    clip.silenceTrim={version:1,leadingSource:plan.leading,trailingSource:plan.trailing,removedTimeline:plan.removedTimeline,at:new Date().toISOString()};
    return true;
  }
}
if(typeof window!=='undefined')window.ProfitMenteAudioSilenceEngine=ProfitMenteAudioSilenceEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteAudioSilenceEngine;
