class ProfitMenteAudioDuckingEngine{
  static trackMuted(project,track){const s=project?.trackState?.[String(track)]??project?.trackState?.[track];return !!s?.muted}
  static enabled(clip){return clip?.ducking!==false}
  static intervals(project,music){
    if(!music||Number(music.track)!==5||!this.enabled(music)||this.trackMuted(project,6))return [];
    const ms=Number(music.start)||0,md=Math.max(0,Number(music.duration)||0),me=ms+md;
    const raw=(project?.clips||[]).filter(v=>Number(v.track)===6&&v.asset&&!v.muted).map(v=>{
      const s=Math.max(ms,Number(v.start)||0),e=Math.min(me,(Number(v.start)||0)+Math.max(0,Number(v.duration)||0));
      return e>s?{start:s-ms,end:e-ms}:null;
    }).filter(Boolean).sort((a,b)=>a.start-b.start||a.end-b.end);
    const merged=[];for(const x of raw){const last=merged.at(-1);if(last&&x.start<=last.end+.001)last.end=Math.max(last.end,x.end);else merged.push({...x})}return merged;
  }
  static baseVolume(clip){return Math.max(0,Math.min(2,Number(clip?.volume??.22)||0))}
  static duckVolume(clip){const base=this.baseVolume(clip),target=Math.max(0,Math.min(2,Number(clip?.duckVolume??.16)||0));return Math.min(base,target)}
  static multiplier(clip){const base=this.baseVolume(clip);return base>0?this.duckVolume(clip)/base:1}
  static multiplierAt(project,clip,localTime){if(!this.enabled(clip))return 1;const t=Number(localTime)||0;return this.intervals(project,clip).some(x=>t>=x.start&&t<x.end)?this.multiplier(clip):1}
  static events(project,clip,from=0,to=Infinity){const out=[];for(const x of this.intervals(project,clip)){if(x.end<=from||x.start>=to)continue;if(x.start>from)out.push({time:x.start,value:this.multiplier(clip)});if(x.end>from&&x.end<to)out.push({time:x.end,value:1})}return out.sort((a,b)=>a.time-b.time)}
}
if(typeof window!=='undefined')window.ProfitMenteAudioDuckingEngine=ProfitMenteAudioDuckingEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteAudioDuckingEngine;
