(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  const VISUAL_TRACKS=[0,1,2,3],AUDIO_TRACKS=[4,5,6];
  function canonicalTrack(value){
    if(typeof value==='boolean'||value==null)return null;
    if(typeof value==='string'&&!value.trim())return null;
    const n=Number(value);
    return Number.isFinite(n)&&Number.isInteger(n)&&n>=0&&n<=6?n:null;
  }
  function hasMediaId(value){
    if(typeof value==='boolean'||value==null)return false;
    if(typeof value==='string')return value.trim().length>0;
    return typeof value==='number'?Number.isFinite(value):true;
  }
  function statesFor(source,track){
    const wanted=canonicalTrack(track);
    if(wanted==null||!source||typeof source!=='object')return [];
    return Object.entries(source).filter(([key])=>canonicalTrack(key)===wanted).map(([,state])=>state||{});
  }
  function trackState(project,track){
    const states=[...statesFor(project?.trackState,track),...statesFor(project?.trackStates,track)];
    return {
      hidden:states.some(state=>state.hidden===true),
      muted:states.some(state=>state.muted===true),
      solo:states.some(state=>state.solo===true)
    };
  }
  function soloSet(project,tracks){
    const set=new Set(tracks.filter(track=>trackState(project,track).solo));
    return set.size?set:null;
  }
  function isTrackActive(project,track,kind){
    const normalized=canonicalTrack(track);
    if(normalized==null)return false;
    const state=trackState(project,normalized);
    const group=kind==='visual'?VISUAL_TRACKS:AUDIO_TRACKS;
    const solo=soloSet(project,group);
    if(solo&&!solo.has(normalized))return false;
    return kind==='visual'?!state.hidden:!state.muted;
  }
  class ProfitMenteAutoFinishEngine{
    static inspect(project,assets=[]){
      const clips=Array.isArray(project?.clips)?project.clips:[];
      const safeAssets=Array.isArray(assets)?assets:[];
      const visualClips=clips.filter(c=>{const track=canonicalTrack(c?.track);return track!=null&&VISUAL_TRACKS.includes(track)&&hasMediaId(c?.asset)&&isTrackActive(project,track,'visual')});
      const activeAudio=track=>clips.filter(c=>canonicalTrack(c?.track)===track&&hasMediaId(c?.asset)&&!c.muted&&isTrackActive(project,track,'audio'));
      const generated=visualClips.filter(c=>String(c.sceneText||'').trim());
      const beats=(project?.markers||[]).filter(m=>/^Beat\b/i.test(String(m?.label||'')));
      const autoTransitions=generated.filter(c=>c.autoTransition).length;
      const visualAssets=safeAssets.filter(a=>hasMediaId(a?.id)&&['video','image'].includes(String(a?.type||'').toLowerCase())).length;
      return {visual:visualClips.length,generated:generated.length,voice:activeAudio(6).length,music:activeAudio(5).length,sfx:activeAudio(4).length,beats:beats.length,autoTransitions,assets:safeAssets.length,visualAssets};
    }
    static plan(project,assets=[]){
      const s=this.inspect(project,assets),steps=['repair'];
      if(s.visualAssets)steps.push('fill-visual-gaps');
      if(s.voice&&s.music)steps.push('smart-mix');
      if(s.music||s.voice||s.sfx){if(!s.beats)steps.push('detect-beats');if(s.generated>1)steps.push('sync-beats')}
      if(s.generated>1)steps.push('auto-transitions');
      steps.push('qa');
      return {steps,summary:s};
    }
  }
  ProfitMenteAutoFinishEngine.canonicalTrack=canonicalTrack;
  ProfitMenteAutoFinishEngine.hasMediaId=hasMediaId;
  ProfitMenteAutoFinishEngine.trackState=trackState;
  root.ProfitMenteAutoFinishEngine=ProfitMenteAutoFinishEngine;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteAutoFinishEngine;
})();
