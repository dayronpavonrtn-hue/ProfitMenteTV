(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteMediaPlacementEngine||!window.ProfitMenteTimelineOps||window.ProfitMenteMediaPlacement)return;
  const $=s=>document.querySelector(s),engine=window.ProfitMenteMediaPlacementEngine,ops=window.ProfitMenteTimelineOps,library=$('#mediaLibrary'),tracksHost=$('#tracks');if(!library||!tracksHost)return;
  const mode=document.createElement('select');mode.id='mediaPlacementMode';mode.title='Cómo colocar medios desde la biblioteca';mode.innerHTML='<option value="add">Añadir</option><option value="insert">Insertar + desplazar</option><option value="overwrite">Sobrescribir intervalo</option>';
  const tools=document.querySelector('.mediaLibraryTools');if(tools){tools.style.gridTemplateColumns='minmax(0,1fr) 82px minmax(105px,auto) auto auto';tools.insertBefore(mode,tools.children[2]||null)}else library.insertAdjacentElement('beforebegin',mode);
  const style=document.createElement('style');style.textContent='#mediaPlacementMode{min-width:0;padding:7px 6px;font-size:10px}';document.head.appendChild(style);
  const status=t=>typeof setStatus==='function'&&setStatus(t);
  const nativeDuration=asset=>asset?.type==='image'?5:Math.max(.25,Number(asset?.duration)||8);
  const defaultTrack=asset=>asset?.type==='audio'?5:0;
  function place(asset,track,at,duration){
    track=Number(track);if(project.trackState?.[track]?.locked){status('La pista destino está bloqueada');return false}
    const chosen=mode.value,r=engine.range(project,at,duration);
    if(chosen==='insert'){
      const result=engine.insertSpace(project,track,r.start,r.duration,ops);
      if(!result.ok){status(result.reason==='out-of-range'?'No hay espacio al final del proyecto para insertar sin recortar clips':'No se pudo preparar la inserción');return false}
    }else if(chosen==='overwrite'){
      const result=engine.overwriteRange(project,track,r.start,r.duration,ops);
      if(!result.ok){status('No se pudo preparar la sobrescritura');return false}
    }
    addClip(track,asset.name,asset.id,r.start,r.duration);
    const label=chosen==='insert'?'insertado':chosen==='overwrite'?'sobrescrito':'añadido';status(`${asset.name} ${label} en pista ${track} · ${r.start.toFixed(2)}s`);return true;
  }
  library.addEventListener('click',e=>{
    if(mode.value==='add')return;const card=e.target.closest?.('.mediaCard');if(!card)return;const asset=assets.find(a=>a.id===card.dataset.assetId);if(!asset)return;
    e.preventDefault();e.stopImmediatePropagation();const at=+$('#playhead')?.value||0;place(asset,defaultTrack(asset),at,Math.min(nativeDuration(asset),Math.max(.25,project.duration-at)));
  },true);
  tracksHost.addEventListener('drop',e=>{
    if(mode.value==='add')return;const lane=e.target.closest?.('.lane');if(!lane)return;
    const id=e.dataTransfer?.getData('application/x-profitmente-asset')||e.dataTransfer?.getData('text/plain'),asset=assets.find(a=>a.id===id),track=Number(lane.dataset.track);if(!asset)return;
    if(!window.ProfitMenteMediaTimelineDnD?.canDrop(asset.type,track)){status('Ese tipo de medio no es compatible con esta pista');return}
    e.preventDefault();e.stopImmediatePropagation();lane.classList.remove('mediaAssetDrop');const rect=lane.getBoundingClientRect(),p=window.ProfitMenteMediaTimelineDnD.placement(asset,e.clientX,rect.left,rect.width,project.duration);place(asset,track,p.start,p.duration);
  },true);
  window.ProfitMenteMediaPlacement={engine,mode,place};status('Biblioteca lista · modos Añadir / Insertar / Sobrescribir activos');
})();
