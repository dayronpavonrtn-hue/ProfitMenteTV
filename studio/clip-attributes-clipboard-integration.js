(()=>{
  const root=typeof window!=='undefined'?window:globalThis,Engine=root.ProfitMenteClipAttributesClipboardEngine;
  if(!Engine||typeof document==='undefined'||root.ProfitMenteClipAttributesClipboard)return;
  const form=document.querySelector('#clipInspectorForm');if(!form)return;
  const box=document.createElement('div');box.className='ciActions clipAttributesClipboard';
  const copy=document.createElement('button'),paste=document.createElement('button');
  copy.type=paste.type='button';copy.textContent='📋 Copiar atributos';paste.textContent='📥 Pegar atributos';paste.disabled=true;
  box.append(copy,paste);form.appendChild(box);
  let clipboard=null;
  const selectedId=()=>root.ProfitMenteEditTools?.selectedId??null;
  const playhead=()=>{const n=Number(document.querySelector('#playhead')?.value);return Number.isFinite(n)?n:0};
  const selectedClip=()=>{const id=selectedId();return (project?.clips||[]).find(c=>Engine.sameId(c?.id,id))||null};
  const refresh=()=>{
    const clip=selectedClip();copy.disabled=!clip;
    paste.disabled=!clip||!clipboard||!Engine.compatible(project,selectedId(),clipboard)||Engine.locked(project,clip);
    paste.title=clip&&clipboard&&!Engine.compatible(project,selectedId(),clipboard)?'Los atributos solo se pegan entre clips del mismo tipo (visual, audio o caption)':'';
  };
  copy.onclick=()=>{
    const result=Engine.copy(project,selectedId());
    if(!result.ok){setStatus?.('Selecciona un clip para copiar sus atributos');refresh();return}
    clipboard=result.data;
    const label=clipboard.kind==='visual'?'visuales':clipboard.kind==='audio'?'de audio':'de caption';
    setStatus?.(`Atributos ${label} copiados · ${result.count} ajuste(s)`);refresh();
  };
  paste.onclick=()=>{
    const result=Engine.paste(project,selectedId(),clipboard);
    if(result.reason==='locked'){setStatus?.('El clip o su pista está bloqueado');refresh();return}
    if(result.reason==='incompatible'){setStatus?.('Solo puedes pegar estos atributos en un clip del mismo tipo');refresh();return}
    if(result.reason!=='ok'){setStatus?.('No se pudieron pegar los atributos');refresh();return}
    if(result.changed){persist?.();drawTimeline?.();renderAt?.(playhead());root.ProfitMenteClipInspector?.render?.()}
    setStatus?.(result.changed?`Atributos pegados · ${result.changed} ajuste(s) actualizado(s)`:'El clip ya tenía esos atributos');refresh();
  };
  document.addEventListener('click',e=>{if(e.target.closest?.('.clip'))requestAnimationFrame(refresh)},true);
  root.addEventListener?.('profitmente:project-loaded',refresh);
  root.addEventListener?.('profitmente:project-reset',()=>{clipboard=null;refresh()});
  root.ProfitMenteClipAttributesClipboard={refresh,get clipboard(){return clipboard},destroy(){box.remove();delete root.ProfitMenteClipAttributesClipboard}};
  refresh();
})();
