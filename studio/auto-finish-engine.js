(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  class ProfitMenteAutoFinishEngine{
    static inspect(project,assets=[]){
      const clips=Array.isArray(project?.clips)?project.clips:[];
      const active=t=>clips.filter(c=>Number(c.track)===t&&c.asset&&!c.muted&&!project?.trackState?.[t]?.muted&&!project?.trackState?.[t]?.hidden);
      const visual=clips.filter(c=>[0,1].includes(Number(c.track))&&c.asset&&!project?.trackState?.[Number(c.track)]?.hidden);
      const generated=clips.filter(c=>Number(c.track)===0&&String(c.sceneText||'').trim());
      const beats=(project?.markers||[]).filter(m=>/^Beat\b/i.test(String(m?.label||'')));
      return {visual:visual.length,generated:generated.length,voice:active(6).length,music:active(5).length,sfx:active(4).length,beats:beats.length,assets:(assets||[]).length};
    }
    static plan(project,assets=[]){
      const s=this.inspect(project,assets),steps=['repair'];
      if(s.voice&&s.music)steps.push('smart-mix');
      if(s.music||s.voice||s.sfx){if(!s.beats)steps.push('detect-beats');if(s.generated>1)steps.push('sync-beats')}
      steps.push('qa');
      return {steps,summary:s};
    }
  }
  root.ProfitMenteAutoFinishEngine=ProfitMenteAutoFinishEngine;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProfitMenteAutoFinishEngine;
})();
