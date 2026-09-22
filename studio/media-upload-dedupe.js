(()=>{
  function text(value){return typeof value==='string'?value.trim():''}
  function size(value){
    if(typeof value==='boolean'||value===null||value===undefined||value==='')return null;
    const n=Number(value);
    return Number.isSafeInteger(n)&&n>0?n:null;
  }
  const EXTENSION_TYPES={
    video:new Set(['mp4','m4v','mov','webm','ogv','avi','mkv']),
    image:new Set(['jpg','jpeg','png','webp','gif','bmp','avif']),
    audio:new Set(['mp3','m4a','aac','wav','ogg','oga','opus','flac','webm'])
  };
  const MIME_FALLBACK={mp4:'video/mp4',m4v:'video/mp4',mov:'video/quicktime',webm:'video/webm',ogv:'video/ogg',avi:'video/x-msvideo',mkv:'video/x-matroska',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',bmp:'image/bmp',avif:'image/avif',mp3:'audio/mpeg',m4a:'audio/mp4',aac:'audio/aac',wav:'audio/wav',ogg:'audio/ogg',oga:'audio/ogg',opus:'audio/ogg',flac:'audio/flac'};
  function extension(name){const match=text(name).toLowerCase().match(/\.([a-z0-9]+)$/);return match?match[1]:''}
  function mediaType(file={}){
    const declared=text(file.type).toLowerCase(),major=declared.split('/')[0];
    if(['video','image','audio'].includes(major))return major;
    const ext=extension(file.name);
    for(const type of ['video','image','audio'])if(EXTENSION_TYPES[type].has(ext))return type;
    return '';
  }
  function mediaMime(file={},type=mediaType(file)){
    const declared=text(file.type).toLowerCase();if(declared&&declared.includes('/'))return declared;
    const ext=extension(file.name);return MIME_FALLBACK[ext]||`${type||'application'}/octet-stream`;
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
      try{await removePersisted(asset.id);persistedRemoved=true}catch(error){failures.push({id:asset.id,stage:'persistence',error})}
      if(!persistedRemoved)continue;
      try{removeVisible(asset.id)}catch(error){failures.push({id:asset.id,stage:'visible',error})}
    }
    return failures;
  }
  async function removePersistedAsset(id){
    if(typeof mediaStore!=='undefined'&&mediaStore){
      await mediaStore.delete(id);
      if(mediaStore.storageAvailable===false)throw mediaStore.lastError||new Error('No se pudo confirmar la eliminación persistente del medio');
      return true;
    }
    if(typeof db!=='function')throw new Error('Almacenamiento de medios no disponible para rollback');
    const database=await db();
    return new Promise((resolve,reject)=>{
      let tx;try{tx=database.transaction(typeof STORE==='string'?STORE:'media','readwrite');tx.objectStore(typeof STORE==='string'?STORE:'media').delete(id)}catch(error){database.close?.();reject(error);return}
      tx.oncomplete=()=>{database.close?.();resolve(true)};
      tx.onerror=()=>{database.close?.();reject(tx.error||new Error('No se pudo revertir el medio persistido'))};
      tx.onabort=()=>{database.close?.();reject(tx.error||new Error('Rollback de medio abortado'))};
    });
  }
  const api={identity,equivalent,rollbackImported,removePersistedAsset,mediaType,mediaMime,extension};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window==='undefined'||typeof document==='undefined')return;
  window.ProfitMenteMediaUploadDedupe=api;
  const input=document.querySelector('#mediaInput');
  if(!input||input.dataset?.profitmenteDedupe==='1')return;
  input.onchange=async event=>{
    const files=Array.from(event.target.files||[]);let added=0,duplicates=0,rejected=0;const committed=[];
    try{
      const inspector=window.profitMenteMediaInspector||(window.ProfitMenteMediaInspector?new window.ProfitMenteMediaInspector():null);
      for(const file of files){
        const type=mediaType(file);if(!type){rejected++;continue}
        const mime=mediaMime(file,type);
        let candidate={id:globalThis.crypto?.randomUUID?.()||`media-${Date.now()}-${Math.random().toString(36).slice(2)}`,name:file.name,type,mime,blob:file,size:file.size,lastModified:file.lastModified};
        if(inspector?.inspect)candidate=await inspector.inspect(candidate);
        if(candidate.mediaReadable===false){rejected++;continue}
        if((typeof assets!=='undefined'?assets:[]).some(existing=>equivalent(existing,candidate))){duplicates++;continue}
        await putAsset(candidate);committed.push(candidate);
        if(!(typeof assets!=='undefined'?assets:[]).some(existing=>typeof sameId==='function'?sameId(existing.id,candidate.id):String(existing.id)===String(candidate.id)))assets.push(candidate);
        added++;
      }
      if(typeof drawLibrary==='function')drawLibrary();
      const parts=[added?`${added} medio${added===1?'':'s'} añadido${added===1?'':'s'}`:''];
      if(duplicates)parts.push(`${duplicates} duplicado${duplicates===1?'':'s'} omitido${duplicates===1?'':'s'}`);
      if(rejected)parts.push(`${rejected} archivo${rejected===1?'':'s'} no compatible${rejected===1?'':'s'}`);
      if(typeof setStatus==='function')setStatus(parts.filter(Boolean).join(' · ')||'No se añadieron medios');
    }catch(error){
      const failures=await rollbackImported(committed,removePersistedAsset,id=>{if(typeof assets==='undefined')return;const index=assets.findIndex(asset=>typeof sameId==='function'?sameId(asset.id,id):String(asset.id)===String(id));if(index>=0)assets.splice(index,1)});
      if(typeof drawLibrary==='function')drawLibrary();console.error('ProfitMente media import failed',error);if(failures.length)console.error('ProfitMente media import rollback incomplete',failures);
      if(typeof setStatus==='function')setStatus(failures.length?`Importación falló; ${failures.length} elemento(s) requieren recuperación manual`:`Importación cancelada sin cambios: ${error?.message||error}`);
    }finally{event.target.value=''}
  };
  if(input.dataset)input.dataset.profitmenteDedupe='1';
})();
