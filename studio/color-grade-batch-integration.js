(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteColorGradeBatchEngine||window.ProfitMenteColorGradeBatch)return;
  const $=s=>document.querySelector(s),engine=window.ProfitMenteColorGradeBatchEngine;
  const host=$('#ciColorWrap')||$('.clipInspector')||$('.props');if(!host)return;
  const panel=document.createElement('div');panel.id='ciColorBatchWrap';panel.innerHTML=`<hr><h4>Color por lote</h4><label>Aplicar a<select id="ciColorBatchScope"><option value="selection">Selección</option><option value="track">Pista visual</option><option value="all">Todo el proyecto</option></select></label><label>Preset<select id="ciColorBatchPreset"><option value="natural">Natural</option><option value="vivid">Vívido</option><option value="warm">Cálido</option><option value="cool">Frío</option><option value="mono">Blanco y negro</option></select></label><div class="ciActions"><button id="ciColorBatchApply">Aplicar preset</button><button id="ciColorBatchReset">Restablecer</button></div><small id="ciColorBatchInfo">Usa la selección múltiple, la pista del clip activo o todos los clips visuales. Los locks cancelan el lote completo.</small>`;host.appendChild(panel);
  const selectedId=()=>window.ProfitMenteEditTools?.selectedId??null;
  function activeClip(){const id=selectedId();return (project?.clips||[]).find(c=>engine.identityKey(c?.id)!==null&&engine.identityKey(c?.id)===engine.identityKey(id))||null}
  function options(){
    const scope=$('#ciColorBatchScope')?.value||'selection';
    if(scope==='all')return {scope};
    if(scope==='track')return {scope,track:activeClip()?.track};
    const ids=window.ProfitMenteMultiSelect?.engine?.values?.()||[];
    return {scope,ids:ids.length?ids:(selectedId()===null?[]:[selectedId()])};
  }
  function status(message){if(typeof setStatus==='function')setStatus(message)}
  function reasonText(result){
    if(result.reason==='locked-targets')return `Color por lote cancelado: ${result.blocked} clip(s) o pista(s) están bloqueados`;
    if(result.reason==='empty-selection')return 'Selecciona al menos un clip visual';
    if(result.reason==='no-visual-targets')return 'El alcance elegido no contiene clips visuales';
    if(result.reason==='invalid-track')return 'Selecciona un clip de una pista visual válida';
    if(result.reason==='ambiguous-id'||result.reason==='invalid-id')return 'Color por lote cancelado por identidad de clip inválida o ambigua';
    if(result.reason==='unchanged')return 'El preset ya estaba aplicado en todos los clips del alcance';
    return 'No se pudo aplicar el color por lote';
  }
  function commit(result,label){
    if(!result.changed){status(reasonText(result));return false}
    persist?.();drawTimeline?.();renderAt?.(Number($('#playhead')?.value)||0);status(`${label} aplicado a ${result.changed} clip${result.changed===1?'':'s'}`);return true
  }
  $('#ciColorBatchApply').onclick=()=>{const name=$('#ciColorBatchPreset').value;commit(engine.applyPreset(project,name,options()),'Color por lote')};
  $('#ciColorBatchReset').onclick=()=>commit(engine.reset(project,options()),'Color restablecido');
  function refresh(){
    const scope=$('#ciColorBatchScope')?.value||'selection',clip=activeClip(),ids=window.ProfitMenteMultiSelect?.engine?.values?.()||[];
    const disabled=scope==='track'&&(!clip||!engine.isVisual(clip));$('#ciColorBatchApply').disabled=disabled;$('#ciColorBatchReset').disabled=disabled;
    const info=$('#ciColorBatchInfo');if(!info)return;
    if(scope==='selection')info.textContent=`Selección: ${ids.length||((selectedId()!==null)?1:0)} clip(s). Los locks cancelan el lote completo.`;
    else if(scope==='track')info.textContent=clip&&engine.isVisual(clip)?`Pista visual ${engine.canonicalTrack(clip.track)}. Los locks cancelan el lote completo.`:'Selecciona un clip de video/imagen para usar su pista.';
    else info.textContent='Todos los clips visuales del proyecto. Los locks cancelan el lote completo.';
  }
  $('#ciColorBatchScope').onchange=refresh;document.addEventListener('click',e=>{if(e.target.closest?.('.clip'))requestAnimationFrame(refresh)},true);setInterval(refresh,800);
  window.ProfitMenteColorGradeBatch={engine,options,refresh};refresh();
})();
