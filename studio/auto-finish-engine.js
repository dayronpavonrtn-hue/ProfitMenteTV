(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteAutoFinishEngine{
    static inspect(project,assets=[]){
      const clips=Array.isArray(project?.clips)?project.clips:[];
      const active=t=>clips.filter(c=>Number(c.track)===t&&c.asset&&!c.muted&&!project?.trackState?.[t]?.muted&&!project?.trackState?.[t]?.hidden);
      const visual=clips.filter(c=>[0,1].includes(Number(c.track))&&c.asset&&!project?.trackState?.[Number(c.track)]?.hidden);
      const generated=clips.filter(c=>Number(c.track)===0&&String(c.sceneText||'').trim());
      const beats=(project?.markers||[]).filter(m=>/^Beat\b/i.test(String(m?.label||'')));
      const autoTransitions=generated.filter(c=>c.autoTransition).length;
      return {visual:visual.length,generated:generated.length,voice:active(6).length,music:active(5).length,sfx:active(4).length,beats:beats.length,autoTransitions,assets:(assets||[]).length};
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
