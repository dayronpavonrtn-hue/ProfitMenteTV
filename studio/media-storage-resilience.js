(()=>{
  if(typeof window==='undefined'||window.ProfitMenteMediaStorageResilience)return;
  const memory=new Map();
  const originalPut=typeof putAsset==='function'?putAsset:null;
  const originalGet=typeof getAssets==='function'?getAssets:null;
  let degraded=false,lastError=null,recovering=false;

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
    resilientPut,resilientGet,recoverStartup,
    memoryCount:()=>memory.size
  };
  recoverStartup();
})();