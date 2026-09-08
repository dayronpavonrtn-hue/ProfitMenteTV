(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteClipClipboardEngine)return;
  const E=new window.ProfitMenteClipClipboardEngine(),$=s=>document.querySelector(s);
  function typing(){return ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)}
  function selectedId(){return window.ProfitMenteEditTools?.selectedId||null}
  function playhead(){const el=$('#playhead');const n=Number(el?.value);return Number.isFinite(n)&&n>=0?n:0}
  function refresh(){persist?.();drawTimeline?.();syncForm?.();renderAt?.(playhead())}
  function copy(){
    const id=selectedId();if(id===null||id===undefined){setStatus?.('Selecciona un clip para copiar');return {ok:false,reason:'selection'}}
    const result=E.collect(project,id);
    if(!result.ok){setStatus?.('No se pudo copiar el clip seleccionado');return result}
    setStatus?.(`${result.count} clip${result.count===1?'':'s'} copiado${result.count===1?'':'s'} al portapapeles de Studio`);
    return result;
  }
  function paste(){
    const result=E.paste(project,playhead(),{extendDuration:true});
    if(!result.ok){
      const msg=result.reason==='empty'?'No hay clips copiados':result.reason==='locked'?'La pista de destino está bloqueada':result.reason==='boundary'?'Los clips no caben en la duración actual':'No se pudo pegar el clip';
      setStatus?.(msg);return result;
    }
    refresh();
    const first=result.clips?.[0];if(first&&window.ProfitMenteEditTools)window.ProfitMenteEditTools.selectedId=first.id;
    setStatus?.(`${result.count} clip${result.count===1?'':'s'} pegado${result.count===1?'':'s'} en ${playhead().toFixed(2)} s`);
    return result;
  }
  document.addEventListener('keydown',e=>{
    if(typing()||e.altKey||e.shiftKey||!(e.ctrlKey||e.metaKey))return;
    const key=String(e.key||'').toLowerCase();
    if(key==='c'){if(selectedId()!==null){e.preventDefault();copy()}}
    else if(key==='v'){if(E.hasData()){e.preventDefault();paste()}}
  });
  const head=document.querySelector('.timelineHead');
  if(head&&!$('#clipClipboardControls')){
    const wrap=document.createElement('span');wrap.id='clipClipboardControls';wrap.className='clipClipboardControls';
    const c=document.createElement('button');c.type='button';c.textContent='⧉ Copiar';c.title='Copiar clip o grupo seleccionado (Ctrl/Cmd+C)';c.onclick=copy;
    const v=document.createElement('button');v.type='button';v.textContent='📋 Pegar';v.title='Pegar en el playhead (Ctrl/Cmd+V)';v.onclick=paste;
    wrap.append(c,v);head.appendChild(wrap);
  }
  window.ProfitMenteClipClipboard={engine:E,copy,paste,clear:()=>E.clear()};
})();
