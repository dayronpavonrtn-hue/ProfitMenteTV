(function integrateMediaReplacement(){
  if(typeof document==='undefined'||typeof ProfitMenteMediaReplaceEngine==='undefined')return;
  const engine=ProfitMenteMediaReplaceEngine;
  if(!document.querySelector('#profitmenteMediaReplaceStyle')){
    const style=document.createElement('style');style.id='profitmenteMediaReplaceStyle';
    style.textContent='.mediaRow.mediaReplaceReady{grid-template-columns:1fr 30px 30px}.mediaReplace{width:30px!important;margin:0!important;padding:3px!important;text-align:center!important;font-size:14px;background:#142029;border-color:#305166}.mediaReplace:disabled{opacity:.35;cursor:not-allowed}.mediaReplaceHint{font-size:9px;color:#7ad7ff;margin:4px 0 0}';document.head.appendChild(style);
  }
  const library=document.querySelector('#mediaLibrary');if(!library)return;
  function selectedClip(){const id=window.ProfitMenteEditTools?.selectedId;return engine.findClip(project,id)}
  function assetForRow(row){return engine.findAsset(assets,row?.dataset?.assetId)}
  function failureMessage(result){
    return result?.reason==='locked'?'El clip o su pista está bloqueado. Desbloquéalo para reemplazar el medio':
      result?.reason==='incompatible'?'Ese medio no es compatible con la pista del clip seleccionado':
      result?.reason==='source-too-short'?`La fuente no alcanza para conservar la duración del clip · disponible ${Number(result.available||0).toFixed(2)}s · necesario ${Number(result.required||.25).toFixed(2)}s`:
      result?.reason==='source-selection-too-short'?`La selección IN/OUT es demasiado corta · disponible ${Number(result.available||0).toFixed(2)}s · necesario ${Number(result.required||0).toFixed(2)}s`:
      result?.reason==='unknown-duration'?'No se conoce la duración del medio fuente':
      result?.reason==='invalid-source-range'?'El rango IN/OUT del Monitor de fuente no es válido':
      result?.reason==='clip-ambiguous'?'Hay IDs de clip duplicados; reemplazo bloqueado para evitar editar el clip equivocado':
      result?.reason==='invalid-clip'?'El clip seleccionado tiene duración o velocidad inválida':'No se pudo reemplazar el medio';
  }
  async function finish(result,asset,label){
    if(!result.ok){setStatus?.(failureMessage(result));return false}
    if(typeof persist==='function')persist();
    if(typeof drawTimeline==='function')drawTimeline();
    if(typeof renderAt==='function')await renderAt(+document.querySelector('#playhead')?.value||0);
    window.ProfitMenteEditTools?.select?.(result.clip.id);
    setStatus?.(label);return true;
  }
  async function replaceWith(asset){
    const clip=selectedClip();if(!clip){setStatus?.('Selecciona primero un clip del timeline');return false}
    const result=engine.replace(project,clip.id,asset);
    return finish(result,asset,`${asset.name} reemplazó el medio del clip${result.trimmed?' · duración ajustada al archivo nuevo':''}`);
  }
  async function replaceFromRange(asset,inPoint,outPoint){
    const clip=selectedClip();if(!clip){setStatus?.('Selecciona primero un clip del timeline');return false}
    const result=engine.replaceFromRange(project,clip.id,asset,inPoint,outPoint);
    const range=result.ok&&asset?.type!=='image'?` · fuente ${Number(result.sourceIn).toFixed(2)}s–${Number(result.sourceOut).toFixed(2)}s`:'';
    return finish(result,asset,`${asset.name} reemplazó el contenido del clip sin mover el corte${range}`);
  }
  function enhance(){
    library.querySelectorAll('.mediaRow[data-asset-id]').forEach(row=>{
      if(row.querySelector('.mediaReplace'))return;
      row.classList.add('mediaReplaceReady');const asset=assetForRow(row);
      const btn=document.createElement('button');btn.type='button';btn.className='mediaReplace';btn.textContent='↻';btn.title=`Reemplazar el medio del clip seleccionado con ${asset?.name||'este archivo'}`;
      btn.onclick=e=>{e.preventDefault();e.stopPropagation();if(asset)replaceWith(asset)};row.appendChild(btn);
    });
  }
  const observer=new MutationObserver(enhance);observer.observe(library,{childList:true,subtree:true});enhance();
  document.addEventListener('click',e=>{if(e.target.closest?.('.clip'))requestAnimationFrame(enhance)},true);
  window.profitMenteMediaReplace={replaceWith,replaceFromRange,engine,failureMessage};
})();
