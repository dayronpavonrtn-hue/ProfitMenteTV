(()=>{
  if(typeof window==='undefined'||!window.ProfitMenteTrackMixerEngine||!window.ProfitMenteBundleEngine)return;
  const E=window.ProfitMenteTrackMixerEngine,proto=window.ProfitMenteBundleEngine.prototype;
  function bake(project){
    const next=structuredClone(project||{});next.trackState=E.ensure(next.trackState);
    next.clips=(next.clips||[]).map(clip=>{
      if(!E.AUDIO_TRACKS.includes(Number(clip?.track)))return clip;
      const track=Number(clip.track),fallback=track===5?.22:1,base=clip.volume==null?fallback:Math.max(0,Number(clip.volume)||0);
      clip.volume=Math.max(0,Math.min(4,base*E.gain(next.trackState,track)));
      return clip;
    });
    for(const track of E.AUDIO_TRACKS)next.trackState[track].gain=1;
    next.renderMix={...(next.renderMix||{}),trackGainBaked:true};
    return next;
  }
  if(!proto.__trackMixerRenderPatched){
    const base=proto.renderLocal;
    proto.renderLocal=function(project,assets,onStatus){return base.call(this,bake(project),assets,onStatus)};
    proto.__trackMixerRenderPatched=true;
  }
  window.ProfitMenteTrackMixerRender={bake};
})();
