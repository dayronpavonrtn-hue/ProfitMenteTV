(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteClipboardEngine)return;
  const engine=new ProfitMenteClipboardEngine(),$=s=>document.querySelector(s);
  function status(t){if(typeof setStatus==='function')setStatus(t)}
  function selectedClips(){
    const multi=window.ProfitMenteMultiSelect?.engine?.clips?.(project)||[];
    if(multi.length)return multi;
    const id=window.ProfitMenteEditTools?.selectedId;return id?(project.clips||[]).filter(c=>String(c.id)===String(id)):[];
  }
  function commit(message,copies=[]){
    if(copies.length&&window.ProfitMenteMultiSelect?.engine){window.ProfitMenteMultiSelect.engine.set(copies.map(c=>c.id));window.ProfitMenteMultiSelect.refresh?.()}
    if(copies[0])window.ProfitMenteEditTools?.select(copies[0].id);
    persist?.();drawTimeline?.();renderAt?.(+$('#playhead')?.value||0);status(message)
  }
  function copy(){const clips=selectedClips();const r=engine.copy(clips);if(!r.copied){status('Selecciona uno o varios clips para copiar');return}status(`${r.copied} clip${r.copied===1?'':'s'} copiado${r.copied===1?'':'s'} · separación preservada`)}
  function paste(){
    const t=+$('#playhead')?.value||0,r=engine.paste(project,t);
    if(!r.ok){if(r.reason==='empty')status('No hay clips copiados');else if(r.reason==='locked-tracks')status(`Pegado bloqueado: pista${r.locked.length===1?'':'s'} ${r.locked.join(', ')} bloqueada${r.locked.length===1?'':'s'}`);else if(r.reason==='too-long')status('Pegado bloqueado: el grupo copiado es más largo que el proyecto');return}
    commit(`${r.clips.length} clip${r.clips.length===1?'':'s'} pegado${r.clips.length===1?'':'s'} en ${r.base.toFixed(2)}s${r.clamped?' · ajustado al final del proyecto':''}`,r.clips)
  }
  document.addEventListener('keydown',e=>{
    if(!(e.ctrlKey||e.metaKey)||e.altKey)return;
    const tag=document.activeElement?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;
    if(e.key.toLowerCase()==='c'){if(selectedClips().length){e.preventDefault();copy()}}
    else if(e.key.toLowerCase()==='v'){if(engine.count){e.preventDefault();paste()}}
  });
  window.ProfitMenteClipboard={engine,copy,paste};
})();