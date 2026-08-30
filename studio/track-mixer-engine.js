(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports){module.exports=api;return}
  root.ProfitMenteTrackMixerEngine=api.ProfitMenteTrackMixerEngine;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const AUDIO_TRACKS=[4,5,6],MIN_GAIN=0,MAX_GAIN=2,DEFAULT_GAIN=1;
  class ProfitMenteTrackMixerEngine{
    static get AUDIO_TRACKS(){return AUDIO_TRACKS}
    static clampGain(value){
      const n=Number(value);return Math.max(MIN_GAIN,Math.min(MAX_GAIN,Number.isFinite(n)?n:DEFAULT_GAIN));
    }
    static ensure(trackState){
      const out=trackState&&typeof trackState==='object'&&!Array.isArray(trackState)?trackState:{};
      for(const track of AUDIO_TRACKS){
        const existing=out[track]||out[String(track)]||{};
        out[track]={...existing,gain:this.clampGain(existing.gain)};
      }
      return out;
    }
    static state(trackState,track){
      const n=Number(track);if(!AUDIO_TRACKS.includes(n))return null;
      return this.ensure(trackState)[n];
    }
    static gain(trackState,track){return this.state(trackState,track)?.gain??DEFAULT_GAIN}
    static setGain(trackState,track,value){
      const s=this.state(trackState,track);if(!s)return null;s.gain=this.clampGain(value);return s.gain;
    }
    static effectiveVolume(project,clip,baseVolume){
      const base=Math.max(0,Number(baseVolume)||0),track=Number(clip?.track);
      if(!AUDIO_TRACKS.includes(track))return base;
      return Math.max(0,Math.min(4,base*this.gain(project?.trackState,track)));
    }
    static percent(value){return `${Math.round(this.clampGain(value)*100)}%`}
  }
  return {ProfitMenteTrackMixerEngine,AUDIO_TRACKS,MIN_GAIN,MAX_GAIN,DEFAULT_GAIN};
});
