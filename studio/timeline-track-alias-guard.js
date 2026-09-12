(()=>{
  const root=typeof window!=='undefined'?window:globalThis;
  const Ops=root.ProfitMenteTimelineOperations;
  if(!Ops||Ops.prototype.__profitMenteTrackAliasGuard)return;
  const proto=Ops.prototype;
  const canonicalTrack=value=>{
    if(typeof value!=='string'&&typeof value!=='number')return null;
    const text=String(value).trim();
    if(!text)return null;
    const n=Number(text);
    if(!Number.isFinite(n)||!Number.isInteger(n)||n<0||n>6)return null;
    return Object.is(n,-0)?0:n;
  };
  const normalizeStateMap=states=>{
    if(!states||typeof states!=='object'||Array.isArray(states))return states;
    const normalized={};
    for(const [key,state] of Object.entries(states)){
      const track=canonicalTrack(key);
      if(track===null){normalized[key]=state;continue}
      const canonicalKey=String(track),previous=normalized[canonicalKey];
      if(previous&&typeof previous==='object'&&state&&typeof state==='object'){
        normalized[canonicalKey]={...previous,...state,locked:previous.locked===true||state.locked===true};
      }else normalized[canonicalKey]=state;
    }
    for(const key of Object.keys(states))delete states[key];
    Object.assign(states,normalized);
    return states;
  };
  const normalizeProjectTracks=project=>{
    if(!project||!Array.isArray(project.clips))return project;
    for(const clip of project.clips){
      if(!clip||typeof clip!=='object')continue;
      const track=canonicalTrack(clip.track);
      if(track!==null)clip.track=track;
    }
    normalizeStateMap(project.trackState);
    normalizeStateMap(project.trackStates);
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
  root.ProfitMenteTimelineTrackAliasGuard={canonicalTrack,normalizeStateMap,normalizeProjectTracks,stateLocked};
  if(typeof module!=='undefined'&&module.exports)module.exports={canonicalTrack,normalizeStateMap,normalizeProjectTracks,stateLocked};
})();

// app.js predates the import hardening layers and originally interpolated clip
// names into innerHTML. Imported JSON/bundles therefore need a later safe
// renderer that preserves the same drag/trim/edit behavior while treating every
// project-supplied label as inert text.
(()=>{
  if(typeof document==='undefined'||typeof window==='undefined')return;
  function finiteScalar(value){
    if(typeof value==='number')return Number.isFinite(value)?value:null;
    if(typeof value!=='string')return null;
    const text=value.trim();
    if(!text||!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(text))return null;
    const number=Number(text);
    return Number.isFinite(number)?number:null;
  }
  function canonicalTrack(value,count){
    const number=finiteScalar(value);
    if(number===null||!Number.isInteger(number)||number<0||number>=count)return null;
    return Object.is(number,-0)?0:number;
  }
  function clipGeometry(clip,duration){
    const rawStart=finiteScalar(clip?.start),rawDuration=finiteScalar(clip?.duration);
    const maxStart=Math.max(0,duration-.25);
    const start=Math.max(0,Math.min(maxStart,rawStart===null?0:rawStart));
    const available=Math.max(.25,duration-start);
    const clipDuration=Math.max(.25,Math.min(available,rawDuration===null?.25:rawDuration));
    return {start,duration:clipDuration};
  }
  function renderSafe(){
    if(typeof tracks==='undefined'||typeof names==='undefined'||typeof project==='undefined')return false;
    window.ProfitMenteTimelineTrackAliasGuard?.normalizeProjectTracks?.(project);
    const rawProjectDuration=finiteScalar(project.duration),duration=rawProjectDuration!==null&&rawProjectDuration>0?rawProjectDuration:1;
    const clips=Array.isArray(project.clips)?project.clips:[];
    tracks.replaceChildren();
    names.forEach((name,index)=>{
      const row=document.createElement('div');row.className='track';
      const label=document.createElement('span');label.textContent=String(name);row.appendChild(label);
      const lane=document.createElement('div');lane.className='lane';lane.dataset.track=String(index);
      lane.ondblclick=event=>{
        if(event.target!==lane)return;
        const width=Math.max(1,finiteScalar(lane.clientWidth)??1);
        const offset=finiteScalar(event.offsetX)??0;
        const start=Math.max(0,Math.min(Math.max(0,duration-1),offset/width*duration));
        addClip(index,'Nuevo clip',null,start,5);
      };
      for(const clip of clips){
        if(canonicalTrack(clip?.track,names.length)!==index)continue;
        const el=document.createElement('div');el.className='clip';el.dataset.id=String(clip?.id??'');
        const geometry=clipGeometry(clip,duration);
        el.style.left=`${geometry.start/duration*100}%`;el.style.width=`${Math.max(2,geometry.duration/duration*100)}%`;
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
  window.ProfitMenteSafeTimelineRender={finiteScalar,canonicalTrack,clipGeometry,renderSafe};
})();