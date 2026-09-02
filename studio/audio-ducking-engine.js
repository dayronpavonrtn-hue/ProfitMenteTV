class ProfitMenteAudioDuckingEngine{
  static AUDIO_TRACKS=[4,5,6]
  static stateFrom(map,track){const value=map?.[String(track)]??map?.[track];return value&&typeof value==='object'?value:{}}
  static trackState(project,track){
    const current=this.stateFrom(project?.trackState,track),legacy=this.stateFrom(project?.trackStates,track),merged={...legacy,...current};
    for(const key of ['muted','solo'])if(legacy?.[key]||current?.[key])merged[key]=true;
    return merged;
  }
  static audioSoloSet(project){return new Set(this.AUDIO_TRACKS.filter(track=>!!this.trackState(project,track).solo))}
  static trackActive(project,track){
    const state=this.trackState(project,track);if(state.muted)return false;
    const solos=this.audioSoloSet(project);return !solos.size||solos.has(Number(track));
  }
  static enabled(clip){return clip?.ducking!==false}
  static intervals(project,music){
    if(!music||Number(music.track)!==5||!this.enabled(music)||!this.trackActive(project,5)||!this.trackActive(project,6))return [];
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
  static prepareForRender(project){
    const next=structuredClone(project||{}),source=project?.clips||[],out=[];
    for(const clip of source){
      if(Number(clip.track)!==5||!clip.asset){out.push(structuredClone(clip));continue}
      const intervals=this.intervals(project,clip);if(!intervals.length){out.push(structuredClone(clip));continue}
      const d=Math.max(0,Number(clip.duration)||0),bounds=[0,d,...intervals.flatMap(x=>[x.start,x.end])].filter(x=>x>=0&&x<=d).sort((a,b)=>a-b),uniq=bounds.filter((x,i)=>i===0||Math.abs(x-bounds[i-1])>.001),speed=Math.max(.25,Math.min(4,Number(clip.speed)||1)),offset=Math.max(0,Number(clip.sourceOffset)||0),base=this.baseVolume(clip),duck=this.duckVolume(clip);
      for(let i=0;i<uniq.length-1;i++){
        const s=uniq[i],e=uniq[i+1];if(e-s<.01)continue;const mid=(s+e)/2,isDuck=intervals.some(x=>mid>=x.start&&mid<x.end),part=structuredClone(clip);
        part.id=`${clip.id||'music'}-duck-${i}`;part.start=(Number(clip.start)||0)+s;part.duration=e-s;part.sourceOffset=offset+s*speed;part.volume=isDuck?duck:base;part.fadeIn=i===0?Math.min(Number(clip.fadeIn??.18)||0,part.duration):0;part.fadeOut=i===uniq.length-2?Math.min(Number(clip.fadeOut??.25)||0,part.duration):0;out.push(part);
      }
    }
    next.clips=out;return next;
  }
}
if(typeof window!=='undefined')window.ProfitMenteAudioDuckingEngine=ProfitMenteAudioDuckingEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteAudioDuckingEngine;
