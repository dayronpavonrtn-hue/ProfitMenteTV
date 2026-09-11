(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  const VISUAL_TRACKS=[0,1,2,3],AUDIO_TRACKS=[4,5,6];
  function canonicalTrack(value){
    if(typeof value==='number')return Number.isFinite(value)&&Number.isInteger(value)&&value>=0&&value<=6?value:null;
    if(typeof value!=='string'||!value.trim())return null;
    const n=Number(value);
    return Number.isFinite(n)&&Number.isInteger(n)&&n>=0&&n<=6?n:null;
  }
  function hasMediaId(value){
    if(typeof value==='string')return value.trim().length>0;
    return typeof value==='number'&&Number.isSafeInteger(value);
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
      solo:states.some(state=>state.solo===true),
      locked:states.some(state=>state.locked===true)
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
  function finiteNonNegative(value){
    if(typeof value==='boolean'||(typeof value!=='number'&&typeof value!=='string'))return 0;
    if(typeof value==='string'&&!value.trim())return 0;
    const n=Number(value);return Number.isFinite(n)?Math.max(0,n):0;
  }
  function overlaps(a,b){
    const aStart=finiteNonNegative(a?.start),bStart=finiteNonNegative(b?.start);
    const aEnd=aStart+finiteNonNegative(a?.duration),bEnd=bStart+finiteNonNegative(b?.duration);
    return aEnd>bStart+1e-6&&bEnd>aStart+1e-6;
  }
  function sceneText(clip){return String(clip?.sceneText||clip?.script||'').trim()}
  class ProfitMenteAutoFinishEngine{
    static inspect(project,assets=[]){
      const clips=Array.isArray(project?.clips)?project.clips:[];
      const safeAssets=Array.isArray(assets)?assets:[];
      const visualClips=clips.filter(c=>{const track=canonicalTrack(c?.track);return track!=null&&VISUAL_TRACKS.includes(track)&&hasMediaId(c?.asset)&&isTrackActive(project,track,'visual')});
      const activeAudio=track=>clips.filter(c=>canonicalTrack(c?.track)===track&&hasMediaId(c?.asset)&&!c.muted&&isTrackActive(project,track,'audio'));
      const generated=visualClips.filter(c=>sceneText(c));
      const scenes=clips.filter(c=>canonicalTrack(c?.track)===0&&sceneText(c)&&finiteNonNegative(c?.duration)>.1);
      const captions=clips.filter(c=>canonicalTrack(c?.track)===3);
      const broll=clips.filter(c=>canonicalTrack(c?.track)===1);
      const beats=(project?.markers||[]).filter(m=>/^Beat\b/i.test(String(m?.label||'')));
      const autoTransitions=generated.filter(c=>c.autoTransition).length;
      const visualAssets=safeAssets.filter(a=>hasMediaId(a?.id)&&['video','image'].includes(String(a?.type||'').toLowerCase())).length;
      const captionTrackLocked=trackState(project,3).locked;
      const brollTrackLocked=trackState(project,1).locked;
      const missingCaptions=captionTrackLocked?0:scenes.filter(scene=>!captions.some(c=>overlaps(c,scene))).length;
      const missingBroll=brollTrackLocked||!visualAssets?0:scenes.filter(scene=>!broll.some(c=>overlaps(c,scene))).length;
      return {visual:visualClips.length,generated:generated.length,scenes:scenes.length,voice:activeAudio(6).length,music:activeAudio(5).length,sfx:activeAudio(4).length,beats:beats.length,autoTransitions,assets:safeAssets.length,visualAssets,missingCaptions,missingBroll,captionTrackLocked,brollTrackLocked};
    }
    static plan(project,assets=[]){
      const s=this.inspect(project,assets),steps=['repair'];
      if(s.missingCaptions)steps.push('scene-captions');
      if(s.missingBroll)steps.push('scene-broll');
      if(s.visualAssets)steps.push('fill-visual-gaps');
      if(s.voice&&s.music)steps.push('smart-mix');
      if(s.music||s.voice||s.sfx){if(!s.beats)steps.push('detect-beats');if(s.generated>1)steps.push('sync-beats')}
      if(s.generated>1)steps.push('auto-transitions');
      if(s.music||s.voice||s.sfx)steps.push('audio-headroom');
      steps.push('qa');
      return {steps,summary:s};
    }
  }
  ProfitMenteAutoFinishEngine.canonicalTrack=canonicalTrack;
  ProfitMenteAutoFinishEngine.hasMediaId=hasMediaId;
  ProfitMenteAutoFinishEngine.trackState=trackState;
  ProfitMenteAutoFinishEngine.overlaps=overlaps;
  root.ProfitMenteAutoFinishEngine=ProfitMenteAutoFinishEngine;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteAutoFinishEngine;
})();
