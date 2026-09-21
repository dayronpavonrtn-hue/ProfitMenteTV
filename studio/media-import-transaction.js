(()=>{
  if(typeof document==='undefined'||typeof assets==='undefined'||typeof putAsset!=='function'||typeof drawLibrary!=='function')return;
  const input=document.querySelector('#mediaInput');
  if(!input)return;
  const removeStored=async id=>{
    if(typeof mediaStore!=='undefined'&&mediaStore?.delete){
      await mediaStore.delete(id);
      if(!mediaStore.storageAvailable)throw mediaStore.lastError||new Error('No se pudo confirmar la eliminación del medio');
      return;
    }
    if(typeof db!=='function')throw new Error('Almacenamiento local no disponible');
    const d=await db();
    await new Promise((resolve,reject)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('No se pudo revertir el medio'));tx.onabort=()=>reject(tx.error||new Error('Reversión abortada'))});
    d.close?.();
  };
  input.onchange=async event=>{
    const files=Array.from(event.target.files||[]);
    if(!files.length)return;
    const added=[];
    try{
      for(const file of files){
        const type=String(file.type||'').split('/')[0];
        if(!['video','image','audio'].includes(type))throw new Error(`Formato no compatible: ${file.name||'archivo'}`);
        if(!file.size)throw new Error(`Archivo vacío: ${file.name||'archivo'}`);
        const asset={id:crypto.randomUUID(),name:file.name||'media',type,mime:file.type||'application/octet-stream',size:file.size,blob:file};
        await putAsset(asset);
        if(typeof mediaStore!=='undefined'&&mediaStore&&!mediaStore.storageAvailable)throw mediaStore.lastError||new Error('No se pudo guardar el medio localmente');
        assets.push(asset);added.push(asset);
      }
      drawLibrary();
      setStatus?.(`${added.length} medio${added.length===1?'':'s'} importado${added.length===1?'':'s'} y guardado${added.length===1?'':'s'} localmente`);
    }catch(error){
      const rollbackFailures=[];
      for(const asset of [...added].reverse()){
        try{await removeStored(asset.id);assets=assets.filter(item=>item!==asset)}catch(rollbackError){rollbackFailures.push(`${asset.name}: ${rollbackError?.message||rollbackError}`)}
      }
      drawLibrary();
      console.error('[ProfitMente Studio] Importación de medios revertida',error,rollbackFailures);
      setStatus?.(rollbackFailures.length?`Importación detenida: ${error?.message||error}. ${rollbackFailures.length} medio(s) no pudieron revertirse y permanecen visibles para recuperación.`:`Importación cancelada y revertida: ${error?.message||error}`);
    }finally{event.target.value=''}
  };
  window.ProfitMenteMediaImportTransaction={enabled:true};
})();
