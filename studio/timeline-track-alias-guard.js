(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  const Ops=root.ProfitMenteTimelineOperations;
  if(!Ops||Ops.prototype.__profitMenteTrackAliasGuard)return;
  const proto=Ops.prototype;
  const canonicalTrack=value=>{
    if(value===undefined||value===null||String(value).trim()==='')return null;
    const n=Number(value);
    return Number.isFinite(n)&&Number.isInteger(n)&&n>=0&&n<=6?n:null;
  };
  const normalizeProjectTracks=project=>{
    if(!project||!Array.isArray(project.clips))return project;
    for(const clip of project.clips){
      if(!clip||typeof clip!=='object')continue;
      const track=canonicalTrack(clip.track);
      if(track!==null)clip.track=track;
    }
    return project;
  };
  const stateLocked=(states,track)=>{
    if(!states||typeof states!=='object')return false;
    const target=canonicalTrack(track);
    if(target===null)return false;
    return Object.entries(states).some(([key,state])=>canonicalTrack(key)===target&&state&&typeof state==='object'&&state.locked===true);
  };
  proto.trackLocked=function(project,track){
    return stateLocked(project?.trackState,track)||stateLocked(project?.trackStates,track);
  };
  const wrapNormalize=name=>{
    const original=proto[name];
    if(typeof original!=='function')return;
    proto[name]=function(project,...args){
      normalizeProjectTracks(project);
      const result=original.call(this,project,...args);
      normalizeProjectTracks(project);
      return result;
    };
  };
  ['paste','trimLeft','trimRight','split','rippleDelete','closeGaps','insertGap','insertTime'].forEach(wrapNormalize);
  proto.__profitMenteTrackAliasGuard=true;
  root.ProfitMenteTimelineTrackAliasGuard={canonicalTrack,normalizeProjectTracks,stateLocked};
  if(typeof module!=='undefined'&&module.exports)module.exports={canonicalTrack,normalizeProjectTracks,stateLocked};
})();

// app.js predates the import hardening layers and originally interpolated clip
// names into innerHTML. Imported JSON/bundles therefore need a later safe
// renderer that preserves the same drag/trim/edit behavior while treating every
// project-supplied label as inert text.
(()=>{
  if(typeof document==='undefined'||typeof window==='undefined')return;
  function canonicalTrack(value,count){
    if(value===null||value===undefined||typeof value==='boolean')return null;
    const text=String(value).trim();
    if(!text)return null;
    const number=Number(text);
    return Number.isInteger(number)&&number>=0&&number<count?number:null;
  }
  function renderSafe(){
    if(typeof tracks==='undefined'||typeof names==='undefined'||typeof project==='undefined')return false;
    const duration=Math.max(.001,Number(project.duration)||1);
    const clips=Array.isArray(project.clips)?project.clips:[];
    tracks.replaceChildren();
    names.forEach((name,index)=>{
      const row=document.createElement('div');row.className='track';
      const label=document.createElement('span');label.textContent=String(name);row.appendChild(label);
      const lane=document.createElement('div');lane.className='lane';lane.dataset.track=String(index);
      lane.ondblclick=event=>{
        if(event.target!==lane)return;
        const width=Math.max(1,Number(lane.clientWidth)||1);
        const offset=Number.isFinite(Number(event.offsetX))?Number(event.offsetX):0;
        const start=Math.max(0,Math.min(Math.max(0,duration-1),offset/width*duration));
        addClip(index,'Nuevo clip',null,start,5);
      };
      for(const clip of clips){
        if(canonicalTrack(clip?.track,names.length)!==index)continue;
        const el=document.createElement('div');el.className='clip';el.dataset.id=String(clip?.id??'');
        const start=Number.isFinite(Number(clip?.start))?Number(clip.start):0;
        const clipDuration=Number.isFinite(Number(clip?.duration))?Number(clip.duration):.25;
        el.style.left=`${start/duration*100}%`;el.style.width=`${Math.max(2,clipDuration/duration*100)}%`;
        el.textContent=String(clip?.name??'');
        el.onpointerdown=event=>startDrag(event,el);
        el.ondblclick=event=>{event.stopPropagation?.();editClip(el.dataset.id)};
        lane.appendChild(el);
      }
      row.appendChild(lane);tracks.appendChild(row);
    });
    return true;
  }
  drawTimeline=renderSafe;
  window.ProfitMenteSafeTimelineRender={canonicalTrack,renderSafe};
})();
