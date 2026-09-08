(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteClipClipboardEngine)return;
  const E=new window.ProfitMenteClipClipboardEngine(),$=s=>document.querySelector(s);
  const status=text=>typeof setStatus==='function'&&setStatus(text);
  function typing(){const el=document.activeElement;return ['INPUT','TEXTAREA','SELECT'].includes(el?.tagName)||el?.isContentEditable}
  function selectedId(){return window.ProfitMenteEditTools?.selectedId??null}
  function playhead(){const el=$('#playhead'),raw=el?.value;if(typeof raw!=='string'&&typeof raw!=='number')return 0;const n=Number(raw);return Number.isFinite(n)&&n>=0?n:0}
  function refresh(at){
    if(typeof persist==='function')persist();
    if(typeof drawTimeline==='function')drawTimeline();
    if(typeof syncForm==='function')syncForm();
    if(typeof renderAt==='function')renderAt(at);
  }
  function copy(){
    const id=selectedId();if(id===null){status('Selecciona un clip para copiar');return {ok:false,reason:'selection'}}
    const result=E.collect(project,id);
    if(!result.ok){status(result.reason==='ambiguous'?'La selección tiene una identidad ambigua; no se copió nada':'No se pudo copiar el clip seleccionado');return result}
    status(`${result.count} clip${result.count===1?'':'s'} copiado${result.count===1?'':'s'} al portapapeles de Studio`);
    return result;
  }
  function paste(){
    const at=playhead(),result=E.paste(project,at,{extendDuration:true});
    if(!result.ok){
      const msg=result.reason==='empty'?'No hay clips copiados':result.reason==='locked'?'La pista de destino está bloqueada':result.reason==='ambiguous'?'El proyecto contiene IDs ambiguos; pegado cancelado':result.reason==='boundary'?'Los clips no caben en la duración actual':'No se pudo pegar el clip';
      status(msg);return result;
    }
    refresh(at);
    const first=result.clips?.[0];if(first)window.ProfitMenteEditTools?.select?.(first.id);
    status(`${result.count} clip${result.count===1?'':'s'} pegado${result.count===1?'':'s'} en ${at.toFixed(2)} s`);
    return result;
  }
  document.addEventListener('keydown',e=>{
    if(typing()||e.altKey||e.shiftKey||!(e.ctrlKey||e.metaKey))return;
    const key=String(e.key||'').toLowerCase();
    if(key==='c'&&selectedId()!==null){e.preventDefault();copy()}
    else if(key==='v'&&E.hasData()){e.preventDefault();paste()}
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
