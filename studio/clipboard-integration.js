(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteClipboardEngine)return;
  const engine=new ProfitMenteClipboardEngine(),$=s=>document.querySelector(s);
  function status(t){if(typeof setStatus==='function')setStatus(t)}
  function ensureSelectionApi(){
    const multi=window.ProfitMenteMultiSelect;if(!multi?.engine)return multi;
    if(typeof multi.clear!=='function')multi.clear=()=>{const result=multi.engine.clear();multi.refresh?.();return result};
    if(typeof multi.selected!=='function')multi.selected=()=>multi.engine.clips?.(project)||[];
    if(typeof multi.set!=='function')multi.set=ids=>{const result=multi.engine.set(ids);multi.refresh?.();return result};
    return multi
  }
  function selectedClips(){
    const multi=ensureSelectionApi()?.engine?.clips?.(project)||[];
    if(multi.length)return multi;
    const id=window.ProfitMenteEditTools?.selectedId;return id?(project.clips||[]).filter(c=>String(c.id)===String(id)):[];
  }
  function commit(message,copies=[]){
    const multi=ensureSelectionApi();if(copies.length&&multi?.engine){multi.engine.set(copies.map(c=>c.id));multi.refresh?.()}
    if(copies[0])window.ProfitMenteEditTools?.select(copies[0].id);
    persist?.();drawTimeline?.();renderAt?.(+$('#playhead')?.value||0);status(message)
  }
  function copy(){const clips=selectedClips();const r=engine.copy(clips);if(!r.copied){status('Selecciona uno o varios clips para copiar');return}status(`${r.copied} clip${r.copied===1?'':'s'} copiado${r.copied===1?'':'s'} · separación preservada`)}
  function paste(){
    const t=+$('#playhead')?.value||0,r=engine.paste(project,t);
    if(!r.ok){if(r.reason==='empty')status('No hay clips copiados');else if(r.reason==='locked-tracks')status(`Pegado bloqueado: pista${r.locked.length===1?'':'s'} ${r.locked.join(', ')} bloqueada${r.locked.length===1?'':'s'}`);else if(r.reason==='too-long')status('Pegado bloqueado: el grupo copiado es más largo que el proyecto');return}
    commit(`${r.clips.length} clip${r.clips.length===1?'':'s'} pegado${r.clips.length===1?'':'s'} en ${r.base.toFixed(2)}s${r.clamped?' · ajustado al final del proyecto':''}${r.remappedGroups?' · grupo independiente':''}`,r.clips)
  }
  function duplicate(){
    const clips=selectedClips(),r=engine.duplicate(project,clips);
    if(!r.ok){if(r.reason==='empty-selection')status('Selecciona uno o varios clips para duplicar');else if(r.reason==='locked-tracks')status(`Duplicado bloqueado: pista${r.locked.length===1?'':'s'} ${r.locked.join(', ')} bloqueada${r.locked.length===1?'':'s'}`);else if(r.reason==='too-long')status('Duplicado bloqueado: la selección es más larga que el proyecto');else if(r.reason==='no-space')status('Duplicado bloqueado: no hay espacio después de la selección');return}
    commit(`${r.clips.length} clip${r.clips.length===1?'':'s'} duplicado${r.clips.length===1?'':'s'} · separación preservada${r.remappedGroups?' · grupo independiente':''}`,r.clips)
  }
  document.addEventListener('keydown',e=>{
    if(!(e.ctrlKey||e.metaKey)||e.altKey)return;
    const el=document.activeElement,tag=el?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag)||el?.isContentEditable)return;
    if(e.key.toLowerCase()==='c'){if(selectedClips().length){e.preventDefault();copy()}}
    else if(e.key.toLowerCase()==='v'){if(engine.count){e.preventDefault();paste()}}
    else if(e.key.toLowerCase()==='d'){if(selectedClips().length){e.preventDefault();duplicate()}}
  });
  ensureSelectionApi();window.ProfitMenteClipboard={engine,copy,paste,duplicate};
})();