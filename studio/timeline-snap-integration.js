(()=>{
  if(typeof document==='undefined'||typeof project==='undefined'||!window.ProfitMenteTimelineSnapEngine||window.ProfitMenteTimelineSnap)return;
  const engine=window.ProfitMenteTimelineSnapEngine,sessions=new Map();
  function tolerance(lane){const w=Math.max(1,lane?.clientWidth||1),seconds=(Math.max(1,Number(project.duration)||1)/w)*10;return Math.max(.035,Math.min(.35,seconds))}
  function playhead(){const v=Number(document.querySelector('#playhead')?.value);return Number.isFinite(v)?v:null}
  function clipFor(el){return project.clips?.find(c=>String(c.id)===String(el?.dataset?.id))||null}
  function pointerDown(e){
    const el=e.target?.closest?.('.clip');if(!el)return;const c=clipFor(el);if(!c)return;
    const r=el.getBoundingClientRect();sessions.set(e.pointerId,{id:c.id,trim:e.clientX>r.right-10,lane:el.parentElement});
  }
  function pointerMove(e){
    const s=sessions.get(e.pointerId);if(!s||e.altKey)return;const el=document.querySelector(`.clip[data-id="${CSS.escape(String(s.id))}"]`),c=clipFor(el);if(!el||!c)return;
    const opts={playhead:playhead(),tolerance:tolerance(s.lane)};
    if(s.trim){const result=engine.trim(project,c,c.duration,opts);if(result.snapped){c.duration=result.value;el.style.width=`${Math.max(2,c.duration/project.duration*100)}%`;el.dataset.snapTarget=String(result.target)}}
    else{const result=engine.move(project,c,c.start,opts);if(result.snapped){c.start=result.value;el.style.left=`${c.start/project.duration*100}%`;el.dataset.snapTarget=String(result.target)}}
    if(!el.dataset.snapTarget)return;
    el.classList.add('snapped');
  }
  function pointerEnd(e){const s=sessions.get(e.pointerId);if(!s)return;sessions.delete(e.pointerId);const el=document.querySelector(`.clip[data-id="${CSS.escape(String(s.id))}"]`);if(el){delete el.dataset.snapTarget;el.classList.remove('snapped')}}
  document.addEventListener('pointerdown',pointerDown,true);document.addEventListener('pointermove',pointerMove,false);document.addEventListener('pointerup',pointerEnd,true);document.addEventListener('pointercancel',pointerEnd,true);
  window.ProfitMenteTimelineSnap={engine,tolerance};
})();
