(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteMultiSelectEngine||window.ProfitMenteMultiSelect)return;
  const engine=new ProfitMenteMultiSelectEngine(),$=s=>document.querySelector(s);
  function clips(){try{return engine.selected(project)}catch{return []}}
  function refresh(){
    const active=new Set(clips().map(c=>engine.key(c.id)));
    document.querySelectorAll('.clip[data-id]').forEach(el=>el.classList.toggle('multi-selected',active.has(engine.key(el.dataset.id))));
    const label=$('#multiSelectCount');if(label)label.textContent=`${active.size} seleccionado${active.size===1?'':'s'}`;
  }
  function clear(){engine.clear();refresh();return []}
  function selectRange(){
    const range=window.ProfitMenteRenderRange?.currentRange?.();if(!range){setStatus?.('Define IN/OUT para seleccionar un rango');return []}
    try{const result=engine.selectRange(project,range.start,range.end);refresh();setStatus?.(`${result.length} clip(s) seleccionados en IN/OUT`);return result}catch(error){setStatus?.(error.message);return []}
  }
  function mount(){
    if($('#multiSelectControls'))return;const head=document.querySelector('.timelineHead');if(!head)return;
    const box=document.createElement('span');box.id='multiSelectControls';box.className='multiSelectControls';box.innerHTML='<button id="selectRangeClipsBtn">▣ IN/OUT</button><button id="clearMultiSelectBtn">✕ Selección</button><small id="multiSelectCount">0 seleccionados</small>';
    head.appendChild(box);$('#selectRangeClipsBtn').onclick=selectRange;$('#clearMultiSelectBtn').onclick=clear;
    const style=document.createElement('style');style.id='profitmenteMultiSelectStyle';style.textContent='.multiSelectControls{display:inline-flex;align-items:center;gap:4px;margin-left:8px}.multiSelectControls button{font-size:10px;padding:4px 7px}.multiSelectControls small{font-size:10px;color:#8f9aae}.clip.multi-selected{outline:2px solid #7dd3fc;outline-offset:-2px}';document.head.appendChild(style);refresh();
  }
  document.addEventListener('click',event=>{const el=event.target?.closest?.('.clip[data-id]');if(!el||!(event.ctrlKey||event.metaKey||event.shiftKey))return;event.preventDefault();event.stopPropagation();try{engine.toggle(project,el.dataset.id,{expandGroups:event.shiftKey});refresh();setStatus?.(`${clips().length} clip(s) seleccionados`)}catch(error){setStatus?.(error.message)}},true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&clips().length){event.preventDefault();clear();setStatus?.('Selección múltiple limpiada')}},true);
  window.addEventListener('load',mount,{once:true});if(document.readyState==='complete'||document.readyState==='interactive')requestAnimationFrame(mount);
  window.addEventListener('profitmente:project-restored',()=>requestAnimationFrame(refresh));
  window.ProfitMenteMultiSelect={engine,refresh,clear,selected:clips,selectRange,mount};
})();
