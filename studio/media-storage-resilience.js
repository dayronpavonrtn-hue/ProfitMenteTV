(()=>{
  if(typeof window==='undefined'||window.ProfitMenteMediaStorageResilience)return;
  const memory=new Map();
  const originalPut=typeof putAsset==='function'?putAsset:null;
  const originalGet=typeof getAssets==='function'?getAssets:null;
  let degraded=false,lastError=null,recovering=false,persistenceState='unknown';

  function markDegraded(err){
    if(!degraded)console.warn('ProfitMente Studio: IndexedDB no disponible; usando biblioteca temporal en memoria.',err);
    degraded=true;lastError=err||lastError;
  }
  function remember(list){for(const item of Array.isArray(list)?list:[])if(item?.id)memory.set(item.id,item)}

  async function resilientPut(asset){
    if(!degraded&&originalPut){
      try{const result=await originalPut(asset);if(asset?.id)memory.set(asset.id,asset);return result}
      catch(err){markDegraded(err)}
    }
    if(asset?.id)memory.set(asset.id,asset);
  }

  async function resilientGet(){
    if(!degraded&&originalGet){
      try{const list=await originalGet();remember(list);return Array.isArray(list)?list:[]}
      catch(err){markDegraded(err)}
    }
    return [...memory.values()];
  }

  async function resilientDelete(id){
    const key=String(id||'').trim();if(!key)return false;
    memory.delete(key);
    if(degraded)return true;
    try{
      const d=await db();
      await new Promise((resolve,reject)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});
      return true;
    }catch(err){
      // Deletion is used by rollback/cleanup paths. If persistent storage has failed,
      // keep the session internally consistent and switch to the existing memory fallback.
      markDegraded(err);return false;
    }
  }

  async function requestPersistentStorage(){
    const storage=typeof navigator!=='undefined'?navigator.storage:null;
    if(!storage||typeof storage.persist!=='function'){
      persistenceState='unsupported';
      return false;
    }
    try{
      if(typeof storage.persisted==='function'&&await storage.persisted()){
        persistenceState='granted';
        return true;
      }
      const granted=await storage.persist();
      persistenceState=granted?'granted':'best-effort';
      return !!granted;
    }catch(err){
      // Persistent storage is an optimization. Browsers may reject it based on
      // engagement/quota policy, so keep IndexedDB working normally when denied.
      persistenceState='best-effort';
      console.warn('ProfitMente Studio: almacenamiento persistente no concedido; IndexedDB seguirá en modo normal.',err);
      return false;
    }
  }

  // Replace the base app helpers so uploads after an IndexedDB failure remain
  // usable for the current Studio session instead of repeatedly throwing.
  if(originalPut)putAsset=resilientPut;
  if(originalGet)getAssets=resilientGet;

  async function recoverStartup(){
    if(recovering)return false;recovering=true;
    try{
      const list=await resilientGet();
      if(typeof assets!=='undefined')assets=list;
      drawLibrary?.();syncForm?.();drawTimeline?.();
      if(typeof renderAt==='function')await renderAt(+document.querySelector('#playhead')?.value||0);
      if(degraded)setStatus?.('Studio listo · IndexedDB no disponible · medios en memoria solo durante esta sesión');
      return true;
    }catch(err){
      lastError=err;console.error('ProfitMente Studio: no se pudo recuperar la biblioteca de medios.',err);
      setStatus?.('Studio listo sin biblioteca persistente · puedes seguir editando el proyecto');
      return false;
    }finally{recovering=false}
  }

  window.ProfitMenteMediaStorageResilience={
    get degraded(){return degraded},
    get lastError(){return lastError},
    get persistenceState(){return persistenceState},
    resilientPut,resilientGet,resilientDelete,recoverStartup,requestPersistentStorage,
    memoryCount:()=>memory.size
  };
  requestPersistentStorage();
  recoverStartup();

  // Media source duration/dimensions are required by source-window tools such as
  // Slip Edit. Load the zero-cost local probe after the resilient persistence
  // helpers are installed so metadata survives IndexedDB failures consistently.
  if(!window.ProfitMenteMediaMetadataEngine&&!document.querySelector('script[data-profitmente-media-metadata]')){
    const script=document.createElement('script');
    script.src='media-metadata-engine.js';script.async=false;script.dataset.profitmenteMediaMetadata='1';
    script.onerror=()=>console.error('ProfitMente Studio: no se pudo cargar la inspección local de metadata de medios.');
    document.body.appendChild(script);
  }
})();