(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  const VISUAL_TRACKS=[0,1,2,3],AUDIO_TRACKS=[4,5,6];
  function trackState(project,track){
    const modern=project?.trackState?.[track]||project?.trackState?.[String(track)]||{};
    const legacy=project?.trackStates?.[track]||project?.trackStates?.[String(track)]||{};
    return {
      hidden:!!(modern.hidden||legacy.hidden),
      muted:!!(modern.muted||legacy.muted),
      solo:!!(modern.solo||legacy.solo)
    };
  }
  function soloSet(project,tracks){
    const set=new Set(tracks.filter(track=>trackState(project,track).solo));
    return set.size?set:null;
  }
  function isTrackActive(project,track,kind){
    const state=trackState(project,track);
    const group=kind==='visual'?VISUAL_TRACKS:AUDIO_TRACKS;
    const solo=soloSet(project,group);
    if(solo&&!solo.has(track))return false;
    return kind==='visual'?!state.hidden:!state.muted;
  }
  class ProfitMenteAutoFinishEngine{
    static inspect(project,assets=[]){
      const clips=Array.isArray(project?.clips)?project.clips:[];
      const visualClips=clips.filter(c=>VISUAL_TRACKS.includes(Number(c.track))&&c.asset&&isTrackActive(project,Number(c.track),'visual'));
      const activeAudio=track=>clips.filter(c=>Number(c.track)===track&&c.asset&&!c.muted&&isTrackActive(project,track,'audio'));
      const generated=visualClips.filter(c=>String(c.sceneText||'').trim());
      const beats=(project?.markers||[]).filter(m=>/^Beat\b/i.test(String(m?.label||'')));
      const autoTransitions=generated.filter(c=>c.autoTransition).length;
      return {visual:visualClips.length,generated:generated.length,voice:activeAudio(6).length,music:activeAudio(5).length,sfx:activeAudio(4).length,beats:beats.length,autoTransitions,assets:(assets||[]).length};
    }
    static plan(project,assets=[]){
      const s=this.inspect(project,assets),steps=['repair'];
      if(s.voice&&s.music)steps.push('smart-mix');
      if(s.music||s.voice||s.sfx){if(!s.beats)steps.push('detect-beats');if(s.generated>1)steps.push('sync-beats')}
      if(s.generated>1)steps.push('auto-transitions');
      steps.push('qa');
      return {steps,summary:s};
    }
  }
  root.ProfitMenteAutoFinishEngine=ProfitMenteAutoFinishEngine;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteAutoFinishEngine;
})();
