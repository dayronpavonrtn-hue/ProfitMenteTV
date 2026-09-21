(()=>{
  function text(value){return typeof value==='string'?value.trim():''}
  function size(value){
    if(typeof value==='boolean'||value===null||value===undefined||value==='')return null;
    const n=Number(value);
    return Number.isSafeInteger(n)&&n>0?n:null;
  }
  function identity(asset={}){
    const signature=text(asset.metadataBlobSignature);
    if(!signature)return '';
    const bytes=size(asset.metadataBlobSize??asset.size??asset.blob?.size);
    if(bytes===null)return '';
    const type=text(asset.metadataBlobType||asset.mime||asset.blob?.type).toLowerCase();
    if(!type)return '';
    return `${signature}|${bytes}|${type}`;
  }
  function equivalent(left,right){const a=identity(left),b=identity(right);return !!a&&a===b}
  async function rollbackImported(committed,removePersisted,removeVisible){
    const failures=[];
    for(const asset of [...(committed||[])].reverse()){
      let persistedRemoved=false;
      try{
        await removePersisted(asset.id);
        persistedRemoved=true;
      }catch(error){
        failures.push({id:asset.id,stage:'persistence',error});
      }
      // Never hide an asset that may still exist in persistent storage. Keeping it
      // visible gives the user a recoverable item to retry deleting instead of an
      // invisible orphan that can unexpectedly reappear after reload.
      if(!persistedRemoved)continue;
      try{removeVisible(asset.id)}catch(error){failures.push({id:asset.id,stage:'visible',error})}
    }
    return failures;
  }
  const api={identity,equivalent,rollbackImported};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window==='undefined'||typeof document==='undefined')return;
  window.ProfitMenteMediaUploadDedupe=api;
  const input=document.querySelector('#mediaInput');
  if(!input||input.dataset?.profitmenteDedupe==='1')return;
  input.onchange=async event=>{
    const files=Array.from(event.target.files||[]);let added=0,duplicates=0,rejected=0;
    const committed=[];
    try{
      const inspector=window.profitMenteMediaInspector||(window.ProfitMenteMediaInspector?new window.ProfitMenteMediaInspector():null);
      for(const file of files){
        const type=String(file.type||'').split('/')[0];
        if(!['video','image','audio'].includes(type)){rejected++;continue}
        let candidate={id:globalThis.crypto?.randomUUID?.()||`media-${Date.now()}-${Math.random().toString(36).slice(2)}`,name:file.name,type,mime:file.type,blob:file,size:file.size,lastModified:file.lastModified};
        if(inspector?.inspect)candidate=await inspector.inspect(candidate);
        if(candidate.mediaReadable===false){rejected++;continue}
        if((typeof assets!=='undefined'?assets:[]).some(existing=>equivalent(existing,candidate))){duplicates++;continue}
        await putAsset(candidate);
        committed.push(candidate);
        if(!(typeof assets!=='undefined'?assets:[]).some(existing=>typeof sameId==='function'?sameId(existing.id,candidate.id):String(existing.id)===String(candidate.id)))assets.push(candidate);
        added++;
      }
      if(typeof drawLibrary==='function')drawLibrary();
      const parts=[added?`${added} medio${added===1?'':'s'} añadido${added===1?'':'s'}`:''];
      if(duplicates)parts.push(`${duplicates} duplicado${duplicates===1?'':'s'} omitido${duplicates===1?'':'s'}`);
      if(rejected)parts.push(`${rejected} archivo${rejected===1?'':'s'} no compatible${rejected===1?'':'s'}`);
      if(typeof setStatus==='function')setStatus(parts.filter(Boolean).join(' · ')||'No se añadieron medios');
    }catch(error){
      const failures=await rollbackImported(
        committed,
        async id=>{if(typeof deleteAsset==='function')await deleteAsset(id)},
        id=>{if(typeof assets==='undefined')return;const index=assets.findIndex(asset=>typeof sameId==='function'?sameId(asset.id,id):String(asset.id)===String(id));if(index>=0)assets.splice(index,1)}
      );
      if(typeof drawLibrary==='function')drawLibrary();
      console.error('ProfitMente media import failed',error);
      if(failures.length)console.error('ProfitMente media import rollback incomplete',failures);
      if(typeof setStatus==='function')setStatus(failures.length?`Importación falló; ${failures.length} elemento(s) requieren recuperación manual`:`Importación cancelada sin cambios: ${error?.message||error}`);
    }finally{event.target.value=''}
  };
  if(input.dataset)input.dataset.profitmenteDedupe='1';
})();
