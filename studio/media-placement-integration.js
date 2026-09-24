(()=>{
  if(typeof document==='undefined'||!window.ProfitMenteMediaPlacementEngine||!window.ProfitMenteTimelineOps||window.ProfitMenteMediaPlacement)return;
  const $=s=>document.querySelector(s),engine=window.ProfitMenteMediaPlacementEngine,ops=window.ProfitMenteTimelineOps,library=$('#mediaLibrary'),tracksHost=$('#tracks');if(!library||!tracksHost)return;
  const mode=document.createElement('select');mode.id='mediaPlacementMode';mode.title='Cómo colocar medios desde la biblioteca';mode.innerHTML='<option value="add">Añadir</option><option value="insert">Insertar + desplazar</option><option value="overwrite">Sobrescribir intervalo</option>';
  const tools=document.querySelector('.mediaLibraryTools');if(tools){tools.style.gridTemplateColumns='minmax(0,1fr) 82px minmax(105px,auto) auto auto';tools.insertBefore(mode,tools.children[2]||null)}else library.insertAdjacentElement('beforebegin',mode);
  const style=document.createElement('style');style.textContent='#mediaPlacementMode{min-width:0;padding:7px 6px;font-size:10px}';document.head.appendChild(style);
  const status=t=>typeof setStatus==='function'&&setStatus(t);
  const nativeDuration=asset=>asset?.type==='image'?5:Math.max(.25,Number(asset?.duration)||8);
  const defaultTrack=asset=>asset?.type==='audio'?5:0;
  const mediaKey=value=>{const helper=window.ProfitMenteMediaLibraryTools;if(helper?.mediaKey)return helper.mediaKey(value);if(value===undefined||value===null||typeof value==='boolean')return null;const raw=String(value).trim();return raw||null};
  const sameMedia=(a,b)=>{const helper=window.ProfitMenteMediaLibraryTools;if(helper?.sameMediaId)return helper.sameMediaId(a,b);const left=mediaKey(a),right=mediaKey(b);return left!==null&&left===right};
  const matchingAssets=id=>{const key=mediaKey(id);return key===null?[]:(assets||[]).filter(asset=>sameMedia(asset?.id,key))};
  const findAsset=id=>{const matches=matchingAssets(id);return matches.length===1?matches[0]:null};
  const assetIdentityUnique=asset=>{const key=mediaKey(asset?.id);if(key===null)return false;const matches=matchingAssets(key);return matches.length===1&&matches[0]===asset};
  const cardAssetId=card=>card?.dataset?.assetId||card?.closest?.('.mediaRow[data-asset-id]')?.dataset?.assetId||null;
  const assetUsable=asset=>{const dnd=window.ProfitMenteMediaTimelineDnD;if(dnd?.assetUsable)return dnd.assetUsable(asset);if(!asset||asset.mediaReadable===false)return false;const blob=asset.blob;return !!blob&&(!('size'in blob)||Number(blob.size)>0)};
  const sourceWindow=(asset,duration,sourceOffset=0)=>{
    const rawDuration=engine.strictFinite(duration),rawOffset=engine.strictFinite(sourceOffset);
    if(rawDuration===null||rawDuration<.25||rawOffset===null||rawOffset<0)return {ok:false,reason:'invalid-source-window'};
    const requested=rawDuration;
    if(asset?.type==='image')return {ok:true,duration:requested,sourceOffset:0};
    const mediaDuration=Number(asset?.duration),offset=rawOffset;
    if(!Number.isFinite(mediaDuration)||mediaDuration<=0)return {ok:true,duration:requested,sourceOffset:offset};
    if(offset>=mediaDuration-.001)return {ok:false,reason:'source-out-of-range'};
    const available=mediaDuration-offset;if(available<.25)return {ok:false,reason:'source-too-short'};
    return {ok:true,duration:Math.min(requested,available),sourceOffset:offset};
  };
  const unavailableMessage=asset=>asset?.mediaReadable===false?`${asset.name||'El medio'} no se puede decodificar. Reconéctalo o reemplázalo antes de añadirlo al timeline.`:`${asset?.name||'El medio'} no está disponible localmente. Reconéctalo antes de añadirlo al timeline.`;
  const placementFailure=(result,fallback)=>result?.reason==='locked-track'?'La pista destino está bloqueada':result?.reason==='locked-clip'?'Hay un clip bloqueado en el intervalo y no se modificó la timeline':result?.reason==='out-of-range'?'No hay espacio al final del proyecto para completar la operación':result?.reason==='add-clip-failed'?'No se pudo crear el nuevo clip y la timeline fue restaurada':result?.reason==='operation-failed'?'La colocación falló y la timeline fue restaurada':fallback;
  function addRange(at,duration){
    const rawTotal=engine.strictFinite(project?.duration),rawAt=engine.strictFinite(at),rawDuration=engine.strictFinite(duration);
    if(rawTotal===null||rawTotal<.25||rawAt===null||rawAt<0||rawAt>rawTotal+.001||rawDuration===null||rawDuration<.25)return {valid:false};
    const total=rawTotal,start=Math.min(total,rawAt),requested=rawDuration;return {start,end:start+requested,duration:requested,total,available:Math.max(0,total-start),valid:true};
  }
  function persistState(){if(typeof originalPersist==='function')originalPersist();else if(typeof persist==='function')persist()}
  function redraw(){if(typeof syncForm==='function')syncForm();if(typeof drawTimeline==='function')drawTimeline();if(typeof renderAt==='function')renderAt(+$('#playhead')?.value||0)}
  function createPlacedClip(asset,track,start,duration,sourceOffset){if(!Array.isArray(project.clips))project.clips=[];const assetId=mediaKey(asset?.id);if(assetId===null||!assetIdentityUnique(asset))return null;const id=globalThis.crypto?.randomUUID?.()||`clip-${Date.now()}-${Math.random().toString(36).slice(2)}`;const clip={id,track,name:asset.name,asset:assetId,start,duration,sourceOffset:asset.type==='image'?0:sourceOffset};project.clips.push(clip);return clip}
  function place(asset,track,at,duration,sourceOffset=0){
    const assetId=mediaKey(asset?.id);if(assetId===null){status('El medio no tiene un identificador válido y no puede añadirse al timeline');return false}
    if(!assetIdentityUnique(asset)){status(matchingAssets(assetId).length===0?'El medio no está registrado en la biblioteca activa. Impórtalo antes de añadirlo al timeline.':'El identificador del medio está duplicado en la biblioteca. Corrige o vuelve a importar ese medio antes de añadirlo al timeline.');return false}
    if(!assetUsable(asset)){status(unavailableMessage(asset));return false}
    const trackKey=engine.trackKey(track);if(trackKey===null){status('La pista destino no es válida');return false}track=Number(trackKey);
    const rawAt=engine.strictFinite(at);if(rawAt===null||rawAt<0){status('La posición de timeline no es válida');return false}
    const dnd=window.ProfitMenteMediaTimelineDnD;if(dnd?.canDrop&&!dnd.canDrop(asset?.type,track)){status('Ese tipo de medio no es compatible con esta pista');return false}
    if(engine.trackLocked(project,track)){status('La pista destino está bloqueada');return false}
    const source=sourceWindow(asset,duration,sourceOffset);if(!source.ok){status(source.reason==='invalid-source-window'?'La duración o el punto de entrada del medio no son válidos':`${asset.name||'El medio'} no tiene suficiente contenido desde el punto de entrada seleccionado`);return false}
    duration=source.duration;sourceOffset=source.sourceOffset;
    const chosen=mode.value,freeRange=chosen==='add'||chosen==='insert',r=freeRange?addRange(rawAt,duration):engine.range(project,rawAt,duration);if(!r.valid){status('No hay espacio suficiente en la posición elegida');return false}
    const previousDuration=Math.max(.25,Number(project.duration)||.25),insertDuration=chosen==='insert'?engine.requiredDurationForInsert(project,track,r.start,r.duration):null;
    if(chosen==='insert'&&insertDuration===null){status('No se puede calcular una inserción segura en esta pista');return false}
    const targetDuration=chosen==='insert'?insertDuration:r.end,extended=freeRange&&targetDuration>previousDuration+.001,beforeCount=project.clips?.length||0;
    const tx=engine.transaction(project,()=>{
      if(extended)project.duration=targetDuration;
      if(chosen==='insert'){const result=engine.insertSpace(project,track,r.start,r.duration,ops);if(!result.ok)return result}else if(chosen==='overwrite'){const result=engine.overwriteRange(project,track,r.start,r.duration,ops);if(!result.ok)return result}
      const inserted=createPlacedClip(asset,track,r.start,r.duration,sourceOffset);if(!inserted||project.clips.length<=beforeCount)return {ok:false,reason:'add-clip-failed'};return {ok:true,inserted};
    });
    if(!tx.ok){if(tx.error)console.error(tx.error);persistState();redraw();status(placementFailure(tx,'No se pudo colocar el medio; la timeline fue restaurada'));return false}
    persistState();redraw();const label=chosen==='insert'?'insertado':chosen==='overwrite'?'sobrescrito':'añadido',growth=extended?` · proyecto ampliado a ${project.duration.toFixed(2)}s`:'';status(`${asset.name} ${label} en pista ${track} · ${r.start.toFixed(2)}s${growth}`);return true;
  }
  library.addEventListener('click',e=>{const card=e.target.closest?.('.mediaCard');if(!card)return;const asset=findAsset(cardAssetId(card));if(!asset){status('No se pudo resolver un medio único para esta tarjeta de biblioteca');return}e.preventDefault();e.stopImmediatePropagation();const at=+$('#playhead')?.value||0;place(asset,defaultTrack(asset),at,nativeDuration(asset))},true);
  tracksHost.addEventListener('dragover',e=>{const lane=e.target.closest?.('.lane');if(!lane)return;const track=Number(lane.dataset.track);if(!engine.trackLocked(project,track))return;e.preventDefault();e.stopImmediatePropagation();lane.classList.remove('mediaAssetDrop');if(e.dataTransfer)e.dataTransfer.dropEffect='none'},true);
  tracksHost.addEventListener('drop',e=>{const lane=e.target.closest?.('.lane');if(!lane)return;const id=e.dataTransfer?.getData('application/x-profitmente-asset')||e.dataTransfer?.getData('text/plain'),asset=findAsset(id),track=Number(lane.dataset.track);if(!asset){status('No se pudo resolver un medio único para esta operación');return}e.preventDefault();e.stopImmediatePropagation();lane.classList.remove('mediaAssetDrop');if(!assetUsable(asset)){status(unavailableMessage(asset));return}if(!window.ProfitMenteMediaTimelineDnD?.canDrop(asset.type,track)){status('Ese tipo de medio no es compatible con esta pista');return}if(engine.trackLocked(project,track)){status('La pista destino está bloqueada');return}const rect=lane.getBoundingClientRect(),p=window.ProfitMenteMediaTimelineDnD.placement(asset,e.clientX,rect.left,rect.width,project.duration);place(asset,track,p.start,p.duration)},true);
  window.ProfitMenteMediaPlacement={engine,mode,place,placementFailure,findAsset,cardAssetId,assetUsable,sourceWindow,assetIdentityUnique};status('Biblioteca lista · modos Añadir / Insertar / Sobrescribir activos');
})();
