(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  const Ops=root.ProfitMenteTimelineOperations;
  if(!Ops)return;

  const proto=Ops.prototype;

  // Projects can temporarily contain both the canonical trackState map and the
  // legacy trackStates map (imports, recovery snapshots, older bundles). Treat
  // either lock as authoritative so a paste can never bypass a protected track.
  proto.trackLocked=function(project,track){
    const key=String(track);
    const modern=project?.trackState?.[track]??project?.trackState?.[key]??{};
    const legacy=project?.trackStates?.[track]??project?.trackStates?.[key]??{};
    return !!((modern&&typeof modern==='object'&&modern.locked)||(legacy&&typeof legacy==='object'&&legacy.locked));
  };

  // Professional editors keep the user's requested paste position and grow the
  // sequence when necessary. The previous implementation clamped the clip back
  // inside project.duration, which could unexpectedly overlap earlier edits.
  proto.paste=function(project,at,track=null){
    if(!this.clipboard||!project)return null;
    const targetTrack=track??this.clipboard.track;
    if(this.trackLocked(project,targetTrack))return null;

    const clip=this.cloneClip(this.clipboard);
    clip.track=targetTrack;
    clip.start=Math.max(0,Number(at)||0);
    if(!Array.isArray(project.clips))project.clips=[];
    project.clips.push(clip);

    const end=clip.start+Math.max(0,Number(clip.duration)||0);
    project.duration=Math.max(0,Number(project.duration)||0,end);
    return clip;
  };
})();
