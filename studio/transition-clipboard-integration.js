(()=>{
  const root=typeof window!=='undefined'?window:globalThis,Engine=root.ProfitMenteTransitionClipboardEngine;if(!Engine||typeof document==='undefined'||root.ProfitMenteTransitionClipboard)return;
  const panel=document.querySelector('.manualTransitionPanel');if(!panel)return;
  const actions=panel.querySelector('.ciActions');if(!actions)return;
  const copy=document.createElement('button'),paste=document.createElement('button');
  copy.type=paste.type='button';copy.textContent='Copiar transición';paste.textContent='Pegar transición';paste.disabled=true;
  actions.append(copy,paste);
  let clipboard=null;
  const selectedId=()=>root.ProfitMenteEditTools?.selectedId??null;
  const playhead=()=>{const n=Number(document.querySelector('#playhead')?.value);return Number.isFinite(n)?n:0};
  const refresh=()=>{const selected=(project?.clips||[]).some(c=>String(c?.id??'')===String(selectedId()??'')&&[0,1].includes(Number(c?.track)));copy.disabled=!selected;paste.disabled=!selected||!clipboard};
  copy.onclick=()=>{const result=Engine.copy(project,selectedId());if(!result.ok){setStatus?.('Selecciona un clip visual para copiar su transición');refresh();return}clipboard=result.data;setStatus?.(`Transición copiada: ${clipboard.type}`);refresh()};
  paste.onclick=()=>{const result=Engine.paste(project,selectedId(),clipboard);if(result.reason==='locked'){setStatus?.('El clip o su pista está bloqueado');return}if(result.reason!=='ok'){setStatus?.('No se pudo pegar la transición');refresh();return}if(result.changed){persist?.();drawTimeline?.();renderAt?.(playhead())}setStatus?.(result.changed?`Transición pegada: ${result.type}`:'La transición ya era igual');refresh()};
  document.addEventListener('click',e=>{if(e.target.closest?.('.clip'))requestAnimationFrame(refresh)},true);
  root.addEventListener?.('profitmente:project-loaded',refresh);root.addEventListener?.('profitmente:project-reset',()=>{clipboard=null;refresh()});
  root.ProfitMenteTransitionClipboard={refresh,get clipboard(){return clipboard},destroy(){copy.remove();paste.remove();delete root.ProfitMenteTransitionClipboard}};
  refresh();
})();
