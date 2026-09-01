(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteAutoTransitionEngine=api.ProfitMenteAutoTransitionEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const TYPES=['fade','slide','zoom'];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const fpsOf=p=>[24,30,60].includes(Math.round(Number(p?.fps)))?Math.round(Number(p.fps)):30;
  const frame=(v,fps)=>Math.round(v*fps)/fps;
  const trackLocked=(project,track)=>{
    const key=String(track),current=project?.trackState?.[track]??project?.trackState?.[key],legacy=project?.trackStates?.[track]??project?.trackStates?.[key];
    return current?.locked===true||legacy?.locked===true;
  };
  const clipLocked=clip=>clip?.locked===true;
  class ProfitMenteAutoTransitionEngine{
    static generated(project){return (project?.clips||[]).filter(c=>Number(c.track)===0&&String(c.sceneText||'').trim()).sort((a,b)=>Number(a.start||0)-Number(b.start||0)||String(a.id||'').localeCompare(String(b.id||'')))}
    static preferred(clip,index){
      const role=String(clip?.name||'').toUpperCase();
      if(/CTA|PRUEBA/.test(role))return 'fade';
      if(/SOLUCI|PROBLEMA/.test(role))return index%2?'slide':'zoom';
      return TYPES[index%TYPES.length];
    }
    static durationFor(project,clip){
      const fps=fpsOf(project),d=Math.max(1/fps,Number(clip?.duration)||1),target=clamp(d*.08,.15,.42),max=Math.max(1/fps,Math.min(.65,d*.22));
      return clamp(frame(target,fps),1/fps,frame(max,fps));
    }
    static inspect(project){
      const clips=this.generated(project),fps=fpsOf(project),tol=1/fps+.0001;let eligible=0,manual=0,invalid=0,stale=0,locked=0;
      const lockedTrack=trackLocked(project,0);
      for(let i=0;i<clips.length;i++)if(lockedTrack||clipLocked(clips[i]))locked++;
      for(let i=1;i<clips.length;i++){
        const c=clips[i],prev=clips[i-1],gap=Number(c.start||0)-(Number(prev.start||0)+Number(prev.duration||0));
        if(Math.abs(gap)<=tol)eligible++;else if(c.autoTransition&&c.transition!=='cut')stale++;
        if(c.transition&&!c.autoTransition)manual++;
        if(c.autoTransition&&c.transition!=='cut'&&(!TYPES.includes(c.transition)||!Number.isFinite(Number(c.transitionDuration))||Number(c.transitionDuration)<1/fps-.0001||Number(c.transitionDuration)>Math.min(2,Number(c.duration||0))+.0001))invalid++;
      }
      return {generated:clips.length,eligible,manual,invalid,stale,locked,fps};
    }
    static apply(project,{force=false}={}){
      const clips=this.generated(project),fps=fpsOf(project),tol=1/fps+.0001;let changed=0,preserved=0,skipped=0,cleared=0,locked=0;
      if(!clips.length)return {changed,preserved,skipped,cleared,locked,generated:0};
      if(trackLocked(project,0))return {changed,preserved,skipped,cleared,locked:clips.length,generated:clips.length};
      const first=clips[0];
      if(clipLocked(first))locked++;
      else if(force||first.autoTransition||!first.transition){if(first.transition!=='cut'||first.transitionDuration!=null||!first.autoTransition){first.transition='cut';delete first.transitionDuration;first.autoTransition=true;changed++}}
      for(let i=1;i<clips.length;i++){
        const c=clips[i],prev=clips[i-1];
        if(clipLocked(c)){locked++;continue}
        const gap=Number(c.start||0)-(Number(prev.start||0)+Number(prev.duration||0));
        if(Math.abs(gap)>tol){
          if(c.autoTransition&&(c.transition!=='cut'||c.transitionDuration!=null)){c.transition='cut';delete c.transitionDuration;changed++;cleared++}
          skipped++;continue
        }
        if(c.transition&&!c.autoTransition&&!force){preserved++;continue}
        const type=this.preferred(c,i),duration=this.durationFor(project,c),same=c.transition===type&&Math.abs(Number(c.transitionDuration||0)-duration)<1e-6&&c.autoTransition===true;
        c.transition=type;c.transitionDuration=duration;c.autoTransition=true;if(!same)changed++;
      }
      return {changed,preserved,skipped,cleared,locked,generated:clips.length};
    }
  }
  return {ProfitMenteAutoTransitionEngine};
});