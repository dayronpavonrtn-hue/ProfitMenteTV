(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ProfitMenteAutoTransitionEngine=api.ProfitMenteAutoTransitionEngine})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const TYPES=['fade','slide','zoom'];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const finiteNumber=value=>{
    if(typeof value==='boolean'||value==null||Array.isArray(value)||(typeof value==='object'&&value!==null))return null;
    if(typeof value==='string'&&!value.trim())return null;
    const n=Number(value);return Number.isFinite(n)?(Object.is(n,-0)?0:n):null;
  };
  const fpsOf=p=>{const raw=finiteNumber(p?.fps),fps=raw==null?30:Math.round(raw);return [24,30,60].includes(fps)?fps:30};
  const frame=(v,fps)=>Math.round(v*fps)/fps;
  const canonicalTrack=value=>{
    const n=finiteNumber(value);
    if(n==null||!Number.isInteger(n)||n<0||n>6)return null;
    return n;
  };
  const geometry=clip=>{
    const start=finiteNumber(clip?.start),duration=finiteNumber(clip?.duration);
    return start!=null&&start>=0&&duration!=null&&duration>0?{start,duration}:null;
  };
  const entriesForTrack=(map,track)=>{
    if(!map||typeof map!=='object')return [];
    const wanted=canonicalTrack(track);
    if(wanted==null)return [];
    return Object.entries(map).filter(([key])=>canonicalTrack(key)===wanted).map(([,state])=>state).filter(Boolean);
  };
  const trackLocked=(project,track)=>{
    const states=[...entriesForTrack(project?.trackState,track),...entriesForTrack(project?.trackStates,track)];
    return states.some(state=>state?.locked===true);
  };
  const clipLocked=clip=>clip?.locked===true;
  class ProfitMenteAutoTransitionEngine{
    static generated(project){return (project?.clips||[]).filter(c=>canonicalTrack(c?.track)===0&&String(c.sceneText||'').trim()).sort((a,b)=>(geometry(a)?.start??Infinity)-(geometry(b)?.start??Infinity)||String(a.id||'').localeCompare(String(b.id||'')))}
    static preferred(clip,index){
      const role=String(clip?.name||'').toUpperCase();
      if(/CTA|PRUEBA/.test(role))return 'fade';
      if(/SOLUCI|PROBLEMA/.test(role))return index%2?'slide':'zoom';
      return TYPES[index%TYPES.length];
    }
    static durationFor(project,clip){
      const fps=fpsOf(project),g=geometry(clip),d=g?.duration??1,target=clamp(d*.08,.15,.42),max=Math.max(1/fps,Math.min(.65,d*.22));
      return clamp(frame(target,fps),1/fps,frame(max,fps));
    }
    static inspect(project){
      const clips=this.generated(project),fps=fpsOf(project),tol=1/fps+.0001;let eligible=0,manual=0,invalid=0,stale=0,locked=0,invalidGeometry=0;
      const lockedTrack=trackLocked(project,0);
      for(let i=0;i<clips.length;i++){if(lockedTrack||clipLocked(clips[i]))locked++;if(!geometry(clips[i]))invalidGeometry++}
      for(let i=1;i<clips.length;i++){
        const c=clips[i],prev=clips[i-1],cg=geometry(c),pg=geometry(prev);
        if(cg&&pg){const gap=cg.start-(pg.start+pg.duration);if(Math.abs(gap)<=tol)eligible++;else if(c.autoTransition&&c.transition!=='cut')stale++}
        else if(c.autoTransition&&c.transition!=='cut')stale++;
        if(c.transition&&!c.autoTransition)manual++;
        const transitionDuration=finiteNumber(c.transitionDuration);
        if(c.autoTransition&&c.transition!=='cut'&&(!TYPES.includes(c.transition)||transitionDuration==null||transitionDuration<1/fps-.0001||!cg||transitionDuration>Math.min(2,cg.duration)+.0001))invalid++;
      }
      return {generated:clips.length,eligible,manual,invalid,stale,locked,invalidGeometry,fps};
    }
    static apply(project,{force=false}={}){
      const clips=this.generated(project),fps=fpsOf(project),tol=1/fps+.0001;let changed=0,preserved=0,skipped=0,cleared=0,locked=0,invalidGeometry=0;
      if(!clips.length)return {changed,preserved,skipped,cleared,locked,invalidGeometry,generated:0};
      if(trackLocked(project,0))return {changed,preserved,skipped,cleared,locked:clips.length,invalidGeometry:clips.filter(c=>!geometry(c)).length,generated:clips.length};
      const first=clips[0],firstGeometry=geometry(first);
      if(!firstGeometry){invalidGeometry++;skipped++}
      else if(clipLocked(first))locked++;
      else if(force||first.autoTransition||!first.transition){if(first.transition!=='cut'||first.transitionDuration!=null||!first.autoTransition){first.transition='cut';delete first.transitionDuration;first.autoTransition=true;changed++}}
      for(let i=1;i<clips.length;i++){
        const c=clips[i],prev=clips[i-1],cg=geometry(c),pg=geometry(prev);
        if(!cg||!pg){
          if(!cg)invalidGeometry++;
          if(c.autoTransition&&(c.transition!=='cut'||c.transitionDuration!=null)){c.transition='cut';delete c.transitionDuration;changed++;cleared++}
          skipped++;continue
        }
        if(clipLocked(c)){locked++;continue}
        const gap=cg.start-(pg.start+pg.duration);
        if(Math.abs(gap)>tol){
          if(c.autoTransition&&(c.transition!=='cut'||c.transitionDuration!=null)){c.transition='cut';delete c.transitionDuration;changed++;cleared++}
          skipped++;continue
        }
        if(c.transition&&!c.autoTransition&&!force){preserved++;continue}
        const type=this.preferred(c,i),duration=this.durationFor(project,c),existingDuration=finiteNumber(c.transitionDuration),same=c.transition===type&&existingDuration!=null&&Math.abs(existingDuration-duration)<1e-6&&c.autoTransition===true;
        c.transition=type;c.transitionDuration=duration;c.autoTransition=true;if(!same)changed++;
      }
      return {changed,preserved,skipped,cleared,locked,invalidGeometry,generated:clips.length};
    }
  }
  return {ProfitMenteAutoTransitionEngine};
});