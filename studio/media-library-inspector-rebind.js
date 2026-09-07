(function(root){
  if(typeof document==='undefined'||typeof drawLibrary!=='function'||typeof assets==='undefined')return;
  const tools=root.ProfitMenteMediaLibraryTools;
  if(!tools)return;

  const library=document.querySelector('#mediaLibrary');
  const search=document.querySelector('#mediaSearch');
  const filter=document.querySelector('#mediaTypeFilter');
  const count=document.querySelector('#mediaCount');
  if(!library||!search||!filter)return;

  const sameId=(a,b)=>typeof tools.sameMediaId==='function'?tools.sameMediaId(a,b):String(a??'')===String(b??'');

  async function removeStoredAsset(id){
    if(typeof mediaStore!=='undefined'&&mediaStore?.delete){
      await mediaStore.delete(id);
      return mediaStore.storageAvailable;
    }
    if(typeof db!=='function')throw new Error('Almacenamiento de medios no disponible');
    const database=await db();
    return new Promise((resolve,reject)=>{
      const tx=database.transaction(typeof STORE!=='undefined'?STORE:'media','readwrite');
      tx.objectStore(typeof STORE!=='undefined'?STORE:'media').delete(id);
      tx.oncomplete=()=>{database.close?.();resolve(true)};
      tx.onerror=()=>{database.close?.();reject(tx.error)};
    });
  }

  function assetForCard(card,index){
    const explicit=card?.dataset?.assetId;
    if(explicit!==undefined&&explicit!=='')return (assets||[]).find(asset=>sameId(asset?.id,explicit))||null;
    return (assets||[])[index]||null;
  }

  function refreshFilter(){
    const allowed=new Set(tools.filter(assets,search.value,filter.value).map(asset=>tools.mediaKey(asset?.id)).filter(key=>key!==null));
    let visible=0;
    library.querySelectorAll('.mediaRow[data-asset-id]').forEach(row=>{
      const show=allowed.has(tools.mediaKey(row.dataset.assetId));
      row.hidden=!show;
      if(show)visible++;
    });
    if(count)count.textContent=`${visible}/${assets.length}`;
    let empty=library.querySelector('.mediaFilterEmpty');
    if(!visible&&assets.length){
      if(!empty){empty=document.createElement('small');empty.className='mediaFilterEmpty';empty.textContent='Sin coincidencias';library.appendChild(empty)}
      empty.hidden=false;
    }else if(empty)empty.hidden=true;
  }

  function bindDelete(button,row,asset){
    button.onclick=async event=>{
      event.preventDefault();event.stopPropagation();
      const cross=tools.crossProjectUsage?.(project,asset.id);
      if(cross&&!cross.available){setStatus?.('Eliminación bloqueada: no se pudo verificar si otros proyectos usan este medio');return false}
      if(cross?.otherProjects?.length){
        const projects=cross.otherProjects.length,clips=cross.otherClips?.length||0;
        setStatus?.(`Medio protegido · usado por ${projects} proyecto${projects===1?'':'s'} guardado${projects===1?'':'s'} (${clips} clip${clips===1?'':'s'})`);
        return false;
      }
      const used=tools.usage(project,asset.id);
      const message=used.length
        ?`Este medio se usa en ${used.length} clip(s). Si lo eliminas, esos clips quedarán marcados como medio faltante y podrás reconectarlo después. ¿Eliminar ${asset.name}?`
        :`¿Eliminar ${asset.name} de la biblioteca local?`;
      if(!confirm(message))return false;
      try{
        if(used.length)tools.preserveMeta(project,asset);else tools.pruneProjectAssetMeta(project,[asset.id]);
        const persisted=await removeStoredAsset(asset.id);
        if(asset.url?.startsWith?.('blob:'))URL.revokeObjectURL(asset.url);
        assets=assets.filter(item=>item!==asset);
        persist?.();drawLibrary();drawTimeline?.();renderAt?.(+document.querySelector('#playhead')?.value||0);
        setStatus?.(persisted?(used.length?`Medio eliminado · ${used.length} clip(s) requieren reconexión`:'Medio eliminado de la biblioteca'):'Medio eliminado de esta sesión · se sincronizará cuando vuelva el almacenamiento');
      }catch(error){console.error(error);setStatus?.('No se pudo eliminar el medio: '+(error?.message||error))}
      return false;
    };
  }

  function enhanceInspectorCards(){
    const cards=[...library.querySelectorAll(':scope > .mediaCard')];
    cards.forEach((card,index)=>{
      const asset=assetForCard(card,index);if(!asset)return;
      card.dataset.assetId=String(asset.id??'');
      const row=document.createElement('div');row.className='mediaRow';row.dataset.assetId=String(asset.id??'');
      card.parentNode.insertBefore(row,card);row.appendChild(card);
      const del=document.createElement('button');del.type='button';del.className='mediaDelete';del.textContent='×';del.title=`Eliminar ${asset.name} de la biblioteca`;row.appendChild(del);
      bindDelete(del,row,asset);
    });
    refreshFilter();
    root.ProfitMenteMediaLibraryDeleteGuard?.refresh?.();
    return cards.length;
  }

  const baseDraw=drawLibrary;
  drawLibrary=function(){baseDraw();enhanceInspectorCards()};
  enhanceInspectorCards();
  search.addEventListener('input',refreshFilter);
  filter.addEventListener('change',refreshFilter);
  root.ProfitMenteMediaLibraryInspectorRebind={enhanceInspectorCards,refreshFilter};
})(typeof globalThis!=='undefined'?globalThis:this);
