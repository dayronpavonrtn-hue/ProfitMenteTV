(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteTimelineFocusEngine)return;
  const E=window.ProfitMenteTimelineFocusEngine,$=s=>document.querySelector(s);
  function selectedIds(){
    const multi=window.ProfitMenteMultiSelect?.engine?.values?.()||[];
    if(multi.length)return multi;
    return [...document.querySelectorAll('.clip.selected,.clip.multi-selected')].map(el=>el.dataset.id).filter(id=>E.idKey(id)!==null);
  }
  function timeline(){return document.querySelector('.timeline')}
  function fitAll(){
    window.ProfitMenteTransport?.setZoom?.(1);
    requestAnimationFrame(()=>{const host=timeline();if(host)host.scrollLeft=0});
    setStatus?.('Timeline ajustada al proyecto completo');
  }
  function scrollToBounds(bounds){
    const host=timeline(),lane=document.querySelector('.lane');if(!host||!lane||!bounds)return;
    const duration=E.duration(project),center=Math.max(0,Math.min(duration,E.finite(bounds.center)??0));
    const laneRect=lane.getBoundingClientRect(),hostRect=host.getBoundingClientRect();
    const labelOffset=Math.max(0,laneRect.left-hostRect.left+host.scrollLeft);
    const target=labelOffset+(center/duration)*lane.scrollWidth-host.clientWidth/2;
    const max=Math.max(0,host.scrollWidth-host.clientWidth);host.scrollLeft=Math.max(0,Math.min(max,target));
  }
  function applyFocus(result,label){
    if(!result?.ok)return result;
    window.ProfitMenteTransport?.setZoom?.(result.zoom);
    requestAnimationFrame(()=>requestAnimationFrame(()=>scrollToBounds(result.bounds)));
    setStatus?.(`${label} · ${result.bounds.duration.toFixed(2)}s · ${result.zoom.toFixed(1)}×`);
    return result;
  }
  function fitSelection(){
    const ids=selectedIds(),result=E.focus(project,ids);
    if(!result.ok){setStatus?.('Selecciona uno o más clips para enfocar la timeline');return result}
    return applyFocus(result,`Timeline enfocada · ${result.bounds.count} clip${result.bounds.count===1?'':'s'}`);
  }
  function workRange(){
    const api=window.ProfitMenteRenderRange;
    if(api?.currentRange)return api.currentRange();
    const r=project?.workRange||{},duration=E.duration(project),start=E.finite(r.start)??0,end=E.finite(r.end)??duration;
    return {start,end};
  }
  function fitRange(){
    const r=workRange(),result=E.focusRange(project,r?.start,r?.end);
    if(!result.ok){setStatus?.('Define primero un rango de trabajo válido');return result}
    return applyFocus(result,'Timeline enfocada al rango de trabajo');
  }
  function mount(){
    const controls=document.querySelector('.transportControls');if(!controls||$('#fitTimelineBtn'))return false;
    const fit=document.createElement('button');fit.id='fitTimelineBtn';fit.type='button';fit.title='Ajustar todo el proyecto a la timeline';fit.textContent='⊟ Todo';
    const sel=document.createElement('button');sel.id='fitSelectionBtn';sel.type='button';sel.title='Enfocar clips seleccionados (F)';sel.textContent='⊙ Selección';
    const range=document.createElement('button');range.id='fitRangeBtn';range.type='button';range.title='Enfocar rango de trabajo (Shift+F)';range.textContent='↔ Rango';
    controls.append(fit,sel,range);fit.onclick=fitAll;sel.onclick=fitSelection;range.onclick=fitRange;return true;
  }
  document.addEventListener('keydown',e=>{
    const active=document.activeElement;if(active&&(['INPUT','TEXTAREA','SELECT'].includes(active.tagName)||active.isContentEditable))return;
    if(e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.key.toLowerCase()==='f'){e.preventDefault();e.shiftKey?fitRange():fitSelection()}
  });
  if(!mount())window.addEventListener('load',mount,{once:true});
  window.addEventListener('profitmente:features-ready',mount);
  window.ProfitMenteTimelineFocus={fitAll,fitSelection,fitRange,selectedIds,scrollToBounds};
})();
