(()=>{
  const root=typeof window!=='undefined'?window:globalThis,Engine=root.ProfitMenteClipClipboardEngine;
  if(!Engine||typeof document==='undefined'||root.ProfitMenteClipClipboard)return;
  const engine=new Engine(),$=s=>document.querySelector(s);
  const selectedId=()=>root.ProfitMenteEditTools?.selectedId??null;
  const selectedClip=()=>{const id=selectedId();if(id===null||id===undefined)return null;return project?.clips?.find?.(c=>String(c?.id)===String(id))||root.ProfitMenteClipIdentity?.find?.(id)||null};
  const playhead=()=>{const n=Number($('#playhead')?.value);return Number.isFinite(n)&&n>=0?n:0};
  const typing=()=>['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||!!document.activeElement?.isContentEditable;
  function refresh(){
    const copy=$('#clipClipboardCopyBtn'),paste=$('#clipClipboardPasteBtn'),info=$('#clipClipboardInfo');
    if(copy)copy.disabled=!selectedClip();
    if(paste)paste.disabled=!engine.hasData();
    if(info)info.textContent=engine.hasData()?'Clip(s) copiados · pega en el playhead':'Selecciona un clip o grupo';
  }
  function copy(){
    const id=selectedId();if(id===null||id===undefined){setStatus?.('Selecciona un clip para copiar');refresh();return {ok:false,reason:'selection'}}
    const result=engine.collect(project,id);
    if(result.ok)setStatus?.(`Portapapeles: ${result.count} clip(s) copiado(s)`);
    else setStatus?.('No se pudo copiar: selección o clip inválido');
    refresh();return result;
  }
  function paste(){
    const anchor=selectedClip(),targetTrack=anchor?.track;
    const beforeDuration=project?.duration,beforeCount=project?.clips?.length;
    const result=engine.paste(project,playhead(),{targetTrack});
    if(!result.ok){
      const text=result.reason==='locked'?'La pista destino está bloqueada':result.reason==='empty'?'Copia un clip primero':result.reason==='track'?'La selección desplazaría clips fuera de las pistas':'No se pudo pegar el clip';
      setStatus?.(text);refresh();return result;
    }
    try{persist?.();drawTimeline?.();renderAt?.(playhead());syncForm?.()}
    catch(error){
      project.clips.splice(beforeCount);project.duration=beforeDuration;
      try{persist?.();drawTimeline?.();renderAt?.(playhead());syncForm?.()}catch{}
      setStatus?.('Pegado cancelado: se restauró la timeline');
      refresh();return {ok:false,reason:'commit',error};
    }
    const extended=result.duration>beforeDuration?` · duración ${Number(result.duration).toFixed(2)}s`:'';
    setStatus?.(`Pegado: ${result.count} clip(s) en ${playhead().toFixed(2)}s${extended}`);refresh();return result;
  }
  function mount(){
    if($('#clipClipboardControls'))return;
    const head=document.querySelector('.timelineHead');if(!head)return;
    const box=document.createElement('span');box.id='clipClipboardControls';box.className='clipClipboardControls';
    box.innerHTML='<button id="clipClipboardCopyBtn" title="Copiar clip o grupo (Ctrl/Cmd+C)">⧉ Copiar</button><button id="clipClipboardPasteBtn" title="Pegar en playhead (Ctrl/Cmd+V)">📋 Pegar</button><small id="clipClipboardInfo"></small>';
    head.appendChild(box);
    $('#clipClipboardCopyBtn').onclick=copy;$('#clipClipboardPasteBtn').onclick=paste;
    if(!$('#profitmenteClipClipboardStyle')){const style=document.createElement('style');style.id='profitmenteClipClipboardStyle';style.textContent='.clipClipboardControls{display:inline-flex;align-items:center;gap:4px;margin-left:8px}.clipClipboardControls button{font-size:10px;padding:4px 7px}.clipClipboardControls small{font-size:9px;opacity:.7;max-width:170px}';document.head.appendChild(style)}
    refresh();
  }
  document.addEventListener('keydown',event=>{
    if(typing()||event.altKey||event.shiftKey||!(event.ctrlKey||event.metaKey))return;
    const key=String(event.key||'').toLowerCase();
    if(key==='c'&&selectedClip()){event.preventDefault();event.stopImmediatePropagation();copy()}
    else if(key==='v'&&engine.hasData()){event.preventDefault();event.stopImmediatePropagation();paste()}
  },true);
  document.addEventListener('click',event=>{if(event.target.closest?.('.clip'))requestAnimationFrame(refresh)},true);
  root.addEventListener?.('profitmente:project-loaded',refresh);root.addEventListener?.('profitmente:project-reset',()=>{engine.clear();refresh()});
  root.addEventListener?.('load',mount,{once:true});if(document.readyState==='complete')mount();
  const timer=setInterval(refresh,800);
  root.ProfitMenteClipClipboard={engine,copy,paste,refresh,destroy(){clearInterval(timer);$('#clipClipboardControls')?.remove();delete root.ProfitMenteClipClipboard}};
})();
