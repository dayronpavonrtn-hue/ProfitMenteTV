(()=>{
  const SNAP_SECONDS=.15,EDGE_PX=10,MIN_DURATION=.25;
  let active=null;
  const $=s=>document.querySelector(s);
  const assetFor=clip=>(assets||[]).find(a=>a.id===clip.asset);
  function groupFor(clip){
    const a=assetFor(clip);
    if(a?.type==='audio'||clip.track>=4)return 'audio';
    if(clip.track===3)return 'caption';
    return 'visual';
  }
  function compatible(clip,track){
    const g=groupFor(clip);
    return g==='audio'?track>=4&&track<=6:g==='caption'?track===3:track>=0&&track<=2;
  }
  function guideTimes(){
    const out=[];
    const playhead=Number($('#playhead')?.value);
    if(Number.isFinite(playhead))out.push(Math.max(0,Math.min(+project.duration||0,playhead)));
    for(const marker of project.markers||[]){const t=Number(marker?.time);if(Number.isFinite(t))out.push(Math.max(0,Math.min(+project.duration||0,t)))}
    return out;
  }
  function boundaries(ignoreId){
    const out=[0,+project.duration||0,...guideTimes()];
    for(const c of project.clips||[]){if(c.id===ignoreId)continue;out.push(+c.start||0,(+c.start||0)+(+c.duration||0))}
    return [...new Set(out)].sort((a,b)=>a-b);
  }
  function snapTime(raw,ignoreId){
    const clamped=Math.max(0,Math.min(+project.duration||0,Number(raw)||0));let best=null,bestDist=Infinity;
    for(const b of boundaries(ignoreId)){const d=Math.abs(b-clamped);if(d<bestDist&&d<=SNAP_SECONDS){best=b;bestDist=d}}
    if(best!==null)return {time:best,snapped:true,kind:'edge'};
    return {time:Math.round(clamped*10)/10,snapped:false,kind:'grid'};
  }
  function snapStart(raw,clip){
    const max=Math.max(0,project.duration-clip.duration),clamped=Math.max(0,Math.min(max,raw));
    let best=null,bestDist=Infinity,kind='grid';
    for(const b of boundaries(clip.id)){
      const d1=Math.abs(b-clamped);if(d1<bestDist&&d1<=SNAP_SECONDS){best=b;bestDist=d1;kind='start'}
      const endCandidate=b-clip.duration,d2=Math.abs(endCandidate-clamped);if(d2<bestDist&&d2<=SNAP_SECONDS){best=endCandidate;bestDist=d2;kind='end'}
    }
    if(best!==null)return {start:Math.max(0,Math.min(max,best)),snapped:true,kind};
    return {start:Math.max(0,Math.min(max,Math.round(clamped*10)/10)),snapped:false,kind:'grid'};
  }
  function laneAt(x,y){const el=document.elementFromPoint(x,y);return el?.closest?.('.lane')||null}
  function clearTargets(){document.querySelectorAll('.lane.dropTarget').forEach(x=>x.classList.remove('dropTarget'))}
  function begin(e,el){
    if(e.button!==0)return;const clip=(project.clips||[]).find(c=>c.id===el.dataset.id);if(!clip)return;
    if(project.trackState?.[clip.track]?.locked){if(typeof setStatus==='function')setStatus('La pista está bloqueada');e.preventDefault();e.stopImmediatePropagation();return}
    const er=el.getBoundingClientRect(),leftEdge=e.clientX-er.left<=EDGE_PX,rightEdge=er.right-e.clientX<=EDGE_PX,mode=leftEdge?'trim-left':rightEdge?'trim-right':'move';
    const lane=el.closest('.lane'),rect=lane.getBoundingClientRect();
    active={el,clip,mode,startX:e.clientX,originalStart:+clip.start||0,originalDuration:+clip.duration||0,originalTrack:clip.track,rect,pendingTime:null};
    e.preventDefault();e.stopImmediatePropagation();el.classList.add('dragging');el.setPointerCapture?.(e.pointerId);
    el.addEventListener('pointermove',move);el.addEventListener('pointerup',end,{once:true});el.addEventListener('pointercancel',end,{once:true});
  }
  function move(e){
    if(!active)return;const seconds=(e.clientX-active.startX)/active.rect.width*project.duration,originalEnd=active.originalStart+active.originalDuration;
    if(active.mode==='trim-left'){
      const snap=snapTime(active.originalStart+seconds,active.clip.id),time=Math.max(active.originalStart,Math.min(originalEnd-MIN_DURATION,snap.time));active.pendingTime=time;
      active.el.style.left=`${time/project.duration*100}%`;active.el.style.width=`${Math.max(2,(originalEnd-time)/project.duration*100)}%`;
      if(typeof setStatus==='function')setStatus(`${snap.snapped?'🧲 ':''}Entrada · ${time.toFixed(2)}s · duración ${(originalEnd-time).toFixed(2)}s`);return;
    }
    if(active.mode==='trim-right'){
      const snap=snapTime(originalEnd+seconds,active.clip.id),time=Math.max(active.originalStart+MIN_DURATION,Math.min(originalEnd,snap.time));active.pendingTime=time;
      active.el.style.width=`${Math.max(2,(time-active.originalStart)/project.duration*100)}%`;
      if(typeof setStatus==='function')setStatus(`${snap.snapped?'🧲 ':''}Salida · ${time.toFixed(2)}s · duración ${(time-active.originalStart).toFixed(2)}s`);return;
    }
    const snapped=snapStart(active.originalStart+seconds,active.clip);active.clip.start=snapped.start;
    active.el.style.left=`${active.clip.start/project.duration*100}%`;
    clearTargets();const lane=laneAt(e.clientX,e.clientY);
    if(lane){const track=+lane.dataset.track;if(compatible(active.clip,track)&&!project.trackState?.[track]?.locked){lane.classList.add('dropTarget');active.clip.track=track}}
    if(typeof setStatus==='function')setStatus(`${snapped.snapped?'🧲 ':''}${active.clip.name||'Clip'} · ${active.clip.start.toFixed(2)}s · ${names[active.clip.track]||'Pista '+active.clip.track}`);
  }
  function end(){
    if(!active)return;const {el,clip,mode,originalStart,originalDuration,originalTrack,pendingTime}=active;
    el.removeEventListener('pointermove',move);el.classList.remove('dragging');clearTargets();active=null;
    let changed=false,message='';
    if(mode==='trim-left'&&pendingTime!=null){const result=window.ProfitMenteTimelineOps?.trimLeft?.(project,clip.id,pendingTime,MIN_DURATION);changed=!!result;message=result?`Entrada recortada · ${result.start.toFixed(2)}s · fuente ${(Number(result.sourceOffset)||0).toFixed(2)}s`:''}
    else if(mode==='trim-right'&&pendingTime!=null){const result=window.ProfitMenteTimelineOps?.trimRight?.(project,clip.id,pendingTime,MIN_DURATION);changed=!!result;message=result?`Salida recortada · duración ${result.duration.toFixed(2)}s`:''}
    else changed=Math.abs(clip.start-originalStart)>.001||clip.track!==originalTrack;
    if(changed){if(typeof persist==='function')persist();if(typeof drawTimeline==='function')drawTimeline();if(typeof renderAt==='function')renderAt(+$('#playhead').value||0);if(typeof setStatus==='function')setStatus(message||`Clip movido · ${clip.start.toFixed(2)}s · ${names[clip.track]}`)}
    else if(mode!=='move'&&typeof drawTimeline==='function')drawTimeline();
  }
  document.addEventListener('pointerdown',e=>{const el=e.target.closest?.('.clip');if(el)begin(e,el)},true);
  window.ProfitMenteTimelineMagnet={snapStart,snapTime,compatible,boundaries,guideTimes};
})();