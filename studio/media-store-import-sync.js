(function(root){
  if(typeof document==='undefined')return;
  let running=null,queued=false;
  function resolveStore(){try{return typeof mediaStore!=='undefined'?mediaStore:null}catch{return null}}
  function resolveInspector(){return root.profitMenteMediaInspector||null}
  function refreshActiveLibrary(values){
    try{
      if(typeof assets==='undefined'||!Array.isArray(values))return;
      assets=values;
      if(typeof drawLibrary==='function')drawLibrary();
    }catch(error){console.warn?.('No se pudo refrescar la biblioteca activa después de importar medios',error)}
  }
  async function inspectImported(values,store){
    const inspector=resolveInspector();if(!inspector?.inspect||!Array.isArray(values))return {values,inspected:0,unreadable:0};
    let inspected=0,unreadable=0;
    for(let i=0;i<values.length;i++){
      const current=values[i];if(!current?.blob)continue;
      let next;
      try{next=await inspector.inspect(current)}catch(error){console.warn?.('No se pudo inspeccionar un medio importado',current?.name,error);continue}
      if(next===current)continue;
      values[i]=next;inspected++;if(next.mediaReadable===false)unreadable++;
      try{if(store?.put)await store.put(next);else if(typeof putAsset==='function')await putAsset(next)}catch(error){console.warn?.('No se pudo persistir metadata del medio importado',next?.name,error)}
    }
    return {values,inspected,unreadable};
  }
  async function sync(){
    const store=resolveStore();if(!store||typeof store.refreshFromBackend!=='function')return [];
    if(running){queued=true;return running}
    running=(async()=>{
      let values=[],inspection={inspected:0,unreadable:0};
      do{
        queued=false;values=await store.refreshFromBackend();inspection=await inspectImported(values,store);
      }while(queued);
      refreshActiveLibrary(values);
      if(inspection.inspected&&typeof setStatus==='function')setStatus(inspection.unreadable?`${inspection.inspected} medio(s) importado(s) analizados · ${inspection.unreadable} no legible(s)`: `${inspection.inspected} medio(s) importado(s) analizados · duración, resolución y miniaturas listas`);
      return values;
    })();
    try{return await running}finally{running=null}
  }
  document.addEventListener('profitmente:media-imported',()=>{void sync()});
  root.ProfitMenteMediaStoreImportSync={sync,refreshActiveLibrary,inspectImported};
})(typeof window!=='undefined'?window:globalThis);
