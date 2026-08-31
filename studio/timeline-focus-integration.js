(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteTimelineFocusEngine)return;
  const E=window.ProfitMenteTimelineFocusEngine,$=s=>document.querySelector(s);
  function selectedIds(){
    const multi=window.ProfitMenteMultiSelect?.engine?.values?.()||[];
    if(multi.length)return multi;
    return [...document.querySelectorAll('.clip.selected,.clip.multi-selected')].map(el=>el.dataset.id).filter(Boolean);
  }
  function timeline(){return document.querySelector('.timeline')}
  function fitAll(){
    window.ProfitMenteTransport?.setZoom?.(1);
    requestAnimationFrame(()=>{const host=timeline();if(host)host.scrollLeft=0});
    setStatus?.('Timeline ajustada al proyecto completo');
  }
  function scrollToBounds(bounds){
    const host=timeline(),lane=document.querySelector('.lane');if(!host||!lane||!bounds)return;
    const duration=Math.max(.001,Number(project?.duration)||.001),center=Math.max(0,Math.min(duration,Number(bounds.center)||0));
    const laneRect=lane.getBoundingClientRect(),hostRect=host.getBoundingClientRect();
    const labelOffset=Math.max(0,laneRect.left-hostRect.left+host.scrollLeft);
    const target=labelOffset+(center/duration)*lane.scrollWidth-host.clientWidth/2;
    const max=Math.max(0,host.scrollWidth-host.clientWidth);host.scrollLeft=Math.max(0,Math.min(max,target));
  }
  function fitSelection(){
    const ids=selectedIds(),result=E.focus(project,ids);
    if(!result.ok){setStatus?.('Selecciona uno o más clips para enfocar la timeline');return result}
    window.ProfitMenteTransport?.setZoom?.(result.zoom);
    requestAnimationFrame(()=>requestAnimationFrame(()=>scrollToBounds(result.bounds)));
    setStatus?.(`Timeline enfocada · ${result.bounds.count} clip${result.bounds.count===1?'':'s'} · ${result.zoom.toFixed(1)}×`);
    return result;
  }
  function mount(){
    const controls=document.querySelector('.transportControls');if(!controls||$('#fitTimelineBtn'))return false;
    const fit=document.createElement('button');fit.id='fitTimelineBtn';fit.type='button';fit.title='Ajustar todo el proyecto a la timeline';fit.textContent='⊟ Todo';
    const sel=document.createElement('button');sel.id='fitSelectionBtn';sel.type='button';sel.title='Enfocar clips seleccionados (F)';sel.textContent='⊙ Selección';
    controls.append(fit,sel);fit.onclick=fitAll;sel.onclick=fitSelection;return true;
  }
  document.addEventListener('keydown',e=>{
    const active=document.activeElement;if(active&&(['INPUT','TEXTAREA','SELECT'].includes(active.tagName)||active.isContentEditable))return;
    if(e.ctrlKey||e.metaKey||e.altKey||e.shiftKey)return;
    if(e.key.toLowerCase()==='f'){e.preventDefault();fitSelection()}
  });
  if(!mount())window.addEventListener('load',mount,{once:true});
  window.addEventListener('profitmente:features-ready',mount);
  window.ProfitMenteTimelineFocus={fitAll,fitSelection,selectedIds,scrollToBounds};
})();
