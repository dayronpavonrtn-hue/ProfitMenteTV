(()=>{
  const SNAP_SECONDS=.15;
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
  function boundaries(ignoreId){
    const out=[0,+project.duration||0];
    for(const c of project.clips||[]){if(c.id===ignoreId)continue;out.push(+c.start||0,(+c.start||0)+(+c.duration||0))}
    return [...new Set(out)].sort((a,b)=>a-b);
  }
  function snapStart(raw,clip){
    const max=Math.max(0,project.duration-clip.duration),clamped=Math.max(0,Math.min(max,raw));
    let best=Math.round(clamped*10)/10,bestDist=Math.abs(best-clamped),kind='grid';
    for(const b of boundaries(clip.id)){
      const d1=Math.abs(b-clamped);if(d1<bestDist&&d1<=SNAP_SECONDS){best=b;bestDist=d1;kind='start'}
      const endCandidate=b-clip.duration,d2=Math.abs(endCandidate-clamped);if(d2<bestDist&&d2<=SNAP_SECONDS){best=endCandidate;bestDist=d2;kind='end'}
    }
    return {start:Math.max(0,Math.min(max,best)),snapped:bestDist<=SNAP_SECONDS,kind};
  }
  function laneAt(x,y){const el=document.elementFromPoint(x,y);return el?.closest?.('.lane')||null}
  function clearTargets(){document.querySelectorAll('.lane.dropTarget').forEach(x=>x.classList.remove('dropTarget'))}
  function begin(e,el){
    if(e.button!==0)return;
    const er=el.getBoundingClientRect();
    if(e.clientX>er.right-10)return; // keep native right-edge trim from app.js
    const clip=(project.clips||[]).find(c=>c.id===el.dataset.id);if(!clip)return;
    const lane=el.closest('.lane'),rect=lane.getBoundingClientRect();
    active={el,clip,startX:e.clientX,originalStart:+clip.start||0,originalTrack:clip.track,rect};
    e.preventDefault();e.stopImmediatePropagation();el.classList.add('dragging');el.setPointerCapture?.(e.pointerId);
    el.addEventListener('pointermove',move);el.addEventListener('pointerup',end,{once:true});el.addEventListener('pointercancel',end,{once:true});
  }
  function move(e){
    if(!active)return;
    const seconds=(e.clientX-active.startX)/active.rect.width*project.duration;
    const snapped=snapStart(active.originalStart+seconds,active.clip);active.clip.start=snapped.start;
    active.el.style.left=`${active.clip.start/project.duration*100}%`;
    clearTargets();const lane=laneAt(e.clientX,e.clientY);
    if(lane){const track=+lane.dataset.track;if(compatible(active.clip,track)){lane.classList.add('dropTarget');active.clip.track=track}}
    if(typeof setStatus==='function')setStatus(`${snapped.snapped?'🧲 ':''}${active.clip.name||'Clip'} · ${active.clip.start.toFixed(2)}s · ${names[active.clip.track]||'Pista '+active.clip.track}`);
  }
  function end(e){
    if(!active)return;const {el,clip,originalStart,originalTrack}=active;
    el.removeEventListener('pointermove',move);el.classList.remove('dragging');clearTargets();active=null;
    const changed=Math.abs(clip.start-originalStart)>.001||clip.track!==originalTrack;
    if(changed){if(typeof persist==='function')persist();if(typeof drawTimeline==='function')drawTimeline();if(typeof renderAt==='function')renderAt(+$('#playhead').value||0);if(typeof setStatus==='function')setStatus(`Clip movido · ${clip.start.toFixed(2)}s · ${names[clip.track]}`)}
  }
  document.addEventListener('pointerdown',e=>{const el=e.target.closest?.('.clip');if(el)begin(e,el)},true);
  window.ProfitMenteTimelineMagnet={snapStart,compatible,boundaries};
})();