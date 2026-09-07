class ProfitMenteAudioDuckingEngine{
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
    return value!==null&&Number.isInteger(value)&&value>=0&&value<=6?value:null;
  }
  static canonicalId(value){
    if(value===null||value===undefined||typeof value==='boolean')return null;
    if(typeof value==='number')return Number.isFinite(value)?String(Object.is(value,-0)?0:value):null;
    if(typeof value==='string'){
      const trimmed=value.trim();if(!trimmed)return null;
      const numeric=Number(trimmed);return Number.isFinite(numeric)?String(Object.is(numeric,-0)?0:numeric):trimmed;
    }
    return null;
  }
  static hasAsset(value){return this.canonicalId(value)!==null}
  static segmentIdBase(value){return this.canonicalId(value)??'music'}
  static stateFrom(map,track){
    if(!map||typeof map!=='object')return {};
    const canonical=this.canonicalTrack(track);if(canonical===null)return {};
    const states=[];
    for(const [key,value] of Object.entries(map)){
      if(this.canonicalTrack(key)===canonical&&value&&typeof value==='object')states.push(value);
    }
    const merged=Object.assign({},...states);
    for(const key of ['muted','solo'])if(states.some(state=>!!state?.[key]))merged[key]=true;
    return merged;
  }
  static trackState(project,track){
    const current=this.stateFrom(project?.trackState,track),legacy=this.stateFrom(project?.trackStates,track),merged={...legacy,...current};
    for(const key of ['muted','solo'])if(legacy?.[key]||current?.[key])merged[key]=true;
    return merged;
  }
  static audioSoloSet(project){return new Set(this.AUDIO_TRACKS.filter(track=>!!this.trackState(project,track).solo))}
  static trackActive(project,track){
    const canonical=this.canonicalTrack(track);if(canonical===null)return false;
    const state=this.trackState(project,canonical);if(state.muted)return false;
    const solos=this.audioSoloSet(project);return !solos.size||solos.has(canonical);
  }
  static enabled(clip){return clip?.ducking!==false}
  static intervals(project,music){
    if(!music||this.canonicalTrack(music.track)!==5||!this.hasAsset(music.asset)||!this.enabled(music)||!this.trackActive(project,5)||!this.trackActive(project,6))return [];
    const ms=this.finiteNumber(music.start,0),md=Math.max(0,this.finiteNumber(music.duration,0)),me=ms+md;
    const raw=(project?.clips||[]).filter(v=>this.canonicalTrack(v.track)===6&&this.hasAsset(v.asset)&&!v.muted).map(v=>{
      const vs=this.finiteNumber(v.start,0),vd=Math.max(0,this.finiteNumber(v.duration,0)),s=Math.max(ms,vs),e=Math.min(me,vs+vd);
      return e>s?{start:s-ms,end:e-ms}:null;
    }).filter(Boolean).sort((a,b)=>a.start-b.start||a.end-b.end);
    const merged=[];for(const x of raw){const last=merged.at(-1);if(last&&x.start<=last.end+.001)last.end=Math.max(last.end,x.end);else merged.push({...x})}return merged;
  }
  static baseVolume(clip){return Math.max(0,Math.min(2,this.finiteNumber(clip?.volume,.22)))}
  static duckVolume(clip){const base=this.baseVolume(clip),target=Math.max(0,Math.min(2,this.finiteNumber(clip?.duckVolume,.16)));return Math.min(base,target)}
  static multiplier(clip){const base=this.baseVolume(clip);return base>0?this.duckVolume(clip)/base:1}
  static multiplierAt(project,clip,localTime){if(!this.enabled(clip))return 1;const t=this.finiteNumber(localTime,0);return this.intervals(project,clip).some(x=>t>=x.start&&t<x.end)?this.multiplier(clip):1}
  static events(project,clip,from=0,to=Infinity){const start=this.finiteNumber(from,0),end=to===Infinity?Infinity:this.finiteNumber(to,Infinity),out=[];for(const x of this.intervals(project,clip)){if(x.end<=start||x.start>=end)continue;if(x.start>start)out.push({time:x.start,value:this.multiplier(clip)});if(x.end>start&&x.end<end)out.push({time:x.end,value:1})}return out.sort((a,b)=>a.time-b.time)}
  static prepareForRender(project){
    const next=structuredClone(project||{}),source=project?.clips||[],out=[];
    for(const clip of source){
      if(this.canonicalTrack(clip.track)!==5||!this.hasAsset(clip.asset)){out.push(structuredClone(clip));continue}
      const intervals=this.intervals(project,clip);if(!intervals.length){out.push(structuredClone(clip));continue}
      const d=Math.max(0,this.finiteNumber(clip.duration,0)),bounds=[0,d,...intervals.flatMap(x=>[x.start,x.end])].filter(x=>x>=0&&x<=d).sort((a,b)=>a-b),uniq=bounds.filter((x,i)=>i===0||Math.abs(x-bounds[i-1])>.001),speed=Math.max(.25,Math.min(4,this.finiteNumber(clip.speed,1))),offset=Math.max(0,this.finiteNumber(clip.sourceOffset,0)),base=this.baseVolume(clip),duck=this.duckVolume(clip),segmentBase=this.segmentIdBase(clip.id),clipStart=this.finiteNumber(clip.start,0),fadeIn=Math.max(0,this.finiteNumber(clip.fadeIn,.18)),fadeOut=Math.max(0,this.finiteNumber(clip.fadeOut,.25));
      for(let i=0;i<uniq.length-1;i++){
        const s=uniq[i],e=uniq[i+1];if(e-s<.01)continue;const mid=(s+e)/2,isDuck=intervals.some(x=>mid>=x.start&&mid<x.end),part=structuredClone(clip);
        part.id=`${segmentBase}-duck-${i}`;part.start=clipStart+s;part.duration=e-s;part.sourceOffset=offset+s*speed;part.volume=isDuck?duck:base;part.fadeIn=i===0?Math.min(fadeIn,part.duration):0;part.fadeOut=i===uniq.length-2?Math.min(fadeOut,part.duration):0;out.push(part);
      }
    }
    next.clips=out;return next;
  }
}
if(typeof window!=='undefined')window.ProfitMenteAudioDuckingEngine=ProfitMenteAudioDuckingEngine;
if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteAudioDuckingEngine;
